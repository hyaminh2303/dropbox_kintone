import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faPlus, faTrash, faCopy, faEye, faFolder, faPen } from '@fortawesome/free-solid-svg-icons'
import { Dropbox, Error, files } from 'dropbox'
import { Button } from '@material-ui/core';
import { FileIcon, defaultStyles } from 'react-file-icon';

import { setStateAsync } from "../../utils/stateHelper";
import { validateDropboxToken } from "../../utils/dropboxAccessTokenValidation";
import BreadcrumbNavigation from './components/breadcrumbNavigation'
import DropboxPreviewDialog from './components/dropboxPreviewDialog'
import UploadFileDialog from './components/uploadFileDialog'
import FolderFormDialog from './components/folderFormDialog'
import {
  getRootConfigurationRecord,
  getConfigurationRecord,
  updateRootRecord,
  addChildFolderRecord
} from '../../utils/recordsHelper'
import {
  showNotificationSuccess,
  showNotificationError,
  showConfirm
} from '../../utils/notifications'

import './style.sass'
export default class RecordDetail extends Component {
  constructor(props) {
    super(props)
    this.onClickDropboxFolder = this.onClickDropboxFolder.bind(this)
    this.navigateByBreadcrumb = this.navigateByBreadcrumb.bind(this)
    this.onClickUploadButton = this.onClickUploadButton.bind(this)
    this.onCopyLink = this.onCopyLink.bind(this)
    this.onDeleteFile = this.onDeleteFile.bind(this)
    this.onOpenDialogPreview = this.onOpenDialogPreview.bind(this)
    this.onCloseDialogPreview = this.onCloseDialogPreview.bind(this)
    this.onCloseDialogUpload = this.onCloseDialogUpload.bind(this)
    this.uploadFile = this.uploadFile.bind(this)
    this.showCreateNewFolderForm = this.showCreateNewFolderForm.bind(this)
    this.createChildFolder = this.createChildFolder.bind(this)
    this.requestDropbox = this.requestDropbox.bind(this)
    this.onOpenDialogEditNameFolder = this.onOpenDialogEditNameFolder.bind(this)
    this.editChildFolderName = this.editChildFolderName.bind(this)
    this.validateDropboxAccessToken = this.validateDropboxAccessToken.bind(this)

    let rootPath = ''

    this.state = {
      currentPathLower: rootPath,
      currentPathDisplay: rootPath,
      dropboxEntries: [],
      isDialogPreviewVisible: false,
      isDialogUploadVisible: false,
      isDialogFolderFormVisible: false,
      isDialogRenameFolderFormVisible: false,
      previewPath: null,
      dropboxEntry: null,
      isValidAccessToken: false,
      isBusinessAccount: false,
    }
  }

  UNSAFE_componentWillMount() {
    this.getFolderRoot()
  }

  async validateDropboxAccessToken() {
    const { config: { accessToken } } = this.props;
    const result: any = await validateDropboxToken(accessToken);

    if (result["status"] == "invalidKey") {
      showNotificationError(
        "Invalid access token, please generate a new one."
      );
    } else if (result["status"] == "unauthorized") {
      showNotificationError(
        "Invalid access token, please generate a new one."
      );
    } else if (result["status"] == "appPermissionError") {
      await setStateAsync({
        isValidAccessToken: false
      }, this);
    } else if (result["status"] == "businessAccount") {
      await setStateAsync({
        isBusinessAccount: true,
        isValidAccessToken: true
      }, this);
    } else if (result["status"] == "individualAccount") {
      await setStateAsync({
        isBusinessAccount: false,
        isValidAccessToken: true
      }, this);
    }
  }

  async getFolderRoot() {
    const { config, config: { accessToken } } = this.props;

    await this.validateDropboxAccessToken()

    if (!this.state.isValidAccessToken) {
      return;
    }

    this.dbx = new Dropbox({ accessToken: accessToken })

    if (this.state.isBusinessAccount) {
      this.dbx.selectUser = `${config.memberId}`
      this.dbx.pathRoot = `{".tag": "namespace_id", "namespace_id": "${config.selectedFolderId}"}`
    }

    const response = await this.findOrCreateDropboxConfigurationRecordAndGetRootPath();

    if (!!response['errorCode']) {
      return;
    }

    const rootPath = response['path']

    this.setState({ currentPathLower: rootPath, currentPathDisplay: rootPath }, () => {
      this.getDropboxEntries(rootPath)
    })
  }

