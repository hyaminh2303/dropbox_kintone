import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { Dropbox } from 'dropbox' // eslint-disable-line no-unused-vars
import { forEach } from 'lodash'

import DropboxConfiguration from '../view/config/dropboxConfiguration'
import License from '../view/config/license'
import '../view/config/style.sass'

class PluginSettings extends Component {
  constructor(props) {
    super(props)

    this.setStateValue = this.setStateValue.bind(this);
    this.setConfig = this.setConfig.bind(this);
    this.checkName = this.checkName.bind(this);

    this.state = {
      activatedTab: 'config_app',
      appKeyValue: '',
      accessToken: '',
      folderName: '',
      folderId: '',
      licenseKey: '',
      selectedField: '',
      formFields: [{
        label: 'Please select',
        value: '',
        isDisabled: false
      }],
    }

    this.dbx = null;
  }

  setStateValue(value: any, typeOfSetState: string) {
    if(typeOfSetState === 'appKeyValue') {
      this.setState({appKeyValue: value})
    } else if(typeOfSetState === 'accessToken') {
      this.setState({accessToken: value})
    } else if(typeOfSetState === 'folderName') {
      this.setState({folderName: value})
    } else if(typeOfSetState === 'licenseKey') {
      this.setState({licenseKey: value})
    } else if(typeOfSetState === 'dropdownSpecifiedField') {
      this.setState({selectedField: value})
    } else if(typeOfSetState === 'folderId') {
      this.setState({folderId: value})
    }
  }

  setConfig() {
    const { folderName, selectedField, appKeyValue,
            accessToken, licenseKey, folderId
          } = this.state;

    kintone.plugin.app.setConfig({
      appKeyValue: appKeyValue,
      accessToken: accessToken,
      folderName: folderName,
      selectedField: selectedField,
      licenseKey: licenseKey,
      folderId: folderId
    })
  }

  checkName() {
    const { appKeyValue, accessToken, folderName, folderId } = this.state;
    this.dbx = new Dropbox({ accessToken: accessToken || '' });

    if(appKeyValue !== '' && accessToken !== '' && folderId !== '') {
      this.dbx.filesListFolder({
        path: '',
      }).then((response: any) => {
        const { result } = response;
        const currentFolderOnDropbox = result.entries.filter(item => item.id === folderId);

        if(currentFolderOnDropbox.length !== 0) {
          if(currentFolderOnDropbox[0].name !== folderName) {
            const question = confirm('Folder name on Dropbox has been changed. Do you want to update the folder name again?')
            if(question) {
              this.setStateValue(currentFolderOnDropbox[0].name, 'folderName')
              this.setConfig();
            }
          }
        }
      })
    }
  }

  async UNSAFE_componentWillMount() {
    const { pluginId } = this.props;
    const config = kintone.plugin.app.getConfig(pluginId);

    const restClient = new KintoneRestAPIClient();
    const responseFormFields = await restClient.app.getFormFields({ app: kintone.app.getId() });

    let arrayFields: any = [];
    const fieldsOfSystem = ['作業者', 'ステータス', 'カテゴリー']
    forEach(responseFormFields.properties, (fieldCode: string, fieldKey: any) => {
      if(!fieldsOfSystem.includes(fieldCode.label)) {
        arrayFields.push({ label: fieldCode.label, value: fieldCode.code, isDisabled: false });
      }
    })

    arrayFields.unshift({
      label: 'Please select',
      value: '',
      isDisabled: false
    })

    let sameFieldsInConfig = arrayFields.filter(item => {
      return item.value === config.selectedField;
    })

    if(sameFieldsInConfig.length === 0) {
      alert('The specified code file was not found. The program will automatically specify the field code to default.');
      kintone.plugin.app.setConfig({
        appKeyValue: config.appKeyValue || '',
        accessToken: config.accessToken || '',
        folderName: config.folderName || '',
        selectedField: '',
        licenseKey: config.licenseKey || '',
        folderId: config.folderId || '',
      })
    }

    this.setState({
      appKeyValue: config.appKeyValue || '',
      accessToken: config.accessToken || '',
      folderName: config.folderName || '',
      licenseKey: config.licenseKey || '',
      selectedField: config.selectedField || '',
      folderId: config.folderId || '',
      formFields: arrayFields,
    }, () => {
      this.checkName();
    });
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
              setStateValue={this.setStateValue}
              setConfig={this.setConfig}
              pluginId={pluginId}
            />
          :
            <License
              {...this.state}
              setStateValue={this.setStateValue}
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