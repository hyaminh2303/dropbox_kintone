import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars
import { find, uniqueId, forEach, map } from 'lodash';

import { showNotificationError } from "../../../utils/notifications";
import {
  addChildFolderRecord,
  addRootRecord,
  deleteAllConfigurationRecordsBy,
  getConfigurationRecordsByTargetAppRecordId,
  getRootConfigurationRecord,
  getConfigurationRecord,
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
    const params = {
      label: `${member.profile.name.display_name}<${member.profile.email}>`,
      value: member.profile.team_member_id,
    };
    membersList.push(params);
  });

  return membersList;
}

const sleep = (ms) =>{
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getExistingFoldersList = async (memberId: string, accessToken: string) => {
  let dbx = new Dropbox({accessToken: accessToken});

  try {
    const teamNamespacesListResult = await dbx.teamNamespacesList({limit: 1000})
    const namespace = find(teamNamespacesListResult.result.namespaces, (namespace) => {
      return namespace.namespace_type['.tag'] == "team_folder";
    }) || {namespace_id: ''}

    dbx.selectUser = memberId;
    dbx.pathRoot = `{".tag": "namespace_id", "namespace_id": "${namespace['namespace_id']}"}`;

    const foldersResponse = await dbx.filesListFolder({path: ''});

    const folders = foldersResponse.result.entries.filter((entry) => {
      return entry['.tag'] == 'folder' && !!entry.shared_folder_id;
    }).map((entry: any) => {
      return {
        label: entry.name,
        namespaceId: entry.shared_folder_id,
        folderId: null,
        rootPath: ""
      };
    });

    let getAllChildrenFolderDepth = async (dbx, folder, path) => {
      const childrenFoldersResponse = await dbx.filesListFolder({path: path});

      const childrenFolders = childrenFoldersResponse.result.entries.filter((entry) => {
        return entry['.tag'] == 'folder'
      }).map((entry: any) => {
        console.log(entry)
        return {
          label: entry.name,
          namespaceId: entry.parent_shared_folder_id,
          folderId: entry.id,
          rootPath: entry.path_lower,
        };
      });

      folder['children'] = childrenFolders;

      if (childrenFolders.length > 0) {
        await Promise.all(
          map(childrenFolders, async (folder: any, index: number) => {
            await sleep(200*index)
            await getAllChildrenFolderDepth(dbx, folder, folder.rootPath);
          })
        )
      }
    }

    let allFoldersPromises = map(folders, async (folder: any, index: number) => {
      let dbx = new Dropbox({
        accessToken: accessToken, selectUser: memberId,
        pathRoot: `{".tag": "namespace_id", "namespace_id": "${folder['namespaceId']}"}`
      });

      // value of "folder" will be changed in the function getAllChildrenFolderDeepth
      await sleep(200*index)
      await getAllChildrenFolderDepth(dbx, folder, '');
    })

    await Promise.all(allFoldersPromises)

    return folders;
  } catch (error) {
    return [];
  }

}

export const saveConfigurations = async (params: any, onSaveConfigurationSuccess: Function, oldConfig: any, dbx: any) => {

  const {
    accessToken,
    selectedField,
    dropbox_configuration_app_id,
    memberId,
    selectedFolderId,
    selectedNamespaceId,
    folderName,
    dropboxAppKey,
    createOrSelectExistingFolder,
    isBusinessAccount,
    isValidAccessToken
  } = params;

  const rootFolder = "";

  dbx.selectUser = `${memberId}`;
  dbx.pathRoot = `{".tag": "namespace_id", "namespace_id": "${selectedFolderId}"}`;
  const createFolderResponse = await findOrCreateRootFolder(params, rootFolder, oldConfig, dbx);

  if (!!createFolderResponse["errorCode"]) {
    return;
  }

  const restClient = new KintoneRestAPIClient();

  const config: any = {
    accessToken: accessToken,
    dropboxAppKey: dropboxAppKey,
    selectedField: selectedField,
    folderName: folderName,
    dropbox_configuration_app_id: dropbox_configuration_app_id,
    createOrSelectExistingFolder: createOrSelectExistingFolder,
    isBusinessAccount: isBusinessAccount,
    isValidAccessToken: isValidAccessToken,
    selectedFolderId: selectedFolderId,
    selectedNamespaceId: selectedNamespaceId,
    memberId: memberId
  };

  onSaveConfigurationSuccess(config);

  let recordIds: any = [];
  if (createFolderResponse["actionType"] == "create") {
    // if create configuration for the record which is already had dropbox folder
    const existingFolderOnDropbox = await dbx.filesListFolder({
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

  const childFolders = records.map((record) => {
    return {
      id: record["$id"].value,
      name: `${record[selectedField].value || ""}[${record["$id"].value}]`,
    };
  });

  const childFolderPaths = childFolders.map((folder) => {
    return `/${folder.name}`;
  });

  if (createFolderResponse["actionType"] == "create") {
    await dbx.filesCreateFolderBatch({ paths: childFolderPaths });
    // Retrieve all folder in this root path for finding and creating configuration record.
    // if we use the response from filesCreateFolderBatch then cannot get folder name if failed on creation
    const filesListFolderResponse = await dbx.filesListFolder({
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
}

const findOrCreateRootFolder = async (params: any, rootFolder: string, oldConfig: any, dbx) => {
  const {
    dropbox_configuration_app_id,
    folderName,
    accessToken,
    selectedFolderId,
    selectedNamespaceId,
  } = params;
  console.log(params)

  const configurationRecord = await getRootConfigurationRecord(
    dropbox_configuration_app_id
  );

  if (folderName !== oldConfig.folderName) {
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

  const rootPath = "";

  if (accessToken == oldConfig.accessToken && folderName == oldConfig.folderName && !!configurationRecord) {
    console.log(selectedNamespaceId)
    console.log(selectedFolderId)
    await updateRootRecord(
      dropbox_configuration_app_id,
      configurationRecord["$id"].value,
      {
        root_folder_name: { value: folderName },
        dropbox_folder_id: { value: selectedFolderId },
        namespace_id: { value: selectedNamespaceId }
      }
    );
    return {
      actionType: "edit",
      path: rootPath,
    };

  } else {
    await addRootRecord(
      dropbox_configuration_app_id,
      folderName,
      selectedFolderId,
      selectedNamespaceId,
    );
    return {
      actionType: "create",
      path: rootPath,
    };
  }

}


export const getSelectedDropboxFolder = async (dbx, accessToken, memberId, selectedFolderId) => {
  const existingFoldersList = await getExistingFoldersList(memberId, accessToken)

  const folderRecord = find(existingFoldersList, { value: selectedFolderId });
  if (!!folderRecord) {
    return {
      result: {
        name: folderRecord.label,
        id: folderRecord.value
      }
    };
  } else {
    return {
      errorCode: "notFoundFolderOnDropbox",
    }
  }
}
