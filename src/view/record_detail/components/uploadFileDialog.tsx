import React, { Component, createRef } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'
import {DropzoneArea} from 'material-ui-dropzone'

export default class UploadFileDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
    this.uploadFile = this.uploadFile.bind(this)
  }

  uploadFile(acceptedFiles) {
    acceptedFiles.forEach((file) => {
      this.props.uploadFile(file)
    })
  }

  renderContent() {
    return(
      <DropzoneArea
        onDrop={(acceptedFiles) => {
          this.uploadFile(acceptedFiles)
        }}
        filesLimit={3000}
        showPreviews={false}
        dropzoneText="Drag and drop a file here or click"
        showPreviewsInDropzone={false}
        maxFileSize={157286400} // 150 MB
        showAlerts={false}
      />
    )
  }

  render() {
    const {
      isVisible,
      onCloseDialogUpload
    } = this.props

    return(
      <Dialog
        showCloseButton={true}
        content={this.renderContent()}
        isVisible={isVisible}
        onClose={onCloseDialogUpload}
      />
    )
  }
}
