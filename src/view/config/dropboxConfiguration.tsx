import React, { Component } from "react";
import { Text, Label, RadioButton } from "@kintone/kintone-ui-component";
import { Dropbox } from "dropbox"; // eslint-disable-line no-unused-vars
import { find, forEach, tail, reverse } from "lodash";
import Select from "react-select";

import { setStateAsync } from "../../utils/stateHelper";
import Fields from "../../utils/Fields";
import MultipleLevelSelect from "../../components/multipleLevelSelect";

import {
  showNotificationError,
  showNotificationSuccess,
} from "../../utils/notifications";
import {
  getRootConfigurationRecord,
  updateConfigurationRecord,
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
    this.validateDropboxAccessToken =
      this.validateDropboxAccessToken.bind(this);
    this.handleClickValidateAcessToken =
      this.handleClickValidateAcessToken.bind(this);
    this.handleChangeMember = this.handleChangeMember.bind(this);
    this.handleLogicsAfterMounted = this.handleLogicsAfterMounted.bind(this);

    this.state = {
      selectedFolders: [],
      accessToken: "",
      refreshToken: "",
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
      selectedFolderPathLower: "",
      selectedNamespaceId: "",
      selectedNamespaceName: "",
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
        },
      ],
    };
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  async handleClickSaveButton() {
    const {
      accessToken,
      refreshToken,
      selectedField,
      isBusinessAccount,
      selectedFolderId,
      dropboxAppKey,
      dropbox_configuration_app_id,
      folderName,
    } = this.state;
    this.setState({ isBlockUI: true });

    try {
      if (
        dropboxAppKey === "" ||
        dropbox_configuration_app_id === "" ||
        selectedField === "" ||
        folderName == ""
      ) {
        showNotificationError("All fields are requied!");
      } else {
        // if not business account
        if (isBusinessAccount) {
          await businessAccHelper.saveConfigurations(
            this.state,
            this.props.setPluginConfig,
            this.props.config,
            this.dbx
          );
        } else {
          await individualAccHelper.saveConfigurations(
            this.state,
            this.props.setPluginConfig,
            this.props.config,
            this.dbx
          );
        }
        showNotificationSuccess("Configurations has been saved successfully!");
      }
      this.setState({ isBlockUI: false });
    } catch (error) {
      this.setState({ isBlockUI: false });
    }
  }

  async validateDropboxAccessToken() {
    const configRefeshtoken = this.props.config.refreshToken;
    const { accessToken, refreshToken, dropboxAppKey } = this.state;
    const result: any = await validateDropboxToken(
      accessToken,
      !!configRefeshtoken ? configRefeshtoken : refreshToken,
      dropboxAppKey
    );
    if (result["status"] == "invalidKey") {
      showNotificationError("Invalid access token, please generate a new one.");
    } else if (result["status"] == "unauthorized") {
      showNotificationError("Invalid access token, please generate a new one.");
    } else if (result["status"] == "appPermissionError") {
      await setStateAsync(
        {
          isValidAccessToken: false,
        },
        this
      );
    } else if (result["status"] == "businessAccount") {
      await setStateAsync(
        {
          isBusinessAccount: true,
          isValidAccessToken: true,
        },
        this
      );
    } else if (result["status"] == "individualAccount") {
      await setStateAsync(
        {
          isBusinessAccount: false,
          isValidAccessToken: true,
        },
        this
      );
    }
  }

  async handleChangeMember(member: any) {
    const configRefeshtoken = this.props.config.refreshToken;
    const { accessToken, refreshToken, dropboxAppKey } = this.state;
    this.setState({ isBlockUI: true });

    const existingFoldersList = await businessAccHelper.getExistingFoldersList(
      member.value,
      accessToken,
      !!configRefeshtoken ? configRefeshtoken : refreshToken,
      dropboxAppKey
    );

    this.setState({
      memberId: `${member.value}`,
      existingFoldersList: existingFoldersList,
      isBlockUI: false,
    });
  }

  async handleClickValidateAcessToken() {
    const { dropboxAppKey, isBusinessAccount, dropbox_configuration_app_id } =
      this.state;
    if (dropboxAppKey === "" || dropbox_configuration_app_id === "") {
      showNotificationError(
        "Dropbox App Key and Dropbox information app ID are requied!"
      );
    } else {
      // if not business account
      this.props.setPluginConfig(
        {
          accessToken: "",
          refreshToken: "",
          createOrSelectExistingFolder: "",
          dropboxAppKey: dropboxAppKey,
          dropbox_configuration_app_id: dropbox_configuration_app_id,
          folderName: "",
          isBusinessAccount: "",
          isValidAccessToken: "",
          selectedField: "",
          selectedFolderId: "",
          selectedFolderPathLower: "",
        },
        () => {}
      );
      const dbx = new Dropbox({ clientId: dropboxAppKey });
      const authUrl = await dbx.auth.getAuthenticationUrl(
        window.location.href,
        null,
        "code",
        "offline",
        null,
        "none",
        true
      );

      window.sessionStorage.clear();
      window.sessionStorage.setItem("codeVerifier", dbx.auth.codeVerifier);
      window.sessionStorage.setItem("clientid", dbx.auth.dropboxAppKey);
      window.location.href = authUrl;
    }
  }

  async handleLogicsAfterMounted() {
    // Get Root Folder
    const configRefeshtoken = this.props.config.refreshToken;
    const {
      dropbox_configuration_app_id,
      accessToken,
      selectedFolderId,
      refreshToken,
      dropboxAppKey,
    } = await this.state;

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

    await this.handleLogicsForValidateAccessToken();

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
        this.dbx,
        accessToken,
        this.state.memberId,
        dropboxFolderId,
        !!configRefeshtoken ? configRefeshtoken : refreshToken,
        dropboxAppKey
      );
    } else {
      metadataResponse = await individualAccHelper.getSelectedDropboxFolder(
        this.dbx,
        dropboxFolderId
      );
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

    await updateConfigurationRecord(
      dropbox_configuration_app_id,
      configurationRecord["$id"].value,
      {
        root_folder_name: { value: metadataResponse.result.name },
      }
    );
  }

  async handleLogicsForValidateAccessToken() {
    const configRefeshtoken = this.props.config.refreshToken;
    const { accessToken, memberId, refreshToken, dropboxAppKey } = this.state;
    await this.validateDropboxAccessToken();

    if (!this.state.isValidAccessToken) {
      return;
    }

    this.dbx = new Dropbox({
      accessToken: accessToken,
      refreshToken: !!configRefeshtoken ? configRefeshtoken : refreshToken,
      clientId: dropboxAppKey,
    });
    await this.dbx.auth.checkAndRefreshAccessToken();
    if (this.state.isBusinessAccount) {
      const membersList = await businessAccHelper.getTeamMembers(
        this.dbx,
        accessToken
      );
      await setStateAsync(
        {
          membersList: membersList,
        },
        this
      );

      if (!!memberId) {
        const listFolders = await businessAccHelper.getExistingFoldersList(
          memberId,
          accessToken,
          !!configRefeshtoken ? configRefeshtoken : refreshToken,
          dropboxAppKey
        );

        await setStateAsync(
          {
            existingFoldersList: listFolders,
          },
          this
        );
      }
    } else {
      const listFolders = await individualAccHelper.getExistingFoldersList(
        this.dbx
      );

      await setStateAsync(
        {
          existingFoldersList: listFolders,
        },
        this
      );
    }
  }

  async getAcessTokenFromToCode() {
    const { dropboxAppKey } = this.state;
    this.dbx = new Dropbox({ clientId: dropboxAppKey });
    this.dbx.auth.setCodeVerifier(
      window.sessionStorage.getItem("codeVerifier")
    );
    const urlParams = new URLSearchParams(window.location.search);
    const dropboxAuthCode = urlParams.get("code");
    if (!dropboxAuthCode) {
      return;
    }

    let response = {};
    try {
      response = await this.dbx.auth.getAccessTokenFromCode(
        window.location.href,
        dropboxAuthCode
      );
    } catch {
      // In case the code already used and then user is trying to reload, then that code cannot be used anymore. this case Dropbox will return 400
      window.location.replace(`?pluginId=${urlParams.get("pluginId")}`);
    }
    if (response.status === 200) {
      const {
        result: { access_token, refresh_token },
      } = response;
      await this.dbx.auth.checkAndRefreshAccessToken();
      this.setState({ accessToken: access_token, refreshToken: refresh_token });
    }
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
    this.setState(
      {
        accessToken: this.props.accessToken || "",
        selectedField: this.props.selectedField || "",
        dropbox_configuration_app_id:
          this.props.dropbox_configuration_app_id || "",
        folderName: this.props.folderName || "",
        selectedFolderId: this.props.selectedFolderId || "",
        selectedFolderPathLower: this.props.selectedFolderPathLower || "",
        selectedNamespaceId: this.props.selectedNamespaceId || "",
        selectedNamespaceName: this.props.selectedNamespaceName || "",
        createOrSelectExistingFolder:
          this.props.createOrSelectExistingFolder || "",
        dropboxAppKey: this.props.dropboxAppKey || "",
        memberId: this.props.memberId || "",
        formFields: formFields,
        isValidAccessToken: false,
        existingFoldersList: [],
        membersList: [],
        isBusinessAccount: false,
      },
      async () => {
        this.setState({ isBlockUI: true });
        await this.getAcessTokenFromToCode();
        await this.handleLogicsAfterMounted();
        this.setState({ isBlockUI: false });
      }
    );
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
      selectedNamespaceName,
      dropboxAppKey,
      isBlockUI,
    } = this.state;

    let { selectedFolderPathLower } = this.state;

    return (
      <div>
        <Loading isVisible={isBlockUI} />

        <div className="tab-content">
          <div>
            <div className="kintoneplugin-row kintoneplugin-flex ">
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
              <div>
                <button
                  className="kintoneplugin-button-dialog-cancel btn-get-members"
                  onClick={this.handleClickValidateAcessToken}
                >
                  Re-authenticate dropbox
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
                    onChange={(value) => {
                      // Note: On change the dropbox name in config, the selected path must be changed as well.
                      let pathLowerItems = (
                        selectedFolderPathLower || ""
                      ).split("/");
                      // input ["", "aaacc1", "test 3"]
                      pathLowerItems = tail(pathLowerItems);
                      pathLowerItems = reverse(pathLowerItems);
                      pathLowerItems = tail(pathLowerItems);
                      pathLowerItems = reverse(pathLowerItems);
                      // output ["aaacc1"]
                      pathLowerItems.push(value);
                      selectedFolderPathLower = `/${pathLowerItems.join("/")}`;

                      this.setState({
                        folderName: value,
                        selectedFolderPathLower: selectedFolderPathLower,
                      });
                    }}
                    className="kintoneplugin-input-text"
                  />
                </div>
              ) : createOrSelectExistingFolder === "select" ||
                isBusinessAccount ? (
                <div className="input-config full-width">
                  <MultipleLevelSelect
                    setDropboxFolder={(item) => {
                      this.setState({
                        selectedNamespaceId: item.namespaceId,
                        selectedNamespaceName: item.namespaceName,
                        folderName: item.label,
                        selectedFolderPathLower: item.pathLower,
                        selectedFolderId: item.folderId,
                      });
                    }}
                    selectedFolderPathLower={selectedFolderPathLower}
                    selectedNamespaceName={selectedNamespaceName}
                    memberId={memberId}
                    isBusinessAccount={isBusinessAccount}
                    dbx={this.dbx}
                    folderName={folderName}
                    selectedFolderId={selectedFolderId}
                    parentFolders={existingFoldersList}
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
              ) : null}
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
              onClick={this.handleClickSaveButton}
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
