import React, { Component } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'
import {DropzoneArea} from 'material-ui-dropzone'

export default class UploadFileDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
  }

  renderContent() {
    const { uploadFile } = this.props
    return(
      <DropzoneArea
        onDrop={acceptedFiles => uploadFile(acceptedFiles[0])}
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
