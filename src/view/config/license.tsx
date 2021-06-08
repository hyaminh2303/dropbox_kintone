import React, { Component } from 'react'
import { Text, Label } from '@kintone/kintone-ui-component'

import './style.sass'


export default class License extends Component {
  constructor(props) {
    super(props)

    this.onCancel = this.onCancel.bind(this);
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  render() {
    const { licenseKey, setValueInput, setConfig } = this.props;

    return (
      <div>
        <div className="tab-content">
          <div className="kintoneplugin-row input-wrapper">
            <Label text='License' isRequired={false} />
            <div className="input-config">
              <Text
                value={licenseKey}
                onChange={(value) => setValueInput(value, 'licenseKey')}
                className="kintoneplugin-input-text" />
            </div>
          </div>
          <div className="kintoneplugin-row">
            <button
              type="button"
              className="js-cancel-button kintoneplugin-button-dialog-cancel btn-action"
              onClick={this.onCancel}
            >
              Cancel
              </button>

            <button
              className="kintoneplugin-button-dialog-ok btn-action"
              onClick={() => setConfig()}
            >
              Save
              </button>
          </div>
        </div>
      </div>
    )
  }
}
