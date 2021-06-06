import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import RecordDetail from '../view/record_detail';

(async PLUGIN_ID => {
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  const domRoot = document.createElement("div");
  document.body.appendChild(domRoot);

  class App extends Component {
    constructor(props) {
      super(props)
      this.recordDetailComponentName = 'RecordDetail'

      this.state = {
        currentComponent: '',
        event: {}
      }
    }

    UNSAFE_componentWillMount() {
      kintone.events.on(['app.record.detail.show'], async (event: any) => {
        this.setState({
          currentComponent: this.recordDetailComponentName,
          event: event
        })
      })
    }

    render() {
      const { config, pluginId } = this.props
      const { currentComponent, event } = this.state

      if (currentComponent == this.recordDetailComponentName) {
        return(<RecordDetail pluginId={pluginId} config={config} event={event} />)
      } else {
        return(<div />)
      }
    }
  }

  ReactDOM.render(<App pluginId={PLUGIN_ID} config={config} />, domRoot);
})(kintone.$PLUGIN_ID);