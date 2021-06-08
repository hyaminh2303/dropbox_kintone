import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { forEach } from 'lodash'

import DropboxConfiguration from '../view/config/dropboxConfiguration';
import License from '../view/config/license';
import '../view/config/style.sass'

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.setValueInput = this.setValueInput.bind(this);
    this.setConfig = this.setConfig.bind(this);

    this.state = {
      activatedTab: 'config_app',
      appKeyValue: '',
      accessToken: '',
      folderName: '',
      licenseKey: '',
      selectedField: '',
      formFields: [{
        label: 'Please select',
        value: '',
        isDisabled: false
      }],
    }
  }

  setValueInput(value: any, inputName: string) {
    if(inputName === 'appKeyValue') {
      this.setState({appKeyValue: value})
    } else if(inputName === 'accessToken') {
      this.setState({accessToken: value})
    } else if(inputName === 'folderName') {
      this.setState({folderName: value})
    } else if(inputName === 'licenseKey') {
      this.setState({licenseKey: value})
    } else if(inputName === 'dropdownSpecifiedField') {
      this.setState({selectedField: value})
    }
  }

  setConfig() {
    const { folderName, selectedField, appKeyValue, accessToken, licenseKey } = this.state;

    kintone.plugin.app.setConfig({
      appKeyValue: appKeyValue,
      accessToken: accessToken,
      folderName: folderName,
      selectedField: selectedField,
      licenseKey: licenseKey,
    })
  }

  async UNSAFE_componentWillMount() {
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    const restClient = new KintoneRestAPIClient();
    const responseFormFields = await restClient.app.getFormFields({ app: kintone.app.getId() });

    let arrayFields: any = [];
    forEach(responseFormFields.properties, (fieldCode: string, fieldKey: any) => {
      arrayFields.push({ label: fieldCode.label, value: fieldCode.code, isDisabled: false });
    })

    arrayFields.unshift({
      label: 'Please select',
      value: '',
      isDisabled: false
    })

    this.setState({
      appKeyValue: config.appKeyValue || '',
      accessToken: config.accessToken || '',
      folderName: config.folderName || '',
      licenseKey: config.licenseKey || '',
      selectedField: config.selectedField || '',
      formFields: arrayFields,
    });
  }

  render() {
    const { activatedTab } = this.state;

    return (
      <React.Fragment>
        <h2>Settings for pluginDropbox</h2>

        <div className="tab-btn-wrapper">
          <button className="tab-btn" onClick={() => this.setState({ activatedTab: 'config_app' })}>
            Config App
            </button>
          <button className="tab-btn" onClick={() => this.setState({ activatedTab: 'licenseKeyTab' })}>
            License
            </button>
        </div>

        {
          activatedTab === 'config_app'
          ?
            <DropboxConfiguration
              {...this.state}
              setValueInput={this.setValueInput}
            />
          :
            <License
              {...this.state}
              setValueInput={this.setValueInput}
              setConfig={this.setConfig}
            />
        }

      </React.Fragment>
    )
  }
}

(async PLUGIN_ID => {
  const rootElement = document.getElementById('root');
  ReactDOM.render(<PluginSettings pluginId={PLUGIN_ID} />, rootElement);

})(kintone.$PLUGIN_ID);