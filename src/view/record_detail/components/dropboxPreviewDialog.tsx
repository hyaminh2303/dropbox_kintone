import React, { Component } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'

export default class DropboxPreviewDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
  }

  renderContent() {
    return(
      <a
        href="https://www.dropbox.com/s/hklvfik9s9e7jp2/Untitled.docx?dl=0"
        className="dropbox-embed"
        data-width="100%"
      ></a>
    )

  }

  render() {
    const {
      isVisible,
      onCloseDialogPreview
    } = this.props

    return(
      <Dialog
        showCloseButton={true}
        content={this.renderContent()}
        isVisible={isVisible}
        onClose={onCloseDialogPreview}
      />
    )
  }
}
