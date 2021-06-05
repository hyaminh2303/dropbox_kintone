import React, { Component } from 'react'

import './style.sass'

export default class BreadcrumbNavigation extends Component {
  constructor(props) {
    super(props)
  }



  render() {
    return(
      <div className="dropbox-breadcrumb">
        <ul className="breadcrumb">
          <li>
            DropboxForKintone
          </li>
          <li>
              <a href="#">pw3soydupwhl[68]</a>
              <a className="btn-edit-folder-name" onClick={() => alert(111)}>
                edit
              </a>
          </li>

          <li>
          53
          </li>
        </ul>
      </div>
    )
  }
}
