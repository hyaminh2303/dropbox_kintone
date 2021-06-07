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
  }

  renderContent() {
    return(
      <div className="folder-name-input-wraper">
        <TextField id="outlined-basic" label="Folder Name" variant="outlined" onChange={(event) => this.setState({folderName: event.target.value})}/>
      </div>
    )
  }

  createOrUpdateFolder() {
    this.props.createOrUpdateFolder(this.state.folderName)
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
