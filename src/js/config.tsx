import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { forEach } from 'lodash'

import Fields from '../utils/Fields'
import DropboxConfiguration from '../view/config/dropboxConfiguration'
import '../view/config/style.sass'

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.setPluginConfig = this.setPluginConfig.bind(this);

    this.state = {
      accessToken: '',
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
    console.log(values)
    console.log(currentConfig)
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
      selectedField: config.selectedField || '',
      dropbox_configuration_app_id: config.dropbox_configuration_app_id,
      folderName: config.folderName,
      selectedFolderId: config.selectedFolderId,
      chooseFolderMethod: config.chooseFolderMethod,
      formFields: []
    });
  }

  componentDidMount() {
    (async () => {
      const { selectedField } = this.state;

      // const restClient = new KintoneRestAPIClient();
      // const responseFormFields = await restClient.app.getFormFields({ app: kintone.app.getId() });

      let arrayFields: any = [];
      console.log(Fields)
      forEach(Fields, (fieldConfig:any, fieldCode: string) => {
        if (fieldConfig.type == "SINGLE_LINE_TEXT") {
          arrayFields.push({
            label: fieldConfig.label,
            value: fieldCode
          });
        }
      })

      this.setState({ formFields: arrayFields });
    })()
  }

  render() {
    const { pluginId } = this.props;

    return (
      <React.Fragment>
        <h2>Settings for pluginDropbox</h2>

        <div className="tab-btn-wrapper">
          <button className="tab-btn">
            Config App
          </button>
        </div>
        <DropboxConfiguration
          {...this.state}
          setPluginConfig={this.setPluginConfig}
          pluginId={pluginId}
        />
      </React.Fragment>
    )
  }
}

(async PLUGIN_ID => {
  const rootElement = document.getElementById('root');
  ReactDOM.render(<PluginSettings pluginId={PLUGIN_ID} />, rootElement);

})(kintone.$PLUGIN_ID);