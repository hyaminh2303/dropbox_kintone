import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faPlus, faTrash, faCopy, faEye } from '@fortawesome/free-solid-svg-icons'
import { Dropbox, Error, files } from 'dropbox'
import { Button } from '@material-ui/core';

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
    this.dbx.filesListFolder({ path: rootPath }).then((response) => {
      const { result: { entries } } = response
      this.setState({ dropboxEntries: entries })
    })
  }

  onClickUploadButton() {
    this.setState({isDialogUploadVisible: true})
  }

  onCopyLink(dropboxEntry) {
    this.dbx.sharingCreateSharedLink({
      path: dropboxEntry.path_lower
    }).then((response) => {
      navigator.clipboard.writeText(response.result.url)
      console.log('copied dropbox url')
    })
  }

  onDeleteFile(dropboxEntry) {
    this.dbx.filesDelete({
      path: dropboxEntry.path_lower
    }).then((response) => {
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  onOpenDialogPreview(dropboxEntry) {
    this.setState({isDialogPreviewVisible: true})
    this.dbx.sharingCreateSharedLink({
      path: dropboxEntry.path_lower
    }).then((response) => {
      this.setState({previewPath: response.result.url})
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
    this.dbx.filesUpload({
      contents: file,
      path: `${this.state.currentPathLower}/${file.name}`
    }).then((result) => {
      this.onCloseDialogUpload()
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  createOrUpdateFolder(name) {
    this.dbx.filesCreateFolder({
      path: `${this.state.currentPathLower}/${name}`,
      autorename: true
    }).then((result) => {
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
              <Button
                variant="contained"
                color="primary"
                startIcon={ <FontAwesomeIcon icon={faUpload}/> }
                className="btn-upload-file"
                onClick={this.onClickUploadButton}
              >
                <span >Upload File</span>
              </Button>

              <Button
                variant="contained"
                color="primary"
                startIcon={ <FontAwesomeIcon icon={faPlus}/> }
                className="btn-create-folder"
                onClick={this.showCreateNewFolderForm}
              >
                <span>Create Folder</span>
              </Button>
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
                        <span>
                        { dropboxEntry.name }
                        </span>
                      </div>

                      <div className="dropbox-item-actions">
                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <Button
                              style={{backgroundColor:'#5cb85c'}}
                              variant="contained"
                              startIcon={ <FontAwesomeIcon icon={faCopy}/> }
                              onClick={() => this.onCopyLink(dropboxEntry)}
                            >
                              Copy Link
                            </Button>
                          )
                        }

                        <Button
                          onClick={() => this.onDeleteFile(dropboxEntry)}
                          variant="contained"
                          startIcon={ <FontAwesomeIcon icon={faTrash}/> }
                          color="secondary"

                        >
                          Delete
                        </Button>

                        {
                          dropboxEntry['.tag'] == 'file' && (
                            <Button
                              onClick={() => this.onOpenDialogPreview(dropboxEntry)}
                              variant="contained"
                              startIcon={ <FontAwesomeIcon icon={faEye}/> }
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
