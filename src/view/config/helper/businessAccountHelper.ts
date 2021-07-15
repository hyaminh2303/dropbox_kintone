import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars
import { find } from 'lodash';

import { showNotificationError } from "../../../utils/notifications";
import {
  addChildFolderRecord,
  addRootRecord,
  deleteAllConfigurationRecordsBy,
  getConfigurationRecordsByTargetAppRecordId,
  getRootConfigurationRecord,
  updateRootRecord
} from "../../../utils/recordsHelper";

export const getTeamMembers = async (dbx: any, accessToken: string) => {
  if (accessToken == "") {
    showNotificationError("Please enter access token");
    return;
  }
  let membersList: any = [];

  // get team members
  const teamMemberListResponse = await dbx.teamMembersListV2({
    limit: 1000,
    include_removed: false,
  });

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

  return membersList;
}

export const getExistingFoldersList = async (member: any, accessToken: string) => {
  let dbx = new Dropbox({
    accessToken: accessToken,
    selectUser: member.value,
  });
  const sharingListFolders = await dbx.sharingListFolders({
    actions: ["edit_contents"],
  });

  let existingFoldersList = sharingListFolders.result.entries
  .filter((entry: any) => {
    return entry.is_inside_team_folder;
  })
  .map((entry: any) => {
    return { label: entry.name, value: entry.shared_folder_id };
  });

  return existingFoldersList;
}

export const saveConfigsForBusinessAccount = async (param: any, setPluginConfig: Function) => {
  const {
    accessToken,
    selectedField,
    dropbox_configuration_app_id,
    memberId,
    selectedFolderId,
    folderName
  } = param;
  let dbx = null;

  setPluginConfig({
    accessToken: accessToken,
    selectedField: selectedField,
    dropbox_configuration_app_id: dropbox_configuration_app_id,
    memberId: memberId,
    folderName: folderName,
    selectedFolderId: selectedFolderId
  });

  const restClient = new KintoneRestAPIClient();
  let records = await getConfigurationRecordsByTargetAppRecordId(
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

  if (records.length > 0) {
    const recordIds = records.map((record: any) => record["$id"].value);
    await deleteAllConfigurationRecordsBy(
      dropbox_configuration_app_id,
      recordIds
    );
  }

  records = await restClient.record.getAllRecords({
    app: kintone.app.getId(),
  });

  const configurationRecord = await getRootConfigurationRecord(
    dropbox_configuration_app_id
  );

  if (!!configurationRecord) {
    await updateRootRecord(
      dropbox_configuration_app_id,
      configurationRecord["$id"].value,
      {
        root_folder_name: { value: folderName },
        dropbox_folder_id: { value: selectedFolderId }
      }
    );
  } else {
    await addRootRecord(
      dropbox_configuration_app_id,
      folderName,
      selectedFolderId
    );
  }

  dbx = new Dropbox({
    accessToken: `${accessToken}`,
    selectUser: `${memberId}`,
    pathRoot: `{".tag": "namespace_id", "namespace_id": "${selectedFolderId}"}`,
  });

  const childFolders = records.map((record) => {
    return {
      id: record["$id"].value,
      name: `${record[selectedField].value || ""}[${record["$id"].value}]`,
    };
  });

  const childFolderPaths = childFolders.map((folder) => {
    return `/${folder.name}`;
  });

  console.log('folderName', folderName)

  await dbx.filesCreateFolderBatch({ paths: childFolderPaths, autorename: true });
  // Retrieve all folder in this root path for finding and creating configuration record.
  // if we use the response from filesCreateFolderBatch then cannot get folder name if failed on creation
  const filesListFolderResponse = await dbx.filesListFolder({path: ''});

  await Promise.all(
    filesListFolderResponse.result.entries.map(async (entry: any) => {
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