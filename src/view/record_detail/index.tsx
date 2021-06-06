import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars

import BreadcrumbNavigation from './components/breadcrumbNavigation'
import DropboxPreviewDialog from './components/dropboxPreviewDialog'
import './style.sass'


export default class RecordDetail extends Component {
  constructor(props) {
    super(props)
    this.onClickDropboxFolder = this.onClickDropboxFolder.bind(this)
    this.navigateByBreadcrumb = this.navigateByBreadcrumb.bind(this)
    this.onClickUploadButton = this.onClickUploadButton.bind(this)
    this.onChangeFile = this.onChangeFile.bind(this)
    this.onCopyLink = this.onCopyLink.bind(this)
    this.onDeleteFile = this.onDeleteFile.bind(this)
    this.onPreviewFile = this.onPreviewFile.bind(this)
    this.onCloseDialogPreview = this.onCloseDialogPreview.bind(this)

    this.dbx = new Dropbox({
      accessToken: 'JTwqPF5csEAAAAAAAAAAASLyTdRylz2jdvwIQxk8rZ1XqqEx4Pg2toXYb4nIFtMB'
    })

    // TODO: Need to be updated by plugin config
    const rootPath = props.folderName || '/DropboxForKintone' + `/${props.event.record['会社名'].value}[${props.event.record['$id'].value}]`

    this.state = {
      currentPathLower: rootPath,
      currentPathDisplay: rootPath,
      dropboxEntries: [],
      filePreviewBlob: null,
      isDialogVisible: false
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
    this.uploadFileInput.click()
  }

  onCopyLink(dropboxEntry) {
    this.dbx.sharingCreateSharedLink({
      path: dropboxEntry.path_lower
    }).then((response) => {
      console.log(response)
      navigator.clipboard.writeText(response.result.url)
      console.log('copied dropbox url')
    })
  }

  onDeleteFile(dropboxEntry) {
    this.dbx.filesDelete({
      path: dropboxEntry.path_lower
    }).then((response) => {
      console.log(response)
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  onPreviewFile(dropboxEntry) {
    console.log(dropboxEntry)
    this.setState({isDialogVisible: true})

    this.dbx.filesGetPreview({
      path: dropboxEntry.path_lower,
      rev: dropboxEntry.rev
    }).then((response) => {
      const fileBlob = response.result.fileBlob
      this.setState({filePreviewBlob: fileBlob})
    })
  }

  onCloseDialogPreview() {
    this.setState({
      filePreviewBlob: null,
      isDialogVisible: false
    })
  }

  async onChangeFile(event) {
    event.stopPropagation()
    event.preventDefault()
    const file = event.target.files[0]

    this.dbx.filesUpload({
      contents: file,
      path: `${this.state.currentPathLower}/${file.name}`
    }).then((result) => {
      this.getDropboxEntries(this.state.currentPathLower)
    })
  }

  render() {
    const {
      dropboxEntries, currentPathDisplay, currentPathLower,
      isDialogVisible, filePreviewBlob
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

            <div>
              <button className="option-show" onClick={this.onClickUploadButton}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>

            <input id="upload-file-input"
              type="file"
              style={{display: 'none'}}
              ref={(ref) => this.uploadFileInput = ref}
              onChange={this.onChangeFile}
            />

            <div className="dropbox-detail-border">
              {
                dropboxEntries.map((dropboxEntry, index) => {
                  return(
                    <div
                      key={index}
                      onDoubleClick={() => this.onClickDropboxFolder(dropboxEntry)}
                    >
                      <div>
                        { dropboxEntry.name }
                      </div>

                      <div>
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
                            <button onClick={() => this.onPreviewFile(dropboxEntry)}>
                              Preview File
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
          <DropboxPreviewDialog
            filePreviewBlob={filePreviewBlob}
            isDialogVisible={isDialogVisible}
            onCloseDialogPreview={this.onCloseDialogPreview}
          />
        </div>
      </div>
    )
  }
}