  async findOrCreateDropboxConfigurationRecordAndGetRootPath() {
    const { config, config: { dropbox_configuration_app_id }, event: { record } } = this.props
    const configurationRecord = await getConfigurationRecord(dropbox_configuration_app_id, record['$id'].value)

    if (!!configurationRecord && configurationRecord['errorCode'] == 'invalidConfigurationAppId') {
      alert('Please endter configuration app id in plugin setting!')
      return {
        errorCode: 'invalidConfigurationAppId'
      }
    }

    if (!!configurationRecord) {
      // Get dropbox folder by ID, so even individual or business account are same
      const metadataResponse = await this.dbx.filesGetMetadata({
        path: configurationRecord.dropbox_folder_id.value
      }).catch((error: any) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })

      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        // this means folder already deleted on dropbox, need to create it again
        let rootPath;
        if (this.state.isBusinessAccount) {
          rootPath = `/${configurationRecord['dropbox_folder_name'].value}`
        } else{
          rootPath = `/${rootConfigurationRecord['root_folder_name'].value}/${configurationRecord['dropbox_folder_name'].value}`
        }

        const createFolderResponse = await this.requestDropbox('filesCreateFolderV2', {
          path: rootPath, autorename: true
        })

        console.log("createFolderResponse", createFolderResponse)

        await updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
          dropbox_folder_id: { value: createFolderResponse.result.id }
        })

        return {
          path: createFolderResponse.result.metadata.path_lower
        }

      } else if (metadataResponse.result.name != configurationRecord['dropbox_folder_name'].value) {
        // This mean the name has been changed on dropbox, then need to update in kintone
        updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
          dropbox_folder_name: { value: metadataResponse.result.name }
        })
      }

      // if has no change on folder name on both kinton and dropbox => return path by dropbox metadata
      // if has any change on folder name, then the code above already updated folder name in configuration app. so we can return path by dropbox metadata as well
      return {
        path: metadataResponse.result.path_lower
      }
    } else {

      const rootConfigurationRecord = await getRootConfigurationRecord(dropbox_configuration_app_id)
      if (!!rootConfigurationRecord && rootConfigurationRecord['errorCode'] == 'invalidConfigurationAppId') {
        alert('Please endter configuration app id in plugin setting!')
        return {
          errorCode: 'invalidConfigurationAppId'
        }
      }

      if (!rootConfigurationRecord) {
        showNotificationError("");
        return {
          errorCode: 'Missing Root Configuration, please visit plugin settings to update it!'
        }
      }

      const folderName = `${record[config.selectedField].value}[${record['$id'].value}]`

      let rootPath;
      if (this.state.isBusinessAccount) {
        rootPath = `/${folderName}`
      } else{
        rootPath = `/${rootConfigurationRecord['root_folder_name'].value}/${folderName}`
      }

      const createFolderResponse = await this.requestDropbox('filesCreateFolderV2', {
        path: rootPath, autorename: true
      })

      await addChildFolderRecord(
        dropbox_configuration_app_id,
        rootConfigurationRecord['root_folder_name'].value,
        createFolderResponse.result.metadata.id,
        record['$id'].value,
        createFolderResponse.result.metadata.name
      )

      console.log("createFolderResponse", createFolderResponse)

      return {
        path: createFolderResponse.result.metadata.path_lower
      }
    }
  }

  async requestDropbox(dbxMethod: string, args: any, successCallback=(error: any)=>{}, errorCallback=(error: any)=>{}) {
    this.props.handleBlockUI()
    const response = await this.dbx[dbxMethod](args).catch((error: any) => {
      return {
        errorCode: 'error',
        error: error
      }
    })

    this.props.handleUnblockUI()

    if (!response['errorCode']) {
      successCallback(response)
      return response
    } else {
      if (!!errorCallback) {
        errorCallback(response['error'])
      }
      return response['error']
    }
  }

  onClickDropboxFolder(dropboxEntry: any) {
    this.setState({
      currentPathDisplay: dropboxEntry.path_display,
      currentPathLower: dropboxEntry.path_lower
    })

    this.getDropboxEntries(dropboxEntry.path_lower)
  }

  navigateByBreadcrumb(currentPathDisplay: string, currentPathLower: string) {
    this.setState({
      currentPathDisplay: currentPathDisplay,
      currentPathLower: currentPathLower
    })
    this.getDropboxEntries(currentPathLower)
  }

  getDropboxEntries(rootPath: string) {
    this.requestDropbox('filesListFolder', { path: rootPath }, (dbxResponse) => {
      const { result: { entries } } = dbxResponse
      this.setState({ dropboxEntries: entries })
    })
  }

  onClickUploadButton() {
    this.setState({isDialogUploadVisible: true})
  }

  onCopyLink(dropboxEntry) {
    this.requestDropbox('sharingCreateSharedLink', { path: dropboxEntry.path_lower }, (dbxResponse) => {
      navigator.clipboard.writeText(dbxResponse.result.url)
      showNotificationSuccess("file has been copied successfully")
    })
  }

  onDeleteFile(dropboxEntry) {
    showConfirm(() => {
      this.requestDropbox('filesDeleteV2', { path: dropboxEntry.path_lower }, (dbxResponse) => {
        showNotificationSuccess(`${dropboxEntry['.tag']} has been deleted successfully`)
        this.getDropboxEntries(this.state.currentPathLower)
      })
    })
  }

  onOpenDialogPreview(dropboxEntry) {
    this.setState({isDialogPreviewVisible: true})
    this.requestDropbox('sharingCreateSharedLink', { path: dropboxEntry.path_lower }, (dbxResponse) => {
      this.setState({previewPath: dbxResponse.result.url})
    })
  }

  uploadFile(file) {
    this.requestDropbox('filesUpload', { contents: file, path: `${this.state.currentPathLower}/${file.name}` }, (dbxResponse) => {
      this.onCloseDialogUpload()
      showNotificationSuccess("file has been uploaded successfully")
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  createChildFolder(name: string) {
    this.setState({isDialogFolderFormVisible: false})
    this.requestDropbox('filesCreateFolderV2', { path: `${this.state.currentPathLower}/${name}`}, (dbxResponse) => {
      showNotificationSuccess(`${name} has been created successfully`)
      this.getDropboxEntries(this.state.currentPathLower)
    }, (error) => {
      showNotificationError('Error while creating folder, please double check the folder name')
    })
  }

  editChildFolderName(dropboxEntry: any, newName: string) {
    this.setState({isDialogRenameFolderFormVisible: false})
    if(dropboxEntry.name !== newName) {
      this.requestDropbox('filesMoveV2', {
        from_path: `${this.state.currentPathLower}/${dropboxEntry.name}`,
        to_path: `${this.state.currentPathLower}/${newName}`
      }, (response) => {
        showNotificationSuccess(`${newName} has been renamed successfully`)
        this.getDropboxEntries(this.state.currentPathLower)
      }, (error) => {
        showNotificationError('Error while renaming folder, please double check the folder name')
      })
    }
  }

  onCloseDialogPreview() {
    this.setState({
      isDialogPreviewVisible: false,
      previewPath: null
    })
  }

  onCloseDialogUpload() {
    this.setState({
      isDialogUploadVisible: false
    })
  }

  showCreateNewFolderForm() {
    this.setState({
      isDialogFolderFormVisible: true,
      dropboxEntry: null
    })
  }

  onOpenDialogEditNameFolder(dropboxEntry) {
    this.setState({
      isDialogRenameFolderFormVisible: true,
      dropboxEntry: dropboxEntry
    })
  }

  render() {
    const { config } = this.props
    const {
      dropboxEntries, currentPathDisplay, currentPathLower,
      isDialogPreviewVisible, isDialogUploadVisible, isDialogFolderFormVisible,
      previewPath, isDialogRenameFolderFormVisible, isBusinessAccount
    } = this.state

    return(
      <div className="record-detail-wrapper row-gaia clearFix-cybozu config-position position-relative">
        <div className="dropbox-wraper">
          <div className="dropbox-detail-border">

            <BreadcrumbNavigation
              config = {config}
              isBusinessAccount={isBusinessAccount}
              currentPathDisplay={currentPathDisplay}
              currentPathLower={currentPathLower}
              navigateByBreadcrumb={this.navigateByBreadcrumb}
            />

            <div className="btn-menu-wrapper">
              <Button
                variant="contained"
                color="primary"
                startIcon={ <FontAwesomeIcon icon={faUpload} className="fa btn-icon"/> }
                className="btn-upload-file"
                onClick={this.onClickUploadButton}
              >
                <span >Upload File</span>
              </Button>

              <Button
                variant="contained"
                color="primary"
                startIcon={ <FontAwesomeIcon icon={faPlus} className="fa btn-icon"/> }
                className="btn-create-folder"
                onClick={this.showCreateNewFolderForm}
              >
                <span>Create Folder</span>
              </Button>
            </div>

            <div className="dropbox-detail-border">
              {
                dropboxEntries.map((dropboxEntry, index) => {
                  const typeOfFile = dropboxEntry.name.split('.').pop()
                  return(
                    <div
                      className="dropbox-item-wrapper"
                      key={index}
                    >
                      <div className="dropbox-item-icon" onClick={() => this.onClickDropboxFolder(dropboxEntry)}>
                        {
                          dropboxEntry['.tag'] === 'folder'
                          ?
                            <FontAwesomeIcon icon={faFolder} className="fa folder-icon"/>
                          :
                            <FileIcon
                              extension={ `"${typeOfFile}"`} {...defaultStyles[typeOfFile]}
                              color= '#2ECC71'
                              glyphColor= '#fff'
                            />
                        }
                      </div>

                      <div className="dropbox-item-name" onClick={() => this.onClickDropboxFolder(dropboxEntry)}>
                        <span >
                          { dropboxEntry.name }
                        </span>
                      </div>

                      <div className="dropbox-item-actions">
                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <Button
                              style={{backgroundColor:'#5cb85c'}}
                              variant="contained"
                              startIcon={ <FontAwesomeIcon icon={faCopy} className="fa btn-icon"/> }
                              onClick={() => this.onCopyLink(dropboxEntry)}
                            >
                              Copy Link
                            </Button>
                          )
                        }

                        <Button
                          onClick={() => this.onDeleteFile(dropboxEntry)}
                          variant="contained"
                          startIcon={ <FontAwesomeIcon icon={faTrash} className="fa btn-icon"/> }
                          color="secondary"
                        >
                          Delete
                        </Button>

                        {
                          dropboxEntry['.tag'] == 'folder' && (
                            <Button
                              style={{backgroundColor:'#cc8854'}}
                              variant="contained"
                              startIcon={ <FontAwesomeIcon icon={faPen} className="fa btn-icon"/> }
                              onClick={() => this.onOpenDialogEditNameFolder(dropboxEntry)}>
                              Rename
                            </Button>
                          )
                        }

                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <Button
                              onClick={() => this.onOpenDialogPreview(dropboxEntry)}
                              variant="contained"
                              startIcon={ <FontAwesomeIcon icon={faEye} className="fa btn-icon"/> }
                              style={{backgroundColor:'#0063cc'}}
                              >
                              Preview
                            </Button>
                          )
                        }
                      </div>
                    </div>
                  )
                })
              }
            </div>
          </div>
        </div>

        <div className="preview-dialog-wrapper">
          {
            isDialogPreviewVisible && (
              <DropboxPreviewDialog
                previewPath={previewPath}
                isVisible={isDialogPreviewVisible}
                onCloseDialogPreview={this.onCloseDialogPreview}
              />
            )
          }
        </div>

        <div className="folder-form-dialog-wrapper">
          <FolderFormDialog
            isVisible={isDialogRenameFolderFormVisible}
            dropboxEntry={this.state.dropboxEntry}
            editChildFolderName={this.editChildFolderName}
            onCloseDialog={() => this.setState({isDialogRenameFolderFormVisible: false})}
          />
        </div>

        <div className="file-upload-dialog-wrapper">
          <UploadFileDialog
            isVisible={isDialogUploadVisible}
            uploadFile={this.uploadFile}
            onCloseDialogUpload={this.onCloseDialogUpload}
          />
        </div>

        <div className="folder-form-dialog-wrapper">
          <FolderFormDialog
            isVisible={isDialogFolderFormVisible}
            createChildFolder={this.createChildFolder}
            onCloseDialog={() => this.setState({isDialogFolderFormVisible: false})}
          />
        </div>
      </div>
    )
  }
}
