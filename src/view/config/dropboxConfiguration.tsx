import React, { Component } from "react";
import {
  Text,
  Label,
  Dropdown,
  RadioButton,
  Dialog
} from "@kintone/kintone-ui-component";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { find } from "lodash";
import Select from "react-select";

import { showNotificationError } from "../../utils/notifications";
import {
  getRootConfigurationRecord,
  updateRootRecord,
  addRootRecord,
  addChildFolderRecord,
  getConfigurationRecordsByTargetAppRecordId,
  deleteAllConfigurationRecordsBy,
  getConfigurationRecord,
} from "../../utils/recordsHelper";
import "./style.sass";
import { validateDropboxToken } from "../../utils/dropboxAccessTokenValidation";
import Loading from "../../components/loading";
import { saveConfigsForIndividualAccount } from "./helper/individualAccountHelper";
import { getExistingFoldersList, getTeamMembers, saveConfigsForBusinessAccount } from "./helper/businessAccountHelper";

const ROOT_FOLDER = "";
export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props);
    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.handleGetMembers = this.handleGetMembers.bind(this);
    this.validateAccessToken = this.validateAccessToken.bind(this);
    this.handleChangeMember = this.handleChangeMember.bind(this);
    this.saveConfigurationsForIndividualAccount = this.saveConfigurationsForIndividualAccount.bind(this);
    this.saveConfigurationsForBusinessAccount =
      this.saveConfigurationsForBusinessAccount.bind(this);

    const chooseFolderMethods = [
      {
        label: "Input folder name",
        value: "input",
        isDisabled: false,
      },
      {
        label: "Select an existing folder",
        value: "select",
        isDisabled: false,
      },
    ];

    this.dbx = null;
    this.state = {
      accessToken: props.accessToken,
      dropboxAppKey: props.dropboxAppKey,
      folderName: props.folderName,
      dropbox_configuration_app_id: props.dropbox_configuration_app_id,
      selectedField: props.selectedField,
      membersList: [],
      memberId: props.memberId,
      isDropboxBusinessAPI: false,
      hasBeenValidated: !!props.accessToken,
      chooseFolderMethods: chooseFolderMethods,
      chooseFolderMethod: props.chooseFolderMethod || "input",
      existingFoldersList: [],
      selectedFolderId: props.selectedFolderId,
      isBlockUI: false,
    };
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  async saveConfigurationsForBusinessAccount() {
    this.setState({ isBlockUI: true });

    await saveConfigsForBusinessAccount({...this.state}, this.props.setPluginConfig)

    this.setState({ isBlockUI: false });
  }

  async saveConfigurationsForIndividualAccount() {
    this.setState({ isBlockUI: true });
    try {
      await saveConfigsForIndividualAccount({...this.state}, this.props.setPluginConfig, ROOT_FOLDER, this.props.folderName, this.dbx);

      this.setState({ isBlockUI: false });
    } catch (error) {
      this.setState({ isBlockUI: false });
    }
  }

  async handleClickSaveButton() {
    const {
      accessToken,
      hasBeenValidated,
      selectedField,
      isDropboxBusinessAPI,
    } = this.state;

    if (accessToken === "" || selectedField === "") {
      showNotificationError("All fields are requied!");
    } else {
      // if not business account
      if (hasBeenValidated && !isDropboxBusinessAPI) {
        await this.saveConfigurationsForIndividualAccount();
      } else if (hasBeenValidated && isDropboxBusinessAPI) {
        await this.saveConfigurationsForBusinessAccount();
      }
    }
  }

  async validateAccessToken() {
    let { accessToken, memberId } = this.state;
    this.setState({ isBlockUI: true });
    try {
      const result = await validateDropboxToken(accessToken);
      this.dbx = result["dbx"];

      if (result["status"] == "invalidKey") {
        showNotificationError(
          "Invalid access token, please generate a new one."
        );
      } else if (result["status"] == "unauthorized") {
        showNotificationError(
          "Invalid access token, please generate a new one."
        );
      } else if (result["status"] == "businessAccount") {
        // showNotificationError("Currently this plugin doesn't support business account, because Dropbox Api doesn't support creating a folder inside team folder.")
        const memberList = await this.handleGetMembers();
        const currentMember = find(memberList, { value: memberId });
        if(!!currentMember) {
          await this.handleChangeMember(currentMember);
        }
      } else if (result["status"] == "individualAccount") {
        // logic for individualAccount if needed
        const filesListFolderResponse = await this.dbx.filesListFolder({
          path: "",
        });
        const {
          result: { entries },
        } = filesListFolderResponse;
        const listFolders = entries
          .filter((e) => {
            return e[".tag"] == "folder";
          })
          .map((e) => {
            return {
              label: e.name,
              value: e.id,
            };
          });

        this.setState({
          hasBeenValidated: true,
          existingFoldersList: listFolders,
        });
      } else if (result["status"] == "appPermissionError") {
        showNotificationError(
          "Please check app permission and generate a new access token."
        );
      }
      this.setState({ isBlockUI: false });
    } catch (error) {
      this.setState({ isBlockUI: false });
    }
  }

  async handleChangeMember(member: any) {
    const { accessToken } = this.state;
    this.setState({ isBlockUI: true });

    const existingFoldersList = await getExistingFoldersList(member, accessToken);

    this.setState({
      memberId: `${member.value}`,
      existingFoldersList: existingFoldersList,
      isBlockUI: false
    });
  }

  async handleGetMembers() {
    const { accessToken } = this.state;
    this.setState({ isBlockUI: true });

    const membersList = await getTeamMembers(this.dbx, accessToken);

    this.setState({
      membersList: membersList,
      isDropboxBusinessAPI: true,
      hasBeenValidated: true,
      isBlockUI: false,
    });

    return membersList;
  }

  UNSAFE_componentWillMount() {
    (async () => {
      // Get Root Folder
      const { dropbox_configuration_app_id, accessToken } = this.props;

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

      if (!configurationRecord) {
        // this mean first setup plugin
        return;
      }

      await this.validateAccessToken(accessToken);

      this.dbx = new Dropbox({ accessToken: accessToken });
      const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
      const metadataResponse = await this.dbx
        .filesGetMetadata({ path: dropboxFolderId })
        .catch((error: any) => {
          return {
            errorCode: "notFoundFolderOnDropbox",
          };
        });

      if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
        // need to re-create folder here, because it was deleted on drobox
        return;
      }

      let newState = {
        folderName: metadataResponse.result.name,
      };
      let selectFolder = find(this.state.existingFoldersList, {
        value: dropboxFolderId,
      });
      if (!!selectFolder) {
        newState["selectedFolderId"] = selectFolder.value;
      }
      this.setState(newState);
      updateRootRecord(
        dropbox_configuration_app_id,
        configurationRecord["$id"].value,
        {
          root_folder_name: { value: metadataResponse.result.name },
        }
      );
    })();
  }

  render() {
    const { formFields } = this.props;

    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
      membersList,
      memberId,
      isDropboxBusinessAPI,
      hasBeenValidated,
      chooseFolderMethods,
      chooseFolderMethod,
      existingFoldersList,
      selectedFolderId,
      isBlockUI,
      dropboxAppKey,
    } = this.state;

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
                    onChange={(value) => this.setState({ accessToken: value })}
                    className="kintoneplugin-input-text"
                  />
                </div>
              </div>
              <div>
                <button
                  className="kintoneplugin-button-dialog-cancel btn-get-members"
                  onClick={this.validateAccessToken}
                >
                  Validate access token
                </button>
              </div>
            </div>

            {isDropboxBusinessAPI && (
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
              <Label text="Root folder name" isRequired={false} />
              <RadioButton
                name="chooseFolderMethods"
                items={!isDropboxBusinessAPI
                  ? chooseFolderMethods
                  : [{
                    label: "Select an existing folder",
                    value: "select",
                  }]
                }
                value={chooseFolderMethod}
                onChange={(value) => {
                  this.setState({ chooseFolderMethod: value });
                }}
              />

              {chooseFolderMethod === "input" ? (
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
                    onChange={(value) =>{
                      console.log(value)
                      this.setState({
                        folderName: value.label,
                        selectedFolderId: value.value,
                      })
                    }}
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
                !hasBeenValidated ? "disabled" : ""
              }`}
              onClick={!hasBeenValidated ? null : this.handleClickSaveButton}
            >
              Save
            </button>
            {!hasBeenValidated && (
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
