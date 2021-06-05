import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars

import BreadcrumbNavigation from './components/breadcrumbNavigation'
import './style.sass'

export default class RecordDetail extends Component {
  constructor(props) {
    super(props)
    this.dbx = new Dropbox({ accessToken: 'JTwqPF5csEAAAAAAAAAAASLyTdRylz2jdvwIQxk8rZ1XqqEx4Pg2toXYb4nIFtMB' })
    this.state = {
      dropboxEntries: [],

    }
  }

  UNSAFE_componentWillMount() {
    this.dbx.filesListFolder({ path: '' }).then((response) => {
      const { result: { entries } } = response
      this.setState({ dropboxEntries: entries })
    })
  }

  render() {
    const { dropboxEntries } = this.state
    console.log(dropboxEntries)
    return(
      <div className="record-detail-wrapper row-gaia clearFix-cybozu config-position position-relative">
        <div className="dropbox-wraper">
          <div className="dropbox-detail-border">
            <BreadcrumbNavigation />

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
