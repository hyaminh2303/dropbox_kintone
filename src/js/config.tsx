import React, { Component } from 'react'
import ReactDOM from 'react-dom'

import DropboxConfiguration from '../view/config/dropboxConfiguration';

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.setValueInput = this.setValueInput.bind(this);

    this.state = {
      appKeyValue: '',
      accessToken: '',
      folderName: '',
    }
  }

  setValueInput(value: any, inputName: string) {
    if(inputName === 'appKeyValue') {
      this.setState({appKeyValue: value})
    } else if(inputName === 'accessToken') {
      this.setState({accessToken: value})
    } else if(inputName === 'folderName') {
      this.setState({folderName: value})
    }
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
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    return (
      <React.Fragment>
        <h2>Settings for pluginDropbox</h2>

        <DropboxConfiguration
          state={this.state}
          setValueInput={this.setValueInput}
          config={config}
        />
      </React.Fragment>
    )
  }
}

(async PLUGIN_ID => {
  const rootElement = document.getElementById('root');
  ReactDOM.render(<PluginSettings pluginId={PLUGIN_ID} />, rootElement);

})(kintone.$PLUGIN_ID);