import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { forEach } from 'lodash'

import DropboxConfiguration from '../view/config/dropboxConfiguration'
import License from '../view/config/license'
import '../view/config/style.sass'

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.setPluginConfig = this.setPluginConfig.bind(this);

    this.state = {
      activatedTab: 'config_app',
      accessToken: '',
      licenseKey: '',
      selectedField: '',
      folderName: '',
      dropbox_configuration_app_id: '',
      formFields: [],
      memberId: '',
      sharedFolderId: ''
    }
  }

  setPluginConfig(values: any) {
    const { pluginId } = this.props
    const currentConfig = kintone.plugin.app.getConfig(pluginId)
    const newConfig = Object.assign(currentConfig, values)
    kintone.plugin.app.setConfig(newConfig, () => {
      return false;
    })
  }

  UNSAFE_componentWillMount() {
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    this.setState({
      accessToken: config.accessToken || '',
      licenseKey: config.licenseKey || '',
      selectedField: config.selectedField || '',
      dropbox_configuration_app_id: config.dropbox_configuration_app_id,
      formFields: [{
        label: config.selectedField || '',
        value: config.selectedField || '',
        isDisabled: false
      }]
    });
  }

  componentDidMount() {
    (async () => {
      const { selectedField } = this.state;

      const restClient = new KintoneRestAPIClient();
      const responseFormFields = await restClient.app.getFormFields({ app: kintone.app.getId() });

      let arrayFields: any = [];
      forEach(responseFormFields.properties, (fieldCode: string, fieldKey: any) => {
        arrayFields.push({
          label: fieldCode.label,
          value: fieldCode.code,
          isDisabled: false
        });
      })

      if (arrayFields.filter((i) => { return (i.value == selectedField) }).length == 0) {
        arrayFields.push({
          label: selectedField || '',
          value: selectedField || '',
          isDisabled: false
        })
      }

      this.setState({ formFields: arrayFields });
    })()
  }

  render() {
    const { activatedTab } = this.state;
    const { pluginId } = this.props;

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
              setPluginConfig={this.setPluginConfig}
              pluginId={pluginId}
            />
          :
            <License
              {...this.state}
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