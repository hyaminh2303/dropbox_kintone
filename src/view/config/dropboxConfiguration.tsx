import React, { Component } from 'react'
import { Text, Label, Dropdown } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from '@kintone/rest-api-client'

import './style.sass'

export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)

    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.createFolder = this.createFolder.bind(this);
    this.updateFolder = this.updateFolder.bind(this);

    this.dbx = null;
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
          this.updateFolder(folderName, currentFolderOnDropbox[0])
        }
      })
    }
  }

  createFolder(name: string) {
    const { selectedField, setConfig, setStateValue } = this.props;

    this.dbx.filesCreateFolder({
      path: `/${name}`,
      autorename: true
    }).then(async (response: any) => {
      setStateValue(response.result.id, 'folderId')

      const restClient = new KintoneRestAPIClient();
      const responseRecords = await restClient.record.getAllRecords({ app: kintone.app.getId() });
      const paths = responseRecords.map(item => {
        const path = response.result.path_display + `/${item[selectedField].value}[${item['$id'].value}]`;
        return path;
      })

      this.dbx.filesCreateFolderBatch({
        paths: paths,
        autorename: true,
      }).then((response: any) => {
        alert('Create folder on Dropbox successfully.');
        setConfig();
      })
    })
  }

  updateFolder(name: string, currentFolderOnDropbox: any) {
    const { setConfig, selectedField } = this.props;
    console.log(currentFolderOnDropbox)
    this.dbx.filesMove({
      from_path: `/${currentFolderOnDropbox.name}`,
      to_path: `/${name}`,
      autorename: true
    }).then(async (response: any) => {
      const restClient = new KintoneRestAPIClient();
      const responseRecords = await restClient.record.getAllRecords({ app: kintone.app.getId() });
      const paths = responseRecords.map(item => {
        const path = response.result.path_display + `/${item[selectedField].value}[${item['$id'].value}]`;
        return path;
      })

      this.dbx.filesListFolder({
        path: `${response.result.path_display}`,
      }).then((response: any) => {
        console.log(response)
      })

      alert('Update folder on Dropbox successfully.');
      setConfig();
    })
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
