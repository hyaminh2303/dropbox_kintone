import React, { Component } from "react";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars

import "./style.sass";

export default class BreadcrumbNavigation extends Component {
  constructor(props) {
    super(props);
    this.renderIndividualAccountBreadcrumb =
      this.renderIndividualAccountBreadcrumb.bind(this);
  }

  renderIndividualAccountBreadcrumb() {}

  render() {
    const {
      currentPathDisplay,
      currentPathLower,
      navigateByBreadcrumb,
      config,
      isBusinessAccount,
    } = this.props;

    const currentPathLowerItems = currentPathLower
      .split("/")
      .filter((i) => !!i);

      const currentPathDisplayItems = currentPathDisplay
      .split("/")
      .filter((i) => !!i);

    let pathLowerItems = [];
    let pathDisplayItems = [];
    console.log(currentPathLowerItems)
    return (
      <div className="dropbox-breadcrumb">
        <ul className="breadcrumb">
          {currentPathLowerItems.map((item, index) => {
            let name = currentPathDisplayItems[index];
            console.log(name)
            if (index != 0 || !isBusinessAccount) {
              pathLowerItems.push(item);
              pathDisplayItems.push(name);
            }

            let pathLower = "/" + pathLowerItems.join("/");
            let pathDisplay = "/" + pathDisplayItems.join("/");

            return (
              <li key={index}>
                {index == 0 ? (
                  name
                ) : (
                  <a
                    onClick={() => {
                      navigateByBreadcrumb(pathDisplay, pathLower);
                    }}
                  >
                    {name}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}
