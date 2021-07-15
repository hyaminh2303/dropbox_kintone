import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { Dropbox, Error, files } from "dropbox"; // eslint-disable-line no-unused-vars
import { find } from 'lodash';

import { showNotificationError } from "../../../utils/notifications";
import {
  addChildFolderRecord,
  addRootRecord,
  deleteAllConfigurationRecordsBy,
  getConfigurationRecord,
  getConfigurationRecordsByTargetAppRecordId,
  getRootConfigurationRecord,
  updateRootRecord
} from "../../../utils/recordsHelper";

export const saveConfigsForIndividualAccount = async (param: any, callback: Function, ROOT_FOLDER: string, propfolderName: string, dbx: any) => {
  const {
    accessToken,
    folderName,
    selectedField,
    dropbox_configuration_app_id,
    selectedFolderId,
    chooseFolderMethod,
    dropboxAppKey,
  } = param;
  const rootFolder = ROOT_FOLDER || "";

  console.log('param', param);

  const createFolderResponse = await findOrCreateRootFolderForIndividualAccount(param, rootFolder, propfolderName);


  console.log('createFolderResponse', createFolderResponse)

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
  callback(config);

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

export const findOrCreateRootFolderForIndividualAccount = async (param: any, ROOT_FOLDER:string, propfolderName: string) => {
  const {
    dropbox_configuration_app_id,
    chooseFolderMethod,
    folderName,
    hasBeenValidated,
    isDropboxBusinessAPI,
    accessToken,
    selectedFolderId,
  } = param;
  let dbx = null;
  const rootFolder = ROOT_FOLDER || "";

  const configurationRecord = await getRootConfigurationRecord(
    dropbox_configuration_app_id
  );

  if (
    chooseFolderMethod === "select" &&
    folderName !== propfolderName
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
    dbx = new Dropbox({ accessToken: accessToken });
    authResponse = await dbx
      .filesListFolder({ path: "" })
      .catch((error) => {
        return {
          errorCode: "invalidDropboxAccessToken",
        };
      });
  } else if (hasBeenValidated && isDropboxBusinessAPI) {
    authResponse = await dbx.sharingListFolders().catch((error) => {
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
    // const { selectedFolderId, folderName } = this.state;
    const rootPath = `${rootFolder}/${folderName}`;
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
        path: `${rootFolder}/${folderName}`,
      };
    } else if (folderName != metadataResponse.result.name) {
      const currentRootPath = `${rootFolder}/${metadataResponse.result.name}`;
      const newRootPath = `${rootFolder}/${folderName}`;

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
        path: `${rootFolder}/${metadataResponse.result.name}`,
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