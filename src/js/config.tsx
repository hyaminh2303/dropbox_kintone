import React, { Component } from "react";
import ReactDOM from "react-dom";

import DropboxConfiguration from "../view/config/dropboxConfiguration";
import "../view/config/style.sass";

class PluginSettings extends Component {
  constructor(props) {
    super(props);

    this.setPluginConfig = this.setPluginConfig.bind(this);
    this.state = props.config;
  }

  setPluginConfig(values: any) {
    const { pluginId } = this.props;
    const currentConfig = kintone.plugin.app.getConfig(pluginId);

    const newConfig = Object.assign(currentConfig, values);

    kintone.plugin.app.setConfig(newConfig, () => {
      return false;
    });
  }

  render() {
    const { pluginId } = this.props;

    return (
      <React.Fragment>
        <h2>Settings for pluginDropbox</h2>

        <div className="tab-btn-wrapper">
          <button className="tab-btn">Config App</button>
        </div>

        <DropboxConfiguration
          {...this.state}
          setPluginConfig={this.setPluginConfig}
          config={this.props.config}
          pluginId={pluginId}
        />
      </React.Fragment>
    );
  }
}

(async (PLUGIN_ID) => {
  const rootElement = document.getElementById("root");
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  ReactDOM.render(
    <PluginSettings pluginId={PLUGIN_ID} config={config} />,
    rootElement
  );
})(kintone.$PLUGIN_ID);
