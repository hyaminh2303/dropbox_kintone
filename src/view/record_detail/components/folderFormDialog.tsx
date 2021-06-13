import React, { Component } from 'react'
import { Dialog } from '@kintone/kintone-ui-component'
import { TextField, Button } from '@material-ui/core';

import './style.sass'
export default class FolderFormDialog extends Component {
  constructor(props) {
    super(props)
    this.renderContent = this.renderContent.bind(this)
    this.state = {
      folderName: ""
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    // this code for update
    if (nextProps.dropboxEntry) {
      this.setState({folderName: nextProps.dropboxEntry.name})
    } else {
      this.setState({folderName: ''})
    }
  }

  renderContent() {
    const { folderName } = this.state
    return(
      <div className="folder-name-input-wraper">
        {
          <TextField
            label="Folder Name"
            variant="outlined"
            value={folderName}
            onChange={(event) => { this.setState({folderName: event.target.value}) }}
          />
        }
      </div>
    )
  }

  createOrUpdateFolder() {
    const { dropboxEntry, editChildFolderName, createChildFolder } = this.props
    const { folderName } = this.state
    !!dropboxEntry ? editChildFolderName(dropboxEntry, folderName) : createChildFolder(folderName)
  }

  render() {
    const { isVisible, onCloseDialog } = this.props
    return(
      <Dialog
        showCloseButton={true}
        content={this.renderContent()}
        footer={
          <Button variant="contained" color="primary" onClick={() => {this.createOrUpdateFolder()}}>
            Save
          </Button>
        }
        isVisible={isVisible}
        onClose={onCloseDialog}
      />
    )
  }
}
