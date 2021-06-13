import React, { Component } from 'react'
import { Text, Label, Dropdown } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { find } from 'lodash'
import { getRootConfigurationRecord, updateRootRecord, addRootRecord } from '../../utils/recordsHelper'
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
      fieldsOfSystem: ['更新者', '作成者', '更新日時', '作成日時'],
      appKeyValue: 'ofadvw0r9advmky', // props.appKeyValue,
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
      appKeyValue,
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id
    } = this.state;

    if (appKeyValue === '' || accessToken === '' || selectedField === '') {
      alert('All field is requied!')
    } else {
      this.dbx = new Dropbox({ accessToken: accessToken })
      await this.findOrCreateRootFolder()
      // this.props.setPluginConfig({
      //   appKeyValue: appKeyValue,
      //   accessToken: accessToken,
      //   selectedField: selectedField,
      //   dropbox_configuration_app_id: dropbox_configuration_app_id
      // })

      // const restClient = new KintoneRestAPIClient();


      // const records = await restClient.record.getAllRecords({ app: kintone.app.getId() });

      // const childFolderPaths = records.map((record) => {
      //   return `${rootPath}/${record[selectedField].value || ''}[${record['$id'].value}]`
      // })
      // console.log(123123)
      // console.log(childFolderPaths)
      // await this.dbx.filesCreateFolderBatch({ paths: childFolderPaths })

    }
  }

  async findOrCreateRootFolder() {
    const { folderName, dropbox_configuration_app_id } = this.state;
    console.log(dropbox_configuration_app_id)

    getRootConfigurationRecord(dropbox_configuration_app_id).then((configurationRecord: any) => {
      this.dbx = new Dropbox({ accessToken: accessToken });
      // Get root folder name on Dropbox
      this.dbx.filesGetMetadata({path: configurationRecord.dropbox_folder_id.value}).then((response: any) => {
        if (folderName != response.result.name) {
          // If the folder name has been changed
          this.setState({ folderName: response.result.name })
          const currentRootPath = `${ROOT_FOLDER}/${response.result.name}`
          const newRootPath = `${ROOT_FOLDER}/${folderName}`
          this.dbx.filesMove({ from_path: currentRootPath, to_path: newRootPath }).then((filesMoveResp: any) => {
            // If rename success, then update root folder name in configuration app
            updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
              root_folder_name: { value: filesMoveResp.result.name }
            })
          }).catch((error) => {
            alert('Cannot rename folder, please check the name')
          })
        }
      }).catch(async (error: any) => {
        if (error.status == 409) {
          // If the folder doesnt exist
          const rootPath = `${ROOT_FOLDER}/${folderName}`
          const createFolderResponse = await this.dbx.filesCreateFolder({ path: rootPath })
          addRootRecord(dropbox_configuration_app_id, folderName, createFolderResponse.result.id)
        } else if (error.status == 400) {
          alert('Please enter correct access token')
        }
      })
    }).catch((error: any) => {
      console.log(error)
      alert('Please enter correct configuration app id!')
    })
  }

  UNSAFE_componentWillMount() {
    // Get Root Folder
    const { dropbox_configuration_app_id, accessToken } = this.props;

    if (!accessToken && !dropbox_configuration_app_id) {
      return;
    }

    getRootConfigurationRecord(dropbox_configuration_app_id).then((configurationRecord: any) => {
      if (!!configurationRecord) {
        this.dbx = new Dropbox({ accessToken: accessToken });

        // Get root folder name on Dropbox
        this.dbx.filesGetMetadata({path: configurationRecord.dropbox_folder_id.value}).then((response: any) => {
          this.setState({ folderName: response.result.name })

          // Update root folder name in configuration app
          updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
            root_folder_name: { value: response.result.name }
          })
        }).catch((error: any) => {
          if (error.status == 409) {
            alert('Cannot find dropbox folder on Dropbox, it might be deleted')
          } else if (error.status == 400) {
            alert('Please enter correct access token')
          }
        })
      }
    }).catch((error: any) => {
      alert('Please enter correct configuration app id!')
    })
  }

  render() {
    const { formFields } = this.props;

    const {
      appKeyValue,
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
              <Label text='App key' isRequired={false} />
              <div className="input-config">
                <Text
                  value={appKeyValue}
                  onChange={(value) => this.setState({appKeyValue: value})}
                  className="kintoneplugin-input-text"
                />
              </div>
            </div>
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
