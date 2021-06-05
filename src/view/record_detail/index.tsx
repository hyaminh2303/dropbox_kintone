import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

import './style.sass'

export default class RecordDetail extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return(
      <div className="record-detail-wrapper row-gaia clearFix-cybozu config-position position-relative">
        <div className="dropbox-wraper">
          <div className="dropbox-detail-border">
            <div className="dropbox-breadcrumb">
              <ul className="breadcrumb">
                <li>
                  DropboxForKintone
                </li>
                <li><a href="#">pw3soydupwhl[68]</a></li>
                <li>
                53
                </li>
              </ul>
            </div>
            <div>
              <button className="option-show">
              <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
            <div className="dropbox-detail-border">
              asdadsdas
            </div>
          </div>
        </div>
      </div>
    )
  }
}
