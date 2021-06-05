import React, { Component } from 'react'
import ReactDOM from 'react-dom';
import Dropbox from 'dropbox'

import ConfigSetting from '../view/config/index';

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.setAppKeyValue = this.setAppKeyValue.bind(this);
    this.setAccessToken = this.setAccessToken.bind(this);
    this.setFolderName = this.setFolderName.bind(this);

    this.state = {
      appKeyValue: '',
      accessToken: '',
      folderName: '',
    }
  }

  setAppKeyValue(value) {
    this.setState({appKeyValue: value})
  }
  setAccessToken(value) {
    this.setState({accessToken: value})
  }
  setFolderName(value) {
    this.setState({folderName: value})
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  handleClickSaveButton() {
    const { appKeyValue, accessToken, folderName } = this.state;

    kintone.plugin.app.setConfig({
      appKeyValue: appKeyValue,
      accessToken: accessToken,
      folderName: folderName
    })
  }

  UNSAFE_componentWillMount() {
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    this.setState({
      activatedTab: 'config_app',
      appKeyValue: config.appKeyValue || '',
      accessToken: config.accessToken || '',
      folderName: config.folderName || '',
    })
  }

  render() {
    const { appKeyValue, accessToken, folderName } = this.state;
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    return (
      <React.Fragment>
        <h2>Settings for pluginDropbox</h2>

        <ConfigSetting 
          appKeyValue={appKeyValue}
          accessToken={accessToken}
          folderName={folderName}
          setAppKeyValue={this.setAppKeyValue}
          setAccessToken={this.setAccessToken}
          setFolderName={this.setFolderName}
          config={config}
        />

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
      </React.Fragment>
    )
  }
}

(async PLUGIN_ID => {
  const rootElement = document.getElementById('root');
  ReactDOM.render(<PluginSettings pluginId={PLUGIN_ID} />, rootElement);

})(kintone.$PLUGIN_ID);