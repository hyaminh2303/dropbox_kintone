import React, { Component } from 'react'
import { Text, Label, Dropdown } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { find } from 'lodash'

import './style.sass'

export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)

    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.createFolder = this.createFolder.bind(this);
    this.updateFolder = this.updateFolder.bind(this);
    this.updateRootFolder = this.updateRootFolder.bind(this);
    this.updateChildFolders = this.updateChildFolders.bind(this);
    this.createChildFolderForNewRecords = this.createChildFolderForNewRecords.bind(this);
    this.getNewRecords = this.getNewRecords.bind(this);
    this.updateBold = this.updateBold.bind(this);

    this.dbx = null;
    this.state = {
      fieldsOfSystem: ['更新者', '作成者', '更新日時', '作成日時']
    }
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  handleClickSaveButton() {
    const { folderName, selectedField, appKeyValue, accessToken, folderId } = this.props;

    if (appKeyValue === '' || accessToken === '' || folderName === '' || selectedField === '') {
      alert('All field is requied!')
    } else {
      // get current folder on Dropbox
      this.dbx.filesListFolder({
        path: '',
      }).then((response: any) => {
        const { result } = response;
        const currentFolderOnDropbox = result.entries.filter(item => item.id === folderId);

        if (folderId === '' || currentFolderOnDropbox.length === 0) {
          this.createFolder(folderName)
        } else {
          this.updateFolder(currentFolderOnDropbox[0])
        }
      })
    }
  }

  createFolder(name: string) {
    const { setStateValue } = this.props;

    this.dbx.filesCreateFolder({
      path: `/${name}`,
      autorename: true
    }).then(async (response: any) => {
      setStateValue(response.result.id, 'folderId')

      const textAlert = 'Create folder on Dropbox successfully.';
      this.createChildFolderForNewRecords(response.result.path_display, textAlert);
    })
  }

  updateFolder(currentFolderOnDropbox: any) {
    const { selectedField, pluginId, folderName } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    if (folderName !== config.folderName && selectedField === config.selectedField) {
      this.updateRootFolder(currentFolderOnDropbox.name);
    } else if (folderName === config.folderName && selectedField !== config.selectedField) {
      this.updateChildFolders();
    } else if(folderName !== config.folderName && selectedField !== config.selectedField) {
      this.updateBold(currentFolderOnDropbox.name)
    }
  }

  updateRootFolder(currentFolderOnDropbox: string) {
    const { folderName } = this.props;

    this.dbx.filesMove({
      from_path: `/${currentFolderOnDropbox}`,
      to_path: `/${folderName}`,
      autorename: true
    }).then((response: any) => {
      const textAlert = 'Update folder on Dropbox successfully.';
      this.createChildFolderForNewRecords(response.result.path_display, textAlert);
    })
  }

  updateChildFolders() {
    const { folderName, selectedField } = this.props;
    const { fieldsOfSystem } = this.state;

    this.dbx.filesListFolder({
      path: `/${folderName}`,
    }).then(async (response: any) => {
      const { result: { entries } } = response;

      const restClient = new KintoneRestAPIClient();
      const responseRecords = await restClient.record.getAllRecords({ app: kintone.app.getId() });

      const newpaths = entries.map(entry => {
        const currentRecord = find(responseRecords, (record) => {
          return record['$id'].value == entry.name.substr(entry.name.length - 2, 1);
        })

        let newFolderName;
        if (currentRecord[selectedField] === undefined) {
          newFolderName = `Undefined Folder[${currentRecord['$id'].value}]`;
        } else if(fieldsOfSystem.includes(selectedField)){
          newFolderName = `${currentRecord[selectedField].value.name}[${currentRecord['$id'].value}]`;
        } else {
          newFolderName = `${currentRecord[selectedField].value}[${currentRecord['$id'].value}]`;
        }

        const param = {
          from_path: `${entry.path_display}`,
          to_path: `/${folderName}/${newFolderName}`
        }

        return param;
      })

      if (newpaths.length > 0) {
        this.dbx.filesMoveBatch({
          entries: newpaths,
          autorename: true,
        }).then((response: any) => {
          const textAlert = 'Update folders on Dropbox successfully.';
          this.createChildFolderForNewRecords(`/${folderName}`, textAlert)
        })
      } else {
        const textAlert = 'Update folders on Dropbox successfully.';
        this.createChildFolderForNewRecords(`/${folderName}`, textAlert)
      }
    })
  }

  updateBold(currentFolderOnDropbox: string) {
    const { folderName } = this.props;

    this.dbx.filesMove({
      from_path: `/${currentFolderOnDropbox}`,
      to_path: `/${folderName}`,
      autorename: true
    }).then((response: any) => {
      this.updateChildFolders();
    })
  }

  async createChildFolderForNewRecords(rootPath: string, textAlert: string) {
    const { selectedField, setConfig } = this.props;
    const { fieldsOfSystem } = this.state;

    const restClient = new KintoneRestAPIClient();
    const responseRecords = await restClient.record.getAllRecords({ app: kintone.app.getId() });

    this.dbx.filesListFolder({
      path: rootPath,
    }).then((response: any) => {
      const { result: { entries } } = response;
      const newRecords = this.getNewRecords(responseRecords, entries);

      if (newRecords.length > 0) {
        const paths = newRecords.map(item => {
          let path;
          if(!fieldsOfSystem.includes(selectedField)) {
            path = `${rootPath}/${item[selectedField].value}[${item['$id'].value}]`;
          } else {
            path = `${rootPath}/${item[selectedField].value.name}[${item['$id'].value}]`;
          }
          return path;
        })

        this.dbx.filesCreateFolderBatch({
          paths: paths,
          autorename: true,
        }).then((response: any) => {
          alert(textAlert);
          setConfig();
        })
      } else {
        alert(textAlert);
        setConfig();
      }
    })
  }

  getNewRecords(responseRecords: any, entries: any) {
    let newRecords: any = [];

    if (entries.length > 0) {
      responseRecords.forEach((record) => {
        const folder = find(entries, (entry) => { return entry.name.substr(entry.name.length -2, 1) == record['$id'].value });

        if (folder === undefined) {
          newRecords.push(record);
        }
      })
    } else {
      newRecords = responseRecords;
    }

    return newRecords;
  }

  render() {
    const { setStateValue, folderName, formFields,
      selectedField, appKeyValue, accessToken
    } = this.props;
    this.dbx = new Dropbox({ accessToken: accessToken || '' });

    return (
      <div>
        <div className="tab-content">
          <div>
            <div className="kintoneplugin-row">
              <Label text='App key' isRequired={false} />
              <div className="input-config">
                <Text
                  value={appKeyValue}
                  onChange={(value) => setStateValue(value, 'appKeyValue')}
                  className="kintoneplugin-input-text"
                />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Access Token' isRequired={false} />
              <div className="input-config">
                <Text
                  value={accessToken}
                  onChange={(value) => setStateValue(value, 'accessToken')}
                  className="kintoneplugin-input-text" />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Folder Name' isRequired={false} />
              <div className="input-config">
                <Text
                  value={folderName}
                  onChange={(value) => setStateValue(value, 'folderName')}
                  className="kintoneplugin-input-text" />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Specified field to set folder name' />
              <div className="input-config">
                <Dropdown
                  items={formFields}
                  value={selectedField}
                  onChange={(value) => setStateValue(value, 'dropdownSpecifiedField')}
                />
              </div>
            </div>
          </div>

          <div className="kintoneplugin-row">
            <button
              type="button"
              className="js-cancel-button kintoneplugin-button-dialog-cancel btn-action"
              onClick={this.onCancel}
            >
              Cancel
            </button>

            <button
              className="kintoneplugin-button-dialog-ok btn-action"
              onClick={this.handleClickSaveButton}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }
}
