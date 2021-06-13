import React, { Component } from 'react'
import { Text, Label } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars

import './style.sass'

export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activatedTab: 'config_app',
    }

    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.dbx = new Dropbox({ accessToken: 'result.accessToken' });
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  handleClickSaveButton() {
    const { state } = this.props;

    kintone.plugin.app.setConfig({
      appKeyValue: state.appKeyValue,
      accessToken: state.accessToken,
      folderName: state.folderName
    })
  }

  render() {
    const { config, state, setValueInput } = this.props;

    return (
      <div>
        <a
          className="kintoneplugin-button-dialog-cancel btn-home"
          href={`/k/${kintone.app.getId()}`}
        >
          Home
        </a>

        <div className="tab-btn-wrapper">
          <button className="tab-btn">
            Config App
            </button>
          <button className="tab-btn">
            License
            </button>
        </div>
        <div className="tab-content">
          <div className="kintoneplugin-row">
            <Label text='App key' isRequired={false} />
            <Text
              value={state.appKeyValue}
              onChange={(value) => setValueInput(value, 'appKeyValue')}
              className="kintoneplugin-input-text"
              isDisabled={config.accessToken !== undefined ? true : false}
            />
          </div>
          <div className="kintoneplugin-row">
            <Label text='Access Token' isRequired={false} />
            <Text
              value={state.accessToken}
              isDisabled={config.accessToken !== undefined ? true : false}
              onChange={(value) => setValueInput(value, 'accessToken')}
              className="kintoneplugin-input-text" />
          </div>
          <div className="kintoneplugin-row">
            <Label text='Folder Name' isRequired={false} />
            <Text
              value={state.folderName}
              onChange={(value) => setValueInput(value, 'folderName')}
              className="kintoneplugin-input-text" />
          </div>

          <div className="kintoneplugin-row">
            <button
              type="button"
              className="js-cancel-button kintoneplugin-button-dialog-cancel"
            onClick={this.onCancel}
            >
              Cancel
            </button>

            <button
              className="kintoneplugin-button-dialog-ok"
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
