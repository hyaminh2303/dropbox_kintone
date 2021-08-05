import React, { Component } from "react";
import {
  Text,
  Label,
  RadioButton
} from "@kintone/kintone-ui-component";
import { Dropbox } from "dropbox"; // eslint-disable-line no-unused-vars
import { find, forEach, uniqueId } from "lodash";
import Select from "react-select";

import { setStateAsync } from "../../utils/stateHelper";
import Fields from "../../utils/Fields";
import MultipleLevelSelect from "../../components/multipleLevelSelect"

import { showNotificationError, showNotificationSuccess } from "../../utils/notifications";
import {
  getRootConfigurationRecord,
  updateRootRecord
} from "../../utils/recordsHelper";
import "./style.sass";
import { validateDropboxToken } from "../../utils/dropboxAccessTokenValidation";
import Loading from "../../components/loading";

import * as businessAccHelper from "./helper/businessAccountHelper";
import * as individualAccHelper from "./helper/individualAccountHelper";

const ROOT_FOLDER = "";
export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props);
    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.validateDropboxAccessToken = this.validateDropboxAccessToken.bind(this);
    this.handleLogicsForValidateAccessToken = this.handleLogicsForValidateAccessToken.bind(this);
    this.handleChangeMember = this.handleChangeMember.bind(this);
    this.handleLogicsAfterMounted = this.handleLogicsAfterMounted.bind(this);

    this.state = {
      selectedFolders:[],
      accessToken: "",
      dropboxAppKey: "",
      folderName: "",
      dropbox_configuration_app_id: "",
      selectedField: "",
      membersList: [],
      memberId: "",
      isValidAccessToken: false,
      createOrSelectExistingFolder: "",
      existingFoldersList: [],
      selectedFolderId: "",
      selectedNamespaceId: "",
      isBlockUI: false,
      isBusinessAccount: false,
      createOrSelectExistingFolderOptions: [
        {
          label: "Input folder name",
          value: "input",
          isDisabled: false,
        },
        {
          label: "Select an existing folder",
          value: "select",
          isDisabled: false,
        }
      ],
    };
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  async handleClickSaveButton() {
    const {
      accessToken,
      selectedField,
      isBusinessAccount,
      selectedFolderId,
      dropboxAppKey,
      dropbox_configuration_app_id,
      folderName
    } = this.state;

    this.setState({isBlockUI: true})

    try {
      if (
        accessToken === "" ||
        dropboxAppKey === "" ||
        dropbox_configuration_app_id === "" ||
        selectedField === "" ||
        folderName == "") {
        showNotificationError("All fields are requied!");
      } else {
        // if not business account
        if (isBusinessAccount) {
          await businessAccHelper.saveConfigurations(
            this.state,
            this.props.setPluginConfig,
            this.props.config,
            this.dbx
          )
        } else {
          await individualAccHelper.saveConfigurations(
            this.state,
            this.props.setPluginConfig,
            this.props.config,
            this.dbx
          )
        }
        showNotificationSuccess("Configurations has been saved successfully!")
      }
      this.setState({isBlockUI: false})
    } catch (error) {
      this.setState({isBlockUI: false})
    }
  }

  async validateDropboxAccessToken() {
    const { accessToken } = this.state;
    const result: any = await validateDropboxToken(accessToken);

    if (result["status"] == "invalidKey") {
      showNotificationError(
        "Invalid access token, please generate a new one."
      );
    } else if (result["status"] == "unauthorized") {
      showNotificationError(
        "Invalid access token, please generate a new one."
      );
    } else if (result["status"] == "appPermissionError") {
      await setStateAsync({
        isValidAccessToken: false
      }, this);
    } else if (result["status"] == "businessAccount") {
      await setStateAsync({
        isBusinessAccount: true,
        isValidAccessToken: true
      }, this);
    } else if (result["status"] == "individualAccount") {
      await setStateAsync({
        isBusinessAccount: false,
        isValidAccessToken: true
      }, this);
    }
  }

  async handleChangeMember(member: any) {
    const { accessToken } = this.state;
    this.setState({ isBlockUI: true });

    const existingFoldersList = await businessAccHelper.getExistingFoldersList(
      member.value,
      accessToken
    );

    this.setState({
      memberId: `${member.value}`,
      existingFoldersList: existingFoldersList,
      isBlockUI: false,
    });
  }

  async handleLogicsForValidateAccessToken() {
    const { accessToken, memberId } = this.state;
    await this.validateDropboxAccessToken();

    if (!this.state.isValidAccessToken) {
      return;
    }

    this.dbx = new Dropbox({ accessToken: accessToken });

    if (this.state.isBusinessAccount) {
      const membersList = await businessAccHelper.getTeamMembers(this.dbx, accessToken);
      await setStateAsync({
        membersList: membersList
      }, this)

      if (!!memberId) {
        const listFolders = await businessAccHelper.getExistingFoldersList(
          memberId, accessToken
        );

        await setStateAsync({
          existingFoldersList: listFolders
        }, this);
      }
    } else {
      const listFolders = await individualAccHelper.getExistingFoldersList(this.dbx);

      await setStateAsync({
        existingFoldersList: listFolders
      }, this)
    }
  }

  async handleLogicsAfterMounted() {
    // Get Root Folder
    const { dropbox_configuration_app_id, accessToken, selectedFolderId } = this.state;

    if (!accessToken && !dropbox_configuration_app_id) {
      return;
    }

    const configurationRecord = await getRootConfigurationRecord(
      dropbox_configuration_app_id
    );

    if (!!configurationRecord && !!configurationRecord["errorCode"]) {
      // this mean wrong dropbox_configuration_app_id
      showNotificationError("Please enter correct configuration app id!");
      return;
    }

    await this.handleLogicsForValidateAccessToken()

    if (!configurationRecord) {

      // this mean never finished setup before
      return;
    }

    if (!selectedFolderId) {
      // this means user didnt select dropbox folder
      return;
    }

    if (!this.state.isValidAccessToken) {
      // the access token is not valid
      return;
    }

    const dropboxFolderId = configurationRecord.dropbox_folder_id.value;

    let metadataResponse: any;
    if (this.state.isBusinessAccount) {
      metadataResponse = await businessAccHelper.getSelectedDropboxFolder(
        this.dbx, accessToken, this.state.memberId, dropboxFolderId
      )
    } else {
      metadataResponse = await individualAccHelper.getSelectedDropboxFolder(this.dbx, dropboxFolderId)
    }

    if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
      // need to re-create folder here, because it was deleted on drobox
      return;
    }

    let newState: any = {
      folderName: metadataResponse.result.name,
    };

    let selectedFolder = find(this.state.existingFoldersList, {
      value: dropboxFolderId,
    });

    if (!!selectedFolder) {
      newState["selectedFolderId"] = selectedFolder.value;
    }

    this.setState(newState);

    await updateRootRecord(
      dropbox_configuration_app_id,
      configurationRecord["$id"].value,
      {
        root_folder_name: { value: metadataResponse.result.name },
      }
    );
  }

  UNSAFE_componentWillMount() {
    let formFields: any = [];

    forEach(Fields, (fieldConfig: any, fieldCode: string) => {
      if (fieldConfig.type == "SINGLE_LINE_TEXT") {
        formFields.push({
          label: fieldConfig.label,
          value: fieldCode,
        });
      }
    });

    this.setState({
      accessToken: this.props.accessToken || "",
      selectedField: this.props.selectedField || "",
      dropbox_configuration_app_id: this.props.dropbox_configuration_app_id || "",
      folderName: this.props.folderName || "",
      selectedFolderId: this.props.selectedFolderId || "",
      selectedNamespaceId: this.props.selectedNamespaceId || "",
      createOrSelectExistingFolder: this.props.createOrSelectExistingFolder || "",
      dropboxAppKey: this.props.dropboxAppKey || "",
      memberId: this.props.memberId || "",
      formFields: formFields,
      isValidAccessToken: false,
      existingFoldersList: [],
      membersList: [],
      isBusinessAccount: false,
    }, async () => {
      this.setState({isBlockUI: true})
      await this.handleLogicsAfterMounted()
      this.setState({isBlockUI: false})
    })
  }

  render() {
    const {
      formFields,
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
      membersList,
      memberId,
      isBusinessAccount,
      isValidAccessToken,
      createOrSelectExistingFolderOptions,
      createOrSelectExistingFolder,
      existingFoldersList,
      selectedFolderId,
      selectedNamespaceId,
      dropboxAppKey,
      isBlockUI,
    } = this.state;
    console.log(selectedNamespaceId)
    console.log(selectedNamespaceId)
    return (
      <div>
        <Loading isVisible={isBlockUI} />

        <div className="tab-content">
          <div>

            <div className="kintoneplugin-row kintoneplugin-flex">
              <div>
                <Label text="Dropbox App Key" isRequired={false} />
                <div className="input-config">
                  <Text
                    value={dropboxAppKey}
                    onChange={(value) =>
                      this.setState({ dropboxAppKey: value })
                    }
                    className="kintoneplugin-input-text"
                  />
                </div>
              </div>
            </div>

            <div className="kintoneplugin-row kintoneplugin-flex">
              <div>
                <Label text="Access token" isRequired={false} />
                <div className="input-config">
                  <Text
                    value={accessToken}
                    onChange={ (value) => this.setState({accessToken: value}) }
                    className="kintoneplugin-input-text"
                  />
                </div>
              </div>
              <div>
                <button
                  className="kintoneplugin-button-dialog-cancel btn-get-members"
                  onClick={this.handleLogicsForValidateAccessToken}
                >
                  Validate access token
                </button>
              </div>
            </div>

            {isBusinessAccount && (
              <div className="kintoneplugin-row">
                <Label text="Specified member to use the user endpoints" />
                <div className="input-config">
                  <Select
                    value={find(membersList, { value: memberId })}
                    options={membersList}
                    className="react-select-dropdown"
                    onChange={(value) => this.handleChangeMember(value)}
                  />
                </div>
              </div>
            )}

            <div className="kintoneplugin-row">
              <Label text="Dropbox information app ID" isRequired={false} />
              <div className="input-config">
                <Text
                  value={dropbox_configuration_app_id}
                  onChange={(value) =>
                    this.setState({ dropbox_configuration_app_id: value })
                  }
                  className="kintoneplugin-input-text"
                />
              </div>
            </div>

            <div className="kintoneplugin-row">
              <Label text="Root folder" isRequired={false} />
              {!isBusinessAccount && (
                <RadioButton
                  name="createOrSelectExistingFolderOptions"
                  items={createOrSelectExistingFolderOptions}
                  value={createOrSelectExistingFolder}
                  onChange={(value) => {
                    this.setState({ createOrSelectExistingFolder: value });
                  }}
                />
              )}

              {createOrSelectExistingFolder === "input" ? (
                <div className="input-config">
                  <Text
                    value={folderName}
                    onChange={(value) => this.setState({ folderName: value })}
                    className="kintoneplugin-input-text"
                  />
                </div>
              ) : (
                <div className="input-config">
                  <Select
                    options={existingFoldersList}
                    value={find(existingFoldersList, {
                      value: selectedFolderId,
                    })}
                    className="react-select-dropdown"
                    onChange={(value) => {
                      this.setState({
                        folderName: value.label,
                        selectedFolderId: value.value,
                      });
                    }}
                  />
                  <MultipleLevelSelect
                    setDropboxFolder={(item) => {
                      console.log(item)
                      this.setState({
                        selectedNamespaceId: item.namespaceId,
                        folderName: item.label,
                        selectedFolderId: item.folderId,
                      })
                    }}
                    folderName={folderName}
                    items={existingFoldersList}
                    // items={[
                    //   {
                    //     value: "asdasd",
                    //     space_id: "1",
                    //     label: "aaaaaa1",
                    //     children: [
                    //       {
                    //         value: "asdasd",
                    //         label: "aaaaaa2",
                    //         space_id: "1",
                    //         children: [
                    //           {
                    //             space_id: "1",
                    //             value: "asdasd",
                    //             label: "aaaaaa3"
                    //           }
                    //         ]
                    //       }
                    //     ]
                    //   }
                    // ]}
                  />
                  <div>
                    <i>
                      <small>
                        Do not select the folder that has been using in other
                        plugin.
                      </small>
                    </i>
                  </div>
                </div>
              )}
            </div>

            <div className="kintoneplugin-row">
              <Label text="Select field for folder name" />
              <div className="input-config">
                <Select
                  value={find(formFields, { value: selectedField })}
                  options={formFields}
                  className="react-select-dropdown"
                  onChange={(option) =>
                    this.setState({ selectedField: option.value })
                  }
                />
              </div>
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
              className={`kintoneplugin-button-dialog-ok btn-action ${
                !isValidAccessToken ? "disabled" : ""
              }`}
              onClick={isValidAccessToken ? this.handleClickSaveButton : null}
            >
              Save
            </button>

            {!isValidAccessToken && (
              <p className="notes">
                Please validate the access token before save *
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
}
