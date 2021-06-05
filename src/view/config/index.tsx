import React, { Component } from 'react'
import { Text, Label } from '@kintone/kintone-ui-component';
import './style.sass'

export default class ConfigSetting extends Component {
  constructor(props) {
    super(props)

    this.state = {
      activatedTab: 'config_app',
    }
  }

  render() {
    const { appKeyValue, accessToken, folderName,
            setAppKeyValue, setAccessToken, setFolderName,
            config 
          } = this.props;

    return (
      <div>
        <a 
          className="kintoneplugin-button-dialog-cancel btn-home"
          href={`/k/${kintone.app.getId()}`}
        >
          Home
        </a>

        <div>
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
              value={appKeyValue}
              onChange={(value) =>  setAppKeyValue(value)}
              className="kintoneplugin-input-text"
              isDisabled={config.accessToken !== undefined ? true : false}
            />
          </div>
          <div className="kintoneplugin-row">
            <Label text='Access Token' isRequired={false} />
            <Text
              value={accessToken}
              isDisabled={config.appKeyValue !== undefined ? true : false}
              onChange={(value) => setAccessToken(value)}
              className="kintoneplugin-input-text" />
          </div>
          <div className="kintoneplugin-row">
            <Label text='Folder Name' isRequired={false} />
            <Text
              value={folderName}
              onChange={(value) => setFolderName(value)}
              className="kintoneplugin-input-text" />
          </div>
        </div>
      </div>
    )
  }
}
