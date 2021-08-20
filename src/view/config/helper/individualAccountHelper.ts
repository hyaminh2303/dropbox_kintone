import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars
import { find, uniqueId, reverse, tail } from 'lodash';

import { showNotificationError } from "../../../utils/notifications";
import {
  addChildFolderRecord,
  addRootRecord,
  deleteAllConfigurationRecordsBy,
  getConfigurationRecord,
  getConfigurationRecordsByTargetAppRecordId,
  getRootConfigurationRecord,
  updateConfigurationRecord
} from "../../../utils/recordsHelper";

export const saveConfigurations = async (params: any, onSaveConfigurationSuccess: Function, oldConfig: any, dbx: any) => {
  const {
    accessToken,
    refreshToken,
    folderName,
    selectedField,
    dropbox_configuration_app_id,
    selectedFolderId,
    selectedNamespaceId,
    selectedNamespaceName,
    // selectedFolderPathLower,
    createOrSelectExistingFolder,
    dropboxAppKey,
    isBusinessAccount,
    isValidAccessToken
  } = params;
  const rootFolder = "";

  const createFolderResponse = await findOrCreateRootFolder(params, rootFolder, oldConfig, dbx);

  if (!!createFolderResponse["errorCode"]) {
    return;
  }

  const selectedFolderPathLower = createFolderResponse['path'];

  const restClient = new KintoneRestAPIClient();

  const config = {
    accessToken: accessToken,
    refreshToken: refreshToken,
    dropboxAppKey: dropboxAppKey,
    selectedField: selectedField,
    folderName: folderName,
    selectedFolderPathLower: selectedFolderPathLower,
    dropbox_configuration_app_id: dropbox_configuration_app_id,
    createOrSelectExistingFolder: createOrSelectExistingFolder,
    isBusinessAccount: isBusinessAccount,
    isValidAccessToken: isValidAccessToken,
    selectedFolderId: selectedFolderId
  };

  onSaveConfigurationSuccess(config);

  let records= await restClient.record.getAllRecords({
    app: kintone.app.getId(),
  });

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
            {
              root_folder_name: { value: folderName },
              dropbox_folder_id: { value: entry.id },
              target_app_record_id: { value: parseInt(folderRecord.id) },
              dropbox_folder_name: { value: entry.name },
              namespace_id: { value: selectedNamespaceId },
              namespace_name: { value: selectedNamespaceName }
            }
          );
        }
      })
    );
  }
}

export const findOrCreateRootFolder = async (params: any, rootFolder: string, oldConfig: any, dbx) => {
  const {
    dropbox_configuration_app_id,
    createOrSelectExistingFolder,
    folderName,
    accessToken,
    selectedFolderId,
  } = params;

  const configurationRecord = await getRootConfigurationRecord(
    dropbox_configuration_app_id
  );

  if (
    createOrSelectExistingFolder === "select" &&
    folderName !== oldConfig.folderName
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
  console.log(createOrSelectExistingFolder)
  if (createOrSelectExistingFolder === "select") {
    console.log("Action select existing folder");

    let rootPath = "";
    if (!!selectedFolderId) {
      const fileMetaDataResp = await dbx.filesGetMetadata({
        path: selectedFolderId
      })
      rootPath = fileMetaDataResp.result.path_lower;
    }

    if (accessToken == oldConfig.accessToken && folderName == oldConfig.folderName && !!configurationRecord) {
      await updateConfigurationRecord(
        dropbox_configuration_app_id,
        configurationRecord["$id"].value,
        {
          root_folder_name: { value: folderName },
          dropbox_folder_id: { value: selectedFolderId },
          namespace_id: { value: "" },
          namespace_name: { value: "" }
        }
      );
      return {
        actionType: "edit",
        path: rootPath,
      };

    } else {
      await addRootRecord(
        dropbox_configuration_app_id,
        {
          root_folder_name: { value: folderName },
          dropbox_folder_id: { value: selectedFolderId },
          namespace_id: { value: "" },
          namespace_name: { value: "" }
        }
      );
      return {
        actionType: "create",
        path: rootPath,
      };
    }
  } else if (!!configurationRecord) {
    // need to update folder name
    console.log("Action Update");

    const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
    let metadataResponse = await dbx
      .filesGetMetadata({ path: dropboxFolderId })
      .catch((error) => {
        return {
          errorCode: "notFoundFolderOnDropbox",
        };
      });

    if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
      // need to re-create folder here, because it was deleted on drobox
      const folderResponse = await dbx.filesCreateFolderV2({
        path: `${rootFolder}/${folderName}`,
      });

      await updateConfigurationRecord(
        dropbox_configuration_app_id,
        configurationRecord["$id"].value,
        {
          root_folder_name: { value: folderName },
          dropbox_folder_id: { value: folderResponse.result.metadata.id },
        }
      );

      return {
        actionType: "edit",
        path: `${rootFolder}/${folderName}`,
      };
    } else if (folderName != metadataResponse.result.name) {
      console.log("editing folder name and move the files")

      let pathLowerItems = metadataResponse.result.path_lower.split("/");

      // input ["", "aaacc1", "test 3"]
      pathLowerItems = tail(pathLowerItems);
      pathLowerItems = reverse(pathLowerItems);
      pathLowerItems = tail(pathLowerItems);
      pathLowerItems = reverse(pathLowerItems);
      // output ["aaacc1"]

      const currentRootPath = metadataResponse.result.path_lower;
      pathLowerItems.push(folderName)
      const newRootPath = `/${pathLowerItems.join("/")}`;

      const filesMoveResponse = await dbx
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

      updateConfigurationRecord(
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
      // when user visit config setting and doesnt change dropbox name but the other information, only click button save
      return {
        actionType: "edit",
        path: metadataResponse.result.path_lower,
      };
    }
  } else {
    // Need to create new folder
    console.log("Action Create");

    const rootPath = `${rootFolder}/${folderName}`;

    const metadataResponse = await dbx
      .sharingGetFolderMetadata({ shared_folder_id: selectedFolderId })
      .catch((error) => {
        return {
          errorCode: "notFoundFolderOnDropbox",
        };
      });

    let createFolderResponse, folderId;
    if (metadataResponse["errorCode"] == "notFoundFolderOnDropbox") {
      createFolderResponse = await dbx
        .filesCreateFolderV2({ path: rootPath })
        .catch((error: any) => {
          return {
            errorCode: "invalidFolderName",
          };
        });

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

    await addRootRecord(
      dropbox_configuration_app_id,
      {
        root_folder_name: { value: folderName },
        dropbox_folder_id: { value: folderId },
        namespace_id: { value: "" },
        namespace_name: { value: "" }
      }
    );

    console.log("Created folder");

    return {
      actionType: "create",
      path: rootPath,
    };
  }
}

export const getExistingFoldersList = async (dbx) => {
  const filesListFolderResponse = await dbx.filesListFolder({
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
        namespaceName: null,
        namespaceId: null,
        folderId: e.id,
        children: [],
        pathLower: e.path_lower,
        uniqueId: uniqueId(),
      };
    });

    return listFolders;
}

export const getSelectedDropboxFolder = async (dbx, selectedFolderId) => {
  const metadataResponse = await dbx
    .filesGetMetadata({ path: selectedFolderId })
    .catch((error: any) => {
      return {
        errorCode: "notFoundFolderOnDropbox",
      };
    });

  return metadataResponse;
}
