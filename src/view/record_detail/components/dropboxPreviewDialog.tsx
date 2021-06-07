import React, { Component } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'

export default class DropboxPreviewDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
  }

  renderContent(previewPath) {
    return(
        <a
          href={previewPath}
          className="dropbox-embed"
          id="preview-file"
          data-width="100%"
        ></a>
    )
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    var options = {
      // Shared link to Dropbox file
      link: nextProps.previewPath,
      file: {
        // Sets the zoom mode for embedded files. Defaults to 'best'.
        zoom: "best" // or "fit"
      }
    }
    Dropbox.embed(options, document.getElementById('preview-file'));
  }

  render() {
    const {
      isVisible,
      onCloseDialogPreview,
      previewPath
    } = this.props

    return(
      <Dialog
        showCloseButton={true}
        content={this.renderContent(previewPath)}
        isVisible={isVisible}
        onClose={onCloseDialogPreview}
      />
    )
  }
}
