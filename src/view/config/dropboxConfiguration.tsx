import React, { Component } from "react";
import {
  Text,
  Label,
  Dropdown,
  RadioButton,
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

const ROOT_FOLDER = "";
export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props);
    this.findOrCreateRootFolder = this.findOrCreateRootFolder.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.handleGetMembers = this.handleGetMembers.bind(this);
    this.validateAccessToken = this.validateAccessToken.bind(this);
    this.handleChangeMember = this.handleChangeMember.bind(this);
    this.saveConfigurationsForIndividualAccount =
      this.saveConfigurationsForIndividualAccount.bind(this);
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

  async saveConfigurationsForIndividualAccount() {
    try {
      const {
        accessToken,
        folderName,
        selectedField,
        dropbox_configuration_app_id,
        selectedFolderId,
        chooseFolderMethod,
        dropboxAppKey,
      } = this.state;

      this.setState({ isBlockUI: true });

      const createFolderResponse = await this.findOrCreateRootFolder();
      const restClient = new KintoneRestAPIClient();

      if (!!createFolderResponse["errorCode"]) {
        return;
      }

      const config = {
        accessToken: accessToken,
        dropboxAppKey: dropboxAppKey,
        selectedField: selectedField,
        folderName: folderName,
        dropbox_configuration_app_id: dropbox_configuration_app_id,
        chooseFolderMethod: chooseFolderMethod,
      };
      if (!!selectedFolderId) {
        config["selectedFolderId"] = selectedFolderId;
      }
      this.props.setPluginConfig(config);

      let recordIds: any = [];
      if (createFolderResponse["actionType"] == "create") {
        // if create configuration for the record which is already had dropbox folder
        const existingFolderOnDropbox = await this.dbx.filesListFolder({
          path: createFolderResponse["path"],
        });

        existingFolderOnDropbox.result.entries.map(async (entry) => {
          if (!isNaN(parseInt(entry.name))) {
            const cRecord = await getConfigurationRecord(
              dropbox_configuration_app_id,
              entry.name
            );
            if (!!cRecord && !!cRecord["id"]) {
              recordIds.push(parseInt(entry.name));
              // Add configuration record fold child folder already presented on dropbox
              await addChildFolderRecord(
                dropbox_configuration_app_id,
                folderName,
                entry.id,
                entry.name,
                entry.name
              );
            }
          }
        });
      }

      let records;
      if (recordIds.length > 0) {
        records = await restClient.record.getAllRecords({
          app: kintone.app.getId(),
          condition: `$id not in (${recordIds.join(",")})`,
        });
      } else {
        records = await restClient.record.getAllRecords({
          app: kintone.app.getId(),
        });
      }

      // only create folder records, which havent had folder yet.
      const childFolders = records.map((record) => {
        return {
          id: record["$id"].value,
          name: `${record[selectedField].value || ""}[${record["$id"].value}]`,
        };
      });

      const childFolderPaths = childFolders.map((folder) => {
        return `${createFolderResponse["path"]}/${folder.name}`;
      });

      if (createFolderResponse["actionType"] == "create") {
        await this.dbx.filesCreateFolderBatch({ paths: childFolderPaths });
        // Retrieve all folder in this root path for finding and creating configuration record.
        // if we use the response from filesCreateFolderBatch then cannot get folder name if failed on creation
        const filesListFolderResponse = await this.dbx.filesListFolder({
          path: createFolderResponse["path"],
        });

        await Promise.all(
          filesListFolderResponse.result.entries.map(async (entry) => {
            const folderRecord = find(childFolders, { name: entry.name });
            if (!!folderRecord) {
              await addChildFolderRecord(
                dropbox_configuration_app_id,
                folderName,
                entry.id,
                folderRecord.id,
                entry.name
              );
            }
          })
        );
      }
      this.setState({ isBlockUI: false });
    } catch (error) {
      this.setState({ isBlockUI: false });
    }
  }

  async saveConfigurationsForBusinessAccount() {
    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
      memberId,
    } = this.state;

    // const createFolderResponse = await this.findOrCreateRootFolder();
    if (!!createFolderResponse["errorCode"]) {
      return;
    }

    // this.props.setPluginConfig({
    //   accessToken: accessToken,
    //   selectedField: selectedField,
    //   dropbox_configuration_app_id: dropbox_configuration_app_id,
    //   memberId: memberId,
    // });

    // this.dbx = new Dropbox({
    //   accessToken: "50EQzhL1y0kAAAAAAAAAAWA6KW6L0bugYoG10wUyiWNt",
    //   selectUser: "dbid:AABdu4VJaEsz3rIdTVqlM4bRhDWRk5e5JK8",
    // });
    // this.dbx.sharingShareFolder({
    //   path: 'minh_test1'
    // })
    // console.log("createFolderResponse", createFolderResponse)
    // let recordIds: any = [];
    // const restClient = new KintoneRestAPIClient();
    // const records = await restClient.record.getAllRecords({
    //   app: kintone.app.getId(),
    //   condition: `$id not in (${recordIds.join(",")})`,
    // });

  }

  async handleClickSaveButton() {
    const {
      accessToken,
      hasBeenValidated,
      selectedField,
      isDropboxBusinessAPI,
    } = this.state;

    // if (accessToken === "" || selectedField === "") {
    //   showNotificationError("All fields are requied!");
    // } else {
    //   // if not business account
    //   if (hasBeenValidated && !isDropboxBusinessAPI) {
    //     this.saveConfigurationsForIndividualAccount();
    //   } else if (hasBeenValidated && isDropboxBusinessAPI) {
    //     // this.saveConfigurationsForBusinessAccount();
    //   }
    // }

    this.dbx = new Dropbox({
      // accessToken: "CFZfmbl3QhIAAAAAAAAAAbk5WEQZuznUfQIMRILOmonwmeRogeevOH3nmfGmUTaI",
      accessToken: "CFZfmbl3QhIAAAAAAAAAAbk5WEQZuznUfQIMRILOmonwmeRogeevOH3nmfGmUTaI",
      selectUser: "dbmid:AAAvmCflrU_j54NC9yq-5sia_jLHOzFSiS8",
      pathRoot: `{".tag": "namespace_id", "namespace_id": "9692023760"}`,
      // selectAdmin: "dbmid:AAAvmCflrU_j54NC9yq-5sia_jLHOzFSiS8",
      // selectAdmin: "dbmid:AADfBeFJwtEHc0NmVBKW8ZQ9vfg-xH5Z530",
    });
    // const a = await this.dbx.sharingShareFolder({
    //   path: '/minh_test6',
    //   acl_update_policy: 'editors',
    //   force_async: false,
    //   member_policy: 'team',
    //   shared_link_policy: 'team',
    //   access_inheritance: 'inherit'
    // })

    const a = await  this.dbx.filesCreateFolderV2({
      path: '/minh_test6'
    })

    // const a = await this.dbx.teamTeamFolderCreate({
    //   name: 'testing 1/minh_testing1'
    // })
    console.log(a)
  }

  async findOrCreateRootFolder() {
    const {
      folderName,
      dropbox_configuration_app_id,
      accessToken,
      isDropboxBusinessAPI,
      hasBeenValidated,
      selectedFolderId,
      chooseFolderMethod,
    } = this.state;
    const configurationRecord = await getRootConfigurationRecord(
      dropbox_configuration_app_id
    );

    if (
      chooseFolderMethod === "select" &&
      folderName !== this.props.folderName
    ) {
      const records = await getConfigurationRecordsByTargetAppRecordId(
        dropbox_configuration_app_id
      );
      if (!!records && records["errorCode"] == "invalidConfigurationAppId") {
        showNotificationError(
          "Please endter configuration app id in plugin setting!"
        );
        return {
          errorCode: "invalidConfigurationAppId",
        };
      }

      const recordIds = records.map((record) => {
        return record["$id"].value;
      });
      await deleteAllConfigurationRecordsBy(
        dropbox_configuration_app_id,
        recordIds
      );
    }

    if (!!configurationRecord && !!configurationRecord["errorCode"]) {
      // this mean wrong dropbox_configuration_app_id

      showNotificationError(configurationRecord["message"]);
      return {
        errorCode: configurationRecord["errorCode"],
      };
    }

    let authResponse;
    if (hasBeenValidated && !isDropboxBusinessAPI) {
      this.dbx = new Dropbox({ accessToken: accessToken });
      authResponse = await this.dbx
        .filesListFolder({ path: "" })
        .catch((error) => {
          return {
            errorCode: "invalidDropboxAccessToken",
          };
        });
    } else if (hasBeenValidated && isDropboxBusinessAPI) {
      authResponse = await this.dbx.sharingListFolders().catch((error) => {
        return {
          errorCode: "invalidDropboxAccessToken",
        };
      });
    }

    if (authResponse["errorCode"] == "invalidDropboxAccessToken") {
      showNotificationError("Please enter correct Dropbox access token");
      return {
        errorCode: authResponse["errorCode"],
      };
    }

    if (chooseFolderMethod === "select") {
      console.log("Action select existing folder");
      const { selectedFolderId, folderName } = this.state;
      const rootPath = `${ROOT_FOLDER}/${folderName}`;
      await addRootRecord(
        dropbox_configuration_app_id,
        folderName,
        selectedFolderId
      );

      return {
        actionType: "create",
        path: rootPath,
      };
    } else if (!!configurationRecord) {
      // need to update folder name
      console.log("Action Update");

      const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
      let metadataResponse = await this.dbx
        .filesGetMetadata({ path: dropboxFolderId })
        .catch((error) => {
          return {
            errorCode: "notFoundFolderOnDropbox",
          };
        });

      if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
        // need to re-create folder here, because it was deleted on drobox
        const folderResponse = await this.dbx.filesCreateFolderV2({
          path: `${ROOT_FOLDER}/${folderName}`,
        });

        await updateRootRecord(
          dropbox_configuration_app_id,
          configurationRecord["$id"].value,
          {
            root_folder_name: { value: folderName },
            dropbox_folder_id: { value: folderResponse.result.metadata.id },
          }
        );

        return {
          actionType: "edit",
          path: `${ROOT_FOLDER}/${folderName}`,
        };
      } else if (folderName != metadataResponse.result.name) {
        const currentRootPath = `${ROOT_FOLDER}/${metadataResponse.result.name}`;
        const newRootPath = `${ROOT_FOLDER}/${folderName}`;

        const filesMoveResponse = await this.dbx
          .filesMoveV2({ from_path: currentRootPath, to_path: newRootPath })
          .catch((error: any) => {
            return {
              errorCode: "invalidNewName",
            };
          });

        if (filesMoveResponse["errorCode"] == "invalidNewName") {
          showNotificationError(
            "Invalid name, it might be duplicated with other folder"
          );
          return {
            errorCode: authResponse["errorCode"],
          };
        }

        updateRootRecord(
          dropbox_configuration_app_id,
          configurationRecord["$id"].value,
          {
            root_folder_name: { value: filesMoveResponse.result.metadata.name },
          }
        );

        console.log("Updated folder");

        return {
          actionType: "edit",
          path: newRootPath,
        };
      } else {
        return {
          actionType: "edit",
          path: `${ROOT_FOLDER}/${metadataResponse.result.name}`,
        };
      }
    } else {
      // Need to create new folder
      console.log("Action Create");

      const rootPath = `${ROOT_FOLDER}/${folderName}`;

      const metadataResponse = await this.dbx
        .sharingGetFolderMetadata({ shared_folder_id: selectedFolderId })
        .catch((error) => {
          return {
            errorCode: "notFoundFolderOnDropbox",
          };
        });

      let createFolderResponse, folderId;
      if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
        createFolderResponse = await this.dbx
          .filesCreateFolderV2({ path: rootPath })
          .catch((error: any) => {
            return {
              errorCode: "invalidFolderName",
            };
          });

        console.log("createFolderResponse", createFolderResponse);

        if (createFolderResponse["errorCode"] == "invalidFolderName") {
          showNotificationError(
            "Cannot create folder, please check the folder name. It might be duplicated!"
          );
          return {
            errorCode: createFolderResponse["errorCode"],
          };
        }

        folderId = createFolderResponse.result.metadata.id;
      } else {
        folderId = metadataResponse.result.id;
      }

      await addRootRecord(dropbox_configuration_app_id, folderName, folderId);

      console.log("Created folder");

      return {
        actionType: "create",
        path: rootPath,
      };
    }
  }

  async validateAccessToken() {
    let { accessToken } = this.state;
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
        this.handleGetMembers();
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
    let { accessToken, existingFoldersList } = this.state;
    this.dbx = new Dropbox({
      accessToken: accessToken,
      selectUser: member.value,
    });
    const sharingListFolders = await this.dbx.sharingListFolders({
      actions: ["edit_contents"],
    });

    console.log(sharingListFolders); // This is for debugging later

    existingFoldersList = sharingListFolders.result.entries
      .filter((entry: any) => {
        return entry.is_inside_team_folder;
      })
      .map((entry: any) => {
        return { label: entry.name, value: entry.shared_folder_id };
      });

    this.setState({
      memberId: `${member.value}`,
      existingFoldersList: existingFoldersList,
    });
  }

  async handleGetMembers() {
    const { accessToken, membersList } = this.state;
    if (accessToken == "") {
      showNotificationError("Please enter access token");
      return;
    }

    // get team members
    const teamMemberListResponse = await this.dbx.teamMembersListV2({
      limit: 1000,
      include_removed: false,
    });

    console.log(teamMemberListResponse);

    const {
      result: { members },
    } = teamMemberListResponse;
    members.forEach((member) => {
      const param = {
        label: `${member.profile.name.display_name}<${member.profile.email}>`,
        value: member.profile.team_member_id,
      };
      membersList.push(param);
    });

    this.setState({
      membersList: membersList,
      isDropboxBusinessAPI: true,
      hasBeenValidated: true,
    });
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

      this.dbx = new Dropbox({ accessToken: accessToken });
      const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
      const metadataResponse = await this.dbx
        .filesGetMetadata({ path: dropboxFolderId })
        .catch((error: any) => {
          return {
            errorCode: "notFoundFolderOnDropbox",
          };
        });

      console.log("metadataResponse", metadataResponse);

      if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
        // need to re-create folder here, because it was deleted on drobox
        return;
      }

      await this.validateAccessToken(accessToken);

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
                    value={memberId}
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
                items={chooseFolderMethods}
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
                    onChange={(value) =>
                      this.setState({
                        folderName: value.label,
                        selectedFolderId: value.value,
                      })
                    }
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
