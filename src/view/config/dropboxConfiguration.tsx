import React, { Component } from 'react'
import { Text, Label, Dropdown } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { find } from 'lodash'
import { getRootConfigurationRecord, updateRootRecord, addRootRecord, addChildFolderRecord } from '../../utils/recordsHelper'
import './style.sass'

const  ROOT_FOLDER = ""
export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)
    this.findOrCreateRootFolder = this.findOrCreateRootFolder.bind(this)
    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);

    this.dbx = null;
    this.state = {
      accessToken: props.accessToken,
      folderName: props.folderName,
      dropbox_configuration_app_id: props.dropbox_configuration_app_id,
      licenseKey: props.licenseKey,
      selectedField: props.selectedField
    }
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  async handleClickSaveButton() {
    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id
    } = this.state;

    if (accessToken === '' || selectedField === '') {
      alert('All field is requied!')
    } else {

      const createFolderResponse = await this.findOrCreateRootFolder()
      if (!!createFolderResponse['errorCode']) { return }

      this.props.setPluginConfig({
        accessToken: accessToken,
        selectedField: selectedField,
        dropbox_configuration_app_id: dropbox_configuration_app_id
      })

      const restClient = new KintoneRestAPIClient();
      const records = await restClient.record.getAllRecords({ app: kintone.app.getId() });

      const childFolders = records.map((record) => {
        return {
          id: record['$id'].value,
          name: `${record[selectedField].value || ''}[${record['$id'].value}]`
        }
      })

      const childFolderPaths = childFolders.map((folder) => {
        return `${createFolderResponse['path']}/${folder.name}`
      })

      if (createFolderResponse['actionType'] == 'create') {
        await this.dbx.filesCreateFolderBatch({ paths: childFolderPaths })
        const filesListFolderResponse = await this.dbx.filesListFolder({ path: createFolderResponse['path'] })
        await filesListFolderResponse.result.entries.map(async (entry) => {
          console.log(entry)
          const folderRecord = find(childFolders, { name: entry.name })
          await addChildFolderRecord(
            dropbox_configuration_app_id,
            folderName,
            entry.id,
            folderRecord.id,
            entry.name
          )
        })
      }

    }
  }

  async findOrCreateRootFolder() {
    const { folderName, dropbox_configuration_app_id, accessToken } = this.state;
    const configurationRecord = await getRootConfigurationRecord(dropbox_configuration_app_id)

    if (!!configurationRecord && !!configurationRecord['errorCode']) {
      // this mean wrong dropbox_configuration_app_id

      alert(configurationRecord['message'])
      return {
        errorCode: configurationRecord['errorCode']
      }
    }

    this.dbx = new Dropbox({ accessToken: accessToken });

    const authResponse = await this.dbx.filesListFolder({path: ''}).catch((error) => {
      return {
        errorCode: 'invalidDropboxAccessToken'
      }
    })

    if (authResponse['errorCode'] == 'invalidDropboxAccessToken') {
      alert('Please enter correct Dropbox access token')
      return {
        errorCode: authResponse['errorCode']
      }
    }

    if (!!configurationRecord) {
      // need to update folder name
      console.log('Action Update')

      const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
      const metadataResponse = await this.dbx.filesGetMetadata({ path: dropboxFolderId }).catch((error) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })
      console.log('metadataResponse')
      console.log(metadataResponse)
      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        // need to re-create folder here, because it was deleted on drobox
      }
      console.log(folderName)
      console.log(metadataResponse.result.name)
      const currentRootPath = `${ROOT_FOLDER}/${metadataResponse.result.name}`;

      if (folderName != metadataResponse.result.name) {
        const newRootPath = `${ROOT_FOLDER}/${folderName}`;

        const filesMoveResponse = await this.dbx.filesMove({ from_path: currentRootPath, to_path: newRootPath }).catch((error: any) => {
          return {
            errorCode: 'invalidNewName'
          }
        })

        if (filesMoveResponse['errorCode'] == 'invalidNewName') {
          alert('Invalid name, it might be duplicated with other folder')
          return {
            errorCode: authResponse['errorCode']
          }
        }

        updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
          root_folder_name: { value: filesMoveResponse.result.name }
        })

        console.log('Updated folder')

        return {
          actionType: 'edit',
          path: newRootPath
        }
      } else {
        return {
          actionType: 'edit',
          path: currentRootPath
        }
      }

    } else {
      // Need to create new folder
      console.log('Action Create')

      const rootPath = `${ROOT_FOLDER}/${folderName}`

      const metadataResponse = await this.dbx.filesGetMetadata({ path: rootPath }).catch((error) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })

      let createFolderResponse, folderId;
      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        createFolderResponse = await this.dbx.filesCreateFolder({ path: rootPath }).catch((error: any) => {
          return {
            errorCode: 'invalidFolderName'
          }
        })

        if (createFolderResponse['errorCode'] == 'invalidFolderName') {
          alert('Cannot create folder, please check the folder name. It might be duplicated!')
          return {
            errorCode: createFolderResponse['errorCode']
          }
        }

        folderId = createFolderResponse.result.id

      } else {
        folderId = metadataResponse.result.id
      }

      await addRootRecord(dropbox_configuration_app_id, folderName, folderId)

      console.log('Created folder')

      return {
        actionType: 'create',
        path: rootPath
      }
    }
  }

  UNSAFE_componentWillMount() {
    (async () => {
      // Get Root Folder
      const { dropbox_configuration_app_id, accessToken } = this.props;

      if (!accessToken && !dropbox_configuration_app_id) {
        return;
      }

      const configurationRecord = await getRootConfigurationRecord(dropbox_configuration_app_id)

      if (!!configurationRecord && !!configurationRecord['errorCode']) {
        // this mean wrong dropbox_configuration_app_id
        alert('Please enter correct configuration app id!')
        return;
      }

      if (!configurationRecord) {
        // this mean first setup plugin
        return;
      }

      this.dbx = new Dropbox({ accessToken: accessToken });
      const dropboxFolderId = configurationRecord.dropbox_folder_id.value
      const metadataResponse = await this.dbx.filesGetMetadata({path: dropboxFolderId}).catch((error: any) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })

      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        // need to re-create folder here, because it was deleted on drobox
        return ;
      }

      this.setState({ folderName: metadataResponse.result.name })
      updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
        root_folder_name: { value: metadataResponse.result.name }
      })
    })()
  }

  render() {
    const { formFields } = this.props;

    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id
    } = this.state;

    return (
      <div>
        <div className="tab-content">
          <div>
            <div className="kintoneplugin-row">
              <Label text='Access Token' isRequired={false} />
              <div className="input-config">
                <Text
                  value={accessToken}
                  onChange={(value) => this.setState({accessToken: value})}
                  className="kintoneplugin-input-text" />
              </div>
            </div>

            <div className="kintoneplugin-row">
              <Label text='Dropbox Configuration App ID' isRequired={false} />
              <div className="input-config">
                <Text
                  value={dropbox_configuration_app_id}
                  onChange={(value) => this.setState({dropbox_configuration_app_id: value})}
                  className="kintoneplugin-input-text" />
              </div>
            </div>

            <div className="kintoneplugin-row">
              <Label text='Folder Name' isRequired={false} />
              <div className="input-config">
                <Text
                  value={folderName}
                  onChange={(value) => this.setState({folderName: value})}
                  className="kintoneplugin-input-text" />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Specified field to set folder name' />
              <div className="input-config">
                <Dropdown
                  items={formFields}
                  value={selectedField}
                  onChange={(value) => this.setState({selectedField: value})}
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
