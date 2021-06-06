import React, { Component } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'

export default class FolderFormDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
  }

  renderContent() {
    return(
      <div />
    )
  }

  render() {
    const { isVisible, onCloseDialog } = this.props

    return(
      <Dialog
        showCloseButton={true}
        content={this.renderContent()}
        isVisible={isVisible}
        onClose={onCloseDialog}
      />
    )
  }
}
