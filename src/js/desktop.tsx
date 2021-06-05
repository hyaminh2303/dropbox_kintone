import React from 'react';
import ReactDOM from 'react-dom';

import RecordDetail from '../view/record_detail';

(async PLUGIN_ID => {
  const config = kintone.plugin.app.getConfig(PLUGIN_ID);
  const domRoot = document.createElement("div");
  document.body.appendChild(domRoot);

  ReactDOM.render(
    <RecordDetail pluginId={PLUGIN_ID} config={config} />, domRoot
  );
})(kintone.$PLUGIN_ID);