import React from "react";
import { Spinner } from "@kintone/kintone-ui-component";
import Dropdown from 'react-multilevel-dropdown';
import { uniqueId, forEach, map, filter, remove, clone, compact } from 'lodash';

import "./multipleLevelSelect.sass"

export default class MultipleLevelSelect extends React.Component {
  constructor(props) {
    super(props);
    this.renderChildrenItems = this.renderChildrenItems.bind(this);
    this.getChildFolders = this.getChildFolders.bind(this);
    this.getPathLower = this.getPathLower.bind(this);

    this.state = {
      folders: props.parentFolders,
      isShowSpinner: false
    }
    this.rawFolders = props.parentFolders;
  }

  renderChildrenItems(item, index) {
    if (item.children.length > 0) {
      return(
        <Dropdown.Item position="right" key={index} className="list-item">
          <div className="folder-name" onClick={() => this.getChildFolders(item)}>
            {item.label}
          </div>

          <div className="btn-set-folder" onClick={() => this.props.setDropboxFolder(item)}>
            Set
          </div>

          <Dropdown.Submenu position="right" className="items-wrapper">
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
        <Dropdown.Item position="right" key={index} className="list-item">
          <div className="folder-name" onClick={() => this.getChildFolders(item)}>
            {item.label}
          </div>

          <div className="btn-set-folder" onClick={() => this.props.setDropboxFolder(item)}>
            Set
          </div>
        </Dropdown.Item>
      )
    }
  }

  async getChildFolders(item) {
    this.setState({isShowSpinner: true})

    try {
      const { memberId, isBusinessAccount, dbx, parentFolders } = this.props;

      if (isBusinessAccount) {
        dbx.selectUser = `${memberId}`;
        dbx.pathRoot = `{".tag": "namespace_id", "namespace_id": "${item.namespaceId}"}`;
      }

      // Step 1: Get all folders by path
      const foldersResp = await dbx.filesListFolder({
        path: !!item.folderId ? item.folderId : "",
      });

      // Step 2: build folder structure
      let childrenfolders = filter(foldersResp.result.entries, { '.tag': 'folder' }).map((entry) => {
        return {
          label: entry.name,
          namespaceId: item.namespaceId,
          namespaceName: item.namespaceName,
          folderId: entry.id,
          pathLower: entry.path_lower,
          parentUniqueId: item.uniqueId,
          uniqueId: uniqueId()
        };
      });

      forEach(childrenfolders, (childFolder) => {
        // Step 3: remove old childFolder and then insert new one with new uniqueId
        remove(this.rawFolders, { folderId: childFolder.folderId })
        this.rawFolders.push(childFolder)
      })

      // define recurrent function to build children folder
      let buildChildrenFolderDepth = (parentFolder) => {
        let childrenFolders = filter(this.rawFolders, {
          parentUniqueId: parentFolder.uniqueId
        });

        parentFolder['children'] = childrenFolders;

        if (childrenFolders.length > 0) {
          map(childrenFolders, (folder) => {
            return buildChildrenFolderDepth(folder)
          })
        }
      }

      // Step 4: build children folder for parent folder, and then set state
      map(parentFolders, (parentFolder) => {
        return buildChildrenFolderDepth(parentFolder)
      })

      this.setState({folders: parentFolders})
      this.setState({isShowSpinner: false})
    } catch (error) {
      this.setState({isShowSpinner: false})
    }
  }

  getPathLower() {
    const { isBusinessAccount, folderName, selectedNamespaceName, selectedFolderPathLower } = this.props;
    if (!folderName) {
      return "Please select folder"
    }

    if (isBusinessAccount) {
      return compact([selectedNamespaceName, selectedFolderPathLower]).join("");
    } else {
      return selectedFolderPathLower;
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      folders: nextProps.parentFolders,
      latestFoldersList: nextProps.parentFolders
    })
    this.rawFolders = clone(nextProps.parentFolders);
  }

  render() {
    const { folderName, selectedFolderId } = this.props;
    const { folders } = this.state;
    console.log(this.props.selectedFolderPathLower)
    return(
      <React.Fragment>
        <Dropdown
          title={this.getPathLower()}
          position="right"
          menuClassName="items-wrapper"
        >
          {
            folders.map((item, index) => {
              return this.renderChildrenItems(item, index)
            })
          }
        </Dropdown>
      </React.Fragment>
    )
  }
}
