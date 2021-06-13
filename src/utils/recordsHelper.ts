import { KintoneRestAPIClient } from '@kintone/rest-api-client'

// If wrong configurationAppId then returns a hash
// If correct configurationAppId but not found any record, then return undefined
// If correct configurationAppId and found the record, the return found record
export const getRootConfigurationRecord = async (configurationAppId: string | number) => {
  const restClient = new KintoneRestAPIClient();

  const response = await restClient.record.getRecords({
    app: configurationAppId,
    query: `target_app_id="${kintone.app.getId()}" and target_app_record_id=""`
  }).catch((error: any) => {
    return {
      errorCode: 'invalidConfigurationAppId',
      message: 'Please enter correct configuration app id!'
    }
  });

  return !!response['errorCode'] ? response : response.records[0]
}

// If wrong configurationAppId then returns a hash
// If correct configurationAppId but not found any record, then return undefined
// If correct configurationAppId and found the record, the return found record
export const getConfigurationRecord = async (configurationAppId: string | number, targetAppRecordId: string | number) => {
  const restClient = new KintoneRestAPIClient();

  const response = await restClient.record.getRecords({
    app: configurationAppId,
    query: `target_app_id="${kintone.app.getId()}" and target_app_record_id="${targetAppRecordId}"`
  }).catch((error: any) => {
    return {
      errorCode: 'invalidConfigurationAppId',
      message: 'Please enter correct configuration app id!'
    }
  });

  return !!response['errorCode'] ? response : response.records[0]
}

export const updateRootRecord = async (configurationAppId: string | number, id: string | number, record: any) => {
  const restClient = new KintoneRestAPIClient();
  await restClient.record.updateRecord({
    app: configurationAppId,
    id: id,
    record: record
  });
}

export const addRootRecord = async (configurationAppId: string | number, folderName: string, dropboxFolderId: string) => {
  const restClient = new KintoneRestAPIClient();

  await restClient.record.addRecord({
    app: configurationAppId,
    record: {
      target_app_id: {
        value: kintone.app.getId()
      },
      root_folder_name: {
        value: folderName
      },
      dropbox_folder_id: {
        value: dropboxFolderId
      }
    }
  })
}

export const addChildFolderRecord = async (configurationAppId: string | number, folderName: string, dropboxFolderId: string, targetAppRecordId: string | number, dropboxFolderName: string) => {
  const restClient = new KintoneRestAPIClient();

  await restClient.record.addRecord({
    app: configurationAppId,
    record: {
      target_app_id: {
        value: kintone.app.getId()
      },
      root_folder_name: {
        value: folderName
      },
      dropbox_folder_id: {
        value: dropboxFolderId
      },
      target_app_record_id: {
        value: parseInt(targetAppRecordId)
      },
      dropbox_folder_name: {
        value: dropboxFolderName
      }
    }
  })
}