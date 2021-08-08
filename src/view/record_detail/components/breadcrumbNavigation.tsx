import React, { Component } from "react";
import { concat, compact, replace, tail, take } from "lodash";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars

import "./style.sass";

export default class BreadcrumbNavigation extends Component {
  constructor(props) {
    super(props);
    this.buildBreadcrumnLinks = this.buildBreadcrumnLinks.bind(this);
  }

  buildBreadcrumnLinks() {
    const {
      currentPathLower,
      selectedFolderPathLower,
      namespaceName
    } = this.props;

    let breadcrumnLinksItems = compact(replace(currentPathLower, selectedFolderPathLower, "").split("/"));

    let breadcrumnLinksItemsProcessed = breadcrumnLinksItems.map((breadcrumnLinkItem, index) => {
      let pathItems = take(breadcrumnLinksItems, index+1)
      return {
        name: breadcrumnLinkItem,
        path: concat(selectedFolderPathLower, pathItems).join("/")
      }
    })

    return concat(
      [{ name: `${namespaceName}/${selectedFolderPathLower}`, path: selectedFolderPathLower}],
      breadcrumnLinksItemsProcessed
    )
  }

  render() {
    const { navigateByBreadcrumb } = this.props;

    let breadcrumnLinks = this.buildBreadcrumnLinks();

    return (
      <div className="dropbox-breadcrumb">
        <ul className="breadcrumb">
          {
            breadcrumnLinks.map((item, index) => {
              let rootItemsName = compact(item['name'].split("/"));

              if (index == 0) {
                return rootItemsName.map((rootItemName, rootItemIndex) => {
                  return (
                    <li key={`${index}-${rootItemIndex}`}>
                      <a onClick={() => navigateByBreadcrumb(item['path'], item['path'])}>
                        {rootItemName}
                      </a>
                    </li>
                  );
                })
              } else {
                return (
                  <li key={index}>
                    <a onClick={() => navigateByBreadcrumb(item['path'], item['path'])}>
                      {item.name}
                    </a>
                  </li>
                );
              }
            })
          }
        </ul>
      </div>
    );
  }
}
