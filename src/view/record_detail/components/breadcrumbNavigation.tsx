import React, { Component } from 'react'

import './style.sass'

export default class BreadcrumbNavigation extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const {
      currentPathDisplay, currentPathLower, navigateByBreadcrumb
    } = this.props

    const currentPathLowerItems = currentPathLower.split('/').filter((i) => !!i)
    const currentPathDisplayItems = currentPathDisplay.split('/').filter((i) => !!i)
    let pathLowerItems = []
    let pathDisplayItems = []

    return(
      <div className="dropbox-breadcrumb">
        <ul className="breadcrumb">
          {
            currentPathLowerItems.map((item, index) => {
              let name = currentPathDisplayItems[index]
              pathLowerItems.push(item)
              pathDisplayItems.push(name)
              let pathLower = '/' + pathLowerItems.join('/')
              let pathDisplay = '/' +  pathDisplayItems.join('/')

              return(
                <li key={index}>
                  {
                    index == 0 ? (
                      name
                    ) : (
                      <a onClick={() => {navigateByBreadcrumb(pathDisplay, pathLower)}}>
                        {name}
                      </a>
                    )
                  }
                </li>
              )
            })
          }
        </ul>
      </div>
    )
  }
}
