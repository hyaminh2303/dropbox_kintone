import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faPlus } from '@fortawesome/free-solid-svg-icons'
import { Dropbox } from 'dropbox'

import Loading from '../../components/loading.tsx';
import BreadcrumbNavigation from './components/breadcrumbNavigation'
import DropboxPreviewDialog from './components/dropboxPreviewDialog'
import UploadFileDialog from './components/uploadFileDialog'
import FolderFormDialog from './components/folderFormDialog'
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
    this.createOrUpdateFolder = this.createOrUpdateFolder.bind(this)
    this.requestDropbox = this.requestDropbox.bind(this)

    this.dbx = new Dropbox({
      accessToken: 'JTwqPF5csEAAAAAAAAAAASLyTdRylz2jdvwIQxk8rZ1XqqEx4Pg2toXYb4nIFtMB'
    })

    // TODO: Need to be updated by plugin config
    const rootPath = props.folderName || '/DropboxForKintone' + `/${props.event.record['会社名'].value}[${props.event.record['$id'].value}]`

    this.state = {
      currentPathLower: rootPath,
      currentPathDisplay: rootPath,
      dropboxEntries: [],
      isDialogPreviewVisible: false,
      isDialogUploadVisible: false,
      isDialogFolderFormVisible: false,
      previewPath: null,
    }
  }

  UNSAFE_componentWillMount() {
    this.getDropboxEntries(this.state.currentPathLower)
  }

  requestDropbox(dbxMethod: string, args: any, successCallback=function(error: any){}, errorCallback=function(error: any){}) {
    this.props.handleBlockUI()
    this.dbx[dbxMethod](args).then((response) => {
      this.props.handleUnblockUI()
      successCallback(response)
    }).catch((error) => {
      this.props.handleUnblockUI()
      if (!!errorCallback) {
        errorCallback(error)
      }
    })
  }

  onClickDropboxFolder(dropboxEntry: any) {
    this.setState({
      currentPathDisplay: dropboxEntry.path_display,
      currentPathLower: dropboxEntry.path_lower
    })

    this.getDropboxEntries(dropboxEntry.path_lower)
  }

  navigateByBreadcrumb(currentPathDisplay, currentPathLower) {
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
    })
  }

  onDeleteFile(dropboxEntry) {
    this.requestDropbox('filesDelete', { path: dropboxEntry.path_lower }, (dbxResponse) => {
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  onOpenDialogPreview(dropboxEntry) {
    this.setState({isDialogPreviewVisible: true})
    this.requestDropbox('sharingCreateSharedLink', { path: dropboxEntry.path_lower }, (dbxResponse) => {
      this.setState({previewPath: dbxResponse.result.url})
    })
  }

  onCloseDialogPreview() {
    this.setState({
      isDialogPreviewVisible: false
    })
  }

  onCloseDialogUpload() {
    this.setState({
      isDialogUploadVisible: false
    })
  }

  showCreateNewFolderForm() {
    this.setState({isDialogFolderFormVisible: true})
  }

  uploadFile(file) {
    this.requestDropbox('filesUpload', { contents: file, path: `${this.state.currentPathLower}/${file.name}` }, (dbxResponse) => {
      this.onCloseDialogUpload()
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  createOrUpdateFolder(name) {
    this.requestDropbox('filesCreateFolder', { path: `${this.state.currentPathLower}/${name}`, autorename: true }, (dbxResponse) => {
      this.setState({isDialogFolderFormVisible: false})
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  render() {
    const {
      dropboxEntries, currentPathDisplay, currentPathLower,
      isDialogPreviewVisible, isDialogUploadVisible, isDialogFolderFormVisible,
      previewPath
    } = this.state

    return(
      <div className="record-detail-wrapper row-gaia clearFix-cybozu config-position position-relative">
        <div className="dropbox-wraper">
          <div className="dropbox-detail-border">

            <BreadcrumbNavigation
              currentPathDisplay={currentPathDisplay}
              currentPathLower={currentPathLower}
              navigateByBreadcrumb={this.navigateByBreadcrumb}
            />

            <div className="btn-menu-wrapper">
              <button className="btn-upload-file" onClick={this.onClickUploadButton}>
                <FontAwesomeIcon icon={faUpload} />
                <span> Upload File </span>
              </button>

              <button className="btn-create-folder" onClick={this.showCreateNewFolderForm}>
                <FontAwesomeIcon icon={faPlus} />
                <span> Create Folder </span>
              </button>
            </div>

            <div className="dropbox-detail-border">
              {
                dropboxEntries.map((dropboxEntry, index) => {
                  return(
                    <div
                      className="dropbox-item-wrapper"
                      key={index}
                    >
                      <div className="dropbox-item-name" onClick={() => this.onClickDropboxFolder(dropboxEntry)}>
                        { dropboxEntry.name }
                      </div>

                      <div className="dropbox-item-actions">
                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <button onClick={() => this.onCopyLink(dropboxEntry)}>
                              Copy Link
                            </button>
                          )
                        }

                        <button onClick={() => this.onDeleteFile(dropboxEntry)}>
                          Delete
                        </button>

                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <button onClick={() => this.onOpenDialogPreview(dropboxEntry)}>
                              Preview
                            </button>
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
            createOrUpdateFolder={this.createOrUpdateFolder}
            onCloseDialog={() => this.setState({isDialogFolderFormVisible: false})}
          />
        </div>
      </div>
    )
  }
}
