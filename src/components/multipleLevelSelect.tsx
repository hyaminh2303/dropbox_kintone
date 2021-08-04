import { Spinner } from "@kintone/kintone-ui-component";
import React from "react";

export default class MultipleLevelSelect extends React.Component {
  constructor(props) {
    super(props);
    this.renderChildrenItems = this.renderChildrenItems.bind(this);
  }

  renderChildrenItems(item) {
    if (!!item.children) {
      console.log(213213)
      return(
        <React.Fragment>
          <div>
            <div onClick={() => this.props.getChildrenDropboxFolders(item)}>{item.label}</div>
            <div>set</div>
          </div>
          {
            item.children.map(child => {
              return this.renderChildrenItems(child)
            })
          }
        </React.Fragment>
      )
    } else {
      return(
        <div>
          <div onClick={() => this.props.getChildrenDropboxFolders(item)}>{item.label}</div>
          <div>set</div>
        </div>
      )
    }
  }

  render() {
    const { items } = this.props;

    return(
      <div>
        {
          items.map(item => {
            return this.renderChildrenItems(item)
          })
        }
      </div>
    )
  }
}
