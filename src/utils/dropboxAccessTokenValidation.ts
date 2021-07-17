import { Dropbox, Error, files } from 'dropbox';

// getlistfolder (ok) + teamGetInfo (not ok) => individual account
// getlistfolder (not ok) + teamGetInfo (ok) => business account
// getlistfolder (not ok) + teamGetInfo (not ok) => Invalid account
//
export const validateDropboxToken = async (accessToken: string) => {
  const dbx = new Dropbox({accessToken: accessToken})
  const filesListFolderResponse: any = await dbx.filesListFolder({path: ''}).catch((errorResp: any) => {
    if (!!errorResp.error['error_summary']) {
      return {
        errorCode: 'invalidKey'
      }
    } else if (errorResp.error.indexOf('OAuth 2 access token is malformed') > -1) {
      return {
        errorCode: 'unauthorized'
      }
    } else {
      return {
        errorCode: 'cannotGetFilesListFolder'
      }
    }
  })

  const teamMemberResponse: any = await dbx.teamGetInfo().catch((errorResp: any) => {
    if (!!errorResp.error['error_summary']) {
      return {
        errorCode: 'invalidKey'
      }
    } else if (errorResp.error.indexOf('OAuth 2 access token is malformed') > -1) {
      return {
        errorCode: 'unauthorized'
      }
    } else {
      return {
        errorCode: 'cannotGetTeamMemberInformation'
      }
    }
  })

  let result: any = {
    dbx: dbx
  }

  if (teamMemberResponse['errorCode'] == 'invalidKey' || filesListFolderResponse['errorCode'] == 'invalidKey') {
    result['status'] = 'invalidKey'
  } else if (filesListFolderResponse['errorCode'] == 'unauthorized') {
    result['status'] = 'unauthorized'
  } else if (!teamMemberResponse['errorCode']) {
    result['status'] = 'businessAccount'
  } else if (!filesListFolderResponse['errorCode']) {
    result['status'] = 'individualAccount'
  } else {
    result['status'] = 'appPermissionError'
  }

  return result;
}

export const isBusinessAccount = async (accessToken: string) => {
  const result: any = await validateDropboxToken(this.props.config.accessToken);
  return result["status"] == "businessAccount";
}