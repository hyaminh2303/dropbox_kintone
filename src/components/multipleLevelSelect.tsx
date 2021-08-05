import React from "react";
import { Spinner } from "@kintone/kintone-ui-component";
import Dropdown from 'react-multilevel-dropdown';


export default class MultipleLevelSelect extends React.Component {
  constructor(props) {
    super(props);
    this.renderChildrenItems = this.renderChildrenItems.bind(this);
  }

  renderChildrenItems(item, index) {
    console.log(item)
    if (item.children.length > 0) {
      return(
        <Dropdown.Item position="right" key={index}>
          { item.label }
          <Dropdown.Submenu position="right">
            {
              item.children.map((child, index) => {
                return this.renderChildrenItems(child, index)
              })
            }
          </Dropdown.Submenu>
        </Dropdown.Item>
      )
    } else {
      return(
        <Dropdown.Item position="right" onClick={() => this.props.setDropboxFolder(item)} key={index}>
          {item.label}
        </Dropdown.Item>
      )
    }
  }

  render() {
    const { items, folderName } = this.props;
    console.log(items)
    return(
      <Dropdown
        title={folderName}
        position="right"
      >
        {
          items.map((item, index) => {
            return this.renderChildrenItems(item, index)
          })
        }
      </Dropdown>
    )
  }
}
