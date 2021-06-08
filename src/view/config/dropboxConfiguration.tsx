import React, { Component } from 'react'
import { Text, Label, Dropdown } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars

import './style.sass'

export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)

    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.createOrUpdateFolder = this.createOrUpdateFolder.bind(this);

    // this.dbx = new Dropbox({ accessToken: props.accessToken || '' });
    this.dbx = null;
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  handleClickSaveButton() {
    const { folderName,  selectedField, appKeyValue, accessToken, setConfig } = this.props;

    // if(appKeyValue === undefined || accessToken === undefined || folderName === undefined || selectedField === undefined) {
    //   alert('All field is requied!')
    // } else {
      // this.createOrUpdateFolder(folderName)
    // }
  }

  createOrUpdateFolder(name) {
    this.dbx.filesCreateFolder({
      path: `/${name}`,
      autorename: true
    }).then((result) => {
      console.log(result)
    })
  }

  UNSAFE_componentWillMount() {
    console.log("this.props", this.props)
  }

  render() {
    const { setValueInput, folderName, formFields, selectedField, appKeyValue, accessToken } = this.props;

    return (
      <div>
        <div className="tab-content">
          <div>
            <div className="kintoneplugin-row">
              <Label text='App key' isRequired={false} />
              <div className="input-config">
                <Text
                  value={appKeyValue}
                  onChange={(value) => setValueInput(value, 'appKeyValue')}
                  className="kintoneplugin-input-text"
                />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Access Token' isRequired={false} />
              <div className="input-config">
                <Text
                  value={accessToken}
                  onChange={(value) => setValueInput(value, 'accessToken')}
                  className="kintoneplugin-input-text" />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Folder Name' isRequired={false} />
              <div className="input-config">
                <Text
                  value={folderName}
                  onChange={(value) => setValueInput(value, 'folderName')}
                  className="kintoneplugin-input-text" />
              </div>
            </div>
            <div className="kintoneplugin-row">
              <Label text='Specified field to set folder name'/>
              <Dropdown
                items={formFields}
                value={selectedField}
                onChange={(value) => setValueInput(value, 'dropdownSpecifiedField')}
              />
            </div>
          </div>

          <div className="kintoneplugin-row">
            <button
              type="button"
              className="js-cancel-button kintoneplugin-button-dialog-cancel btn-action"
              onClick={this.onCancel}
            >
              Cancel
            </button>

            <button
              className="kintoneplugin-button-dialog-ok btn-action"
              onClick={this.handleClickSaveButton}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }
}
