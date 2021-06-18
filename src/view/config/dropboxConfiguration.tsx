import React, { Component } from 'react'
import { Text, Label, Dropdown, RadioButton } from '@kintone/kintone-ui-component'
import { Dropbox, Error, files } from 'dropbox'; // eslint-disable-line no-unused-vars
import { KintoneRestAPIClient } from '@kintone/rest-api-client'
import { find } from 'lodash'
import Select from 'react-select'

import { showNotificationError } from '../../utils/notifications'
import { getRootConfigurationRecord, updateRootRecord, addRootRecord, addChildFolderRecord, getAllRecordsByTargetAppRecordId } from '../../utils/recordsHelper'
import './style.sass'
import { validateDropboxToken } from '../../utils/dropboxAccessTokenValidation'

const  ROOT_FOLDER = ""
export default class DropboxConfiguration extends Component {
  constructor(props) {
    super(props)
    this.findOrCreateRootFolder = this.findOrCreateRootFolder.bind(this)
    this.onCancel = this.onCancel.bind(this);
    this.handleClickSaveButton = this.handleClickSaveButton.bind(this);
    this.handleGetMembers = this.handleGetMembers.bind(this);
    this.validateAccessToken = this.validateAccessToken.bind(this);
    this.handleChangeselectMember = this.handleChangeselectMember.bind(this);
    this.createRecordByIndividualAccount = this.createRecordByIndividualAccount.bind(this);
    this.createRecordByBusinessAccount = this.createRecordByBusinessAccount.bind(this);

    const chooseFolderMethods = [
      {
          label: 'Input folder name',
          value: 'input',
          isDisabled: false
      },
      {
          label: 'Select an existing folder',
          value: 'select',
          isDisabled: false
      },
    ];

    this.dbx = null;
    this.state = {
      accessToken: props.accessToken,
      folderName: props.folderName,
      dropbox_configuration_app_id: props.dropbox_configuration_app_id,
      licenseKey: props.licenseKey,
      selectedField: props.selectedField,
      membersList: [],
      memberId: props.memberId,
      isDropboxBusinessAPI: false,
      hasBeenValidated: false,
      chooseFolderMethods: chooseFolderMethods,
      chooseFolderMethod: 'input',
      existingFoldersList: [],
      sharedFolderId: props.sharedFolderId
    }


    // this.dbx = new Dropbox({ accessToken: 'sl.AyzWlg50LrAjoP2dPur8oXwZGVOxw9YtCha52GvyCflCbnahy3E57lTzT90Wf0Q1FYbwKMDiDS_406GP0rfrDKfAxo9rWxSokIujeIIYcYISFkXhHNso9c3o365w9dnpJEWNxFY', selectUser: 'dbmid:AAAvmCflrU_j54NC9yq-5sia_jLHOzFSiS8' });
    // this.dbx.sharingListFolders().then((a) =>{
    //   console.log(a)
    // })
    // getlistfolder (ok) + teamGetInfo (not ok) => individual account
    // getlistfolder (not ok) + teamGetInfo (ok) => business account
    // getlistfolder (not ok) + teamGetInfo (not ok) => Invalid account
    //

    // this.dbx = new Dropbox({ accessToken: 'k-'});
    // this.dbx.filesListFolder({path: ''}).then((a) =>{
    //   console.log(a)
    // })

    // this.dbx.teamGetInfo().then((a) =>{
    //   console.log(a)
    // })
  }

  onCancel() {
    window.location.href = "../../" + kintone.app.getId() + "/plugin/";
  }

  async createRecordByIndividualAccount() {
    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
    } = this.state;

    const createFolderResponse = await this.findOrCreateRootFolder()
    if (!!createFolderResponse['errorCode']) { return }

    this.props.setPluginConfig({
      accessToken: accessToken,
      selectedField: selectedField,
      dropbox_configuration_app_id: dropbox_configuration_app_id,
    })

    let recordIds: any = [];
    if (createFolderResponse['actionType'] == 'create') {
      // if create configuration record for the record which is already had dropbox folder
      const existingFolderOnDropbox = await this.dbx.filesListFolder({ path: createFolderResponse['path'] })

      existingFolderOnDropbox.result.entries.map(async (entry) => {
        recordIds.push(`"${entry.name}"`)

        await addChildFolderRecord(
          dropbox_configuration_app_id,
          folderName,
          entry.id,
          entry.name,
          entry.name
        )
      })
    }

    const restClient = new KintoneRestAPIClient();

    const records = await restClient.record.getAllRecords({ app: kintone.app.getId(), condition: `$id not in (${recordIds.join(',')})` });

    // only create folder records, which havent had folder yet.
    const childFolders = records.map((record) => {
      return {
        id: record['$id'].value,
        name: `${record[selectedField].value || ''}[${record['$id'].value}]`
      }
    })

    const childFolderPaths = childFolders.map((folder) => {
      return `${createFolderResponse['path']}/${folder.name}`
    })

    if (createFolderResponse['actionType'] == 'create') {
      const filesListFolderResponse = await this.dbx.filesCreateFolderBatch({ paths: childFolderPaths })
      console.log("filesListFolderResponse", filesListFolderResponse)
      // const filesListFolderResponse = await this.dbx.filesListFolder({ path: createFolderResponse['path'] })
      await filesListFolderResponse.result.entries.map(async (entry) => {
        const folderRecord = find(childFolders, { name: entry.name })
        await addChildFolderRecord(
          dropbox_configuration_app_id,
          folderName,
          entry.id,
          folderRecord.id,
          entry.name
        )
      })
    }
  }

  async createRecordByBusinessAccount() {
    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
      memberId,
      shared_folder_id
    } = this.state;

    const createFolderResponse = await this.findOrCreateRootFolder()
    if (!!createFolderResponse['errorCode']) { return }

    this.props.setPluginConfig({
      accessToken: accessToken,
      selectedField: selectedField,
      dropbox_configuration_app_id: dropbox_configuration_app_id,
      memberId: memberId,
      shared_folder_id
    })

    let recordIds: any = [];
    if (createFolderResponse['actionType'] == 'create') {
      // if create configuration record for the record which is already had dropbox folder
      const existingFolderOnDropbox = await this.dbx.filesListFolder({ path: createFolderResponse['path'] })

      existingFolderOnDropbox.result.entries.map(async (entry) => {
        recordIds.push(`"${entry.name}"`)

        await addChildFolderRecord(
          dropbox_configuration_app_id,
          folderName,
          entry.id,
          entry.name,
          entry.name
        )
      })
    }

    const restClient = new KintoneRestAPIClient();

    const records = await restClient.record.getAllRecords({ app: kintone.app.getId(), condition: `$id not in (${recordIds.join(',')})` });

    // only create folder records, which havent had folder yet.
    const childFolders = records.map((record) => {
      return {
        id: record['$id'].value,
        name: `${record[selectedField].value || ''}[${record['$id'].value}]`
      }
    })

    const childFolderPaths = childFolders.map((folder) => {
      return `${createFolderResponse['path']}/${folder.name}`
    })

    if (createFolderResponse['actionType'] == 'create') {
      const filesListFolderResponse = await this.dbx.filesCreateFolderBatch({ paths: childFolderPaths })
      console.log("filesListFolderResponse", filesListFolderResponse)
      // const filesListFolderResponse = await this.dbx.filesListFolder({ path: createFolderResponse['path'] })
      await filesListFolderResponse.result.entries.map(async (entry) => {
        console.log(entry)
        const folderRecord = find(childFolders, { name: entry.name })
        await addChildFolderRecord(
          dropbox_configuration_app_id,
          folderName,
          entry.id,
          folderRecord.id,
          entry.name
        )
      })
    }
  }

  async handleClickSaveButton() { 
    const {
      accessToken,
      hasBeenValidated,
      selectedField,
      isDropboxBusinessAPI,
    } = this.state;

    if (accessToken === '' || selectedField === '') {
      showNotificationError('All fields are requied!')
    } else {
      // if not business account
      if(hasBeenValidated && !isDropboxBusinessAPI) {
        this.createRecordByIndividualAccount();
      } else if(hasBeenValidated && isDropboxBusinessAPI){
        this.createRecordByBusinessAccount();
      }
    }
  }

  async findOrCreateRootFolder() {
    const { folderName, dropbox_configuration_app_id, 
            accessToken, isDropboxBusinessAPI, hasBeenValidated,
            sharedFolderId, chooseFolderMethod
          } = this.state;
    const configurationRecord = await getRootConfigurationRecord(dropbox_configuration_app_id)
    if(chooseFolderMethod === "select" && folderName !== "") {
      const recordsOfTargetAppInConfigApp = await getAllRecordsByTargetAppRecordId(dropbox_configuration_app_id);
      console.log("recordsOfTargetAppInConfigApp", recordsOfTargetAppInConfigApp)
    }

    if (!!configurationRecord && !!configurationRecord['errorCode']) {
      // this mean wrong dropbox_configuration_app_id

      showNotificationError(configurationRecord['message'])
      return {
        errorCode: configurationRecord['errorCode']
      }
    }

    let authResponse;
    if(hasBeenValidated && !isDropboxBusinessAPI) {
      this.dbx = new Dropbox({ accessToken: accessToken });
      authResponse = await this.dbx.filesListFolder({path: ''}).catch((error) => {
        return {
          errorCode: 'invalidDropboxAccessToken'
        }
      })
    } else if(hasBeenValidated && isDropboxBusinessAPI){
      authResponse = await this.dbx.sharingListFolders().catch((error) => {
        return {
          errorCode: 'invalidDropboxAccessToken'
        }
      })
    }

    console.log("authResponse", authResponse)

    if (authResponse['errorCode'] == 'invalidDropboxAccessToken') {
      showNotificationError('Please enter correct Dropbox access token')
      return {
        errorCode: authResponse['errorCode']
      }
    }

    if (!!configurationRecord) {
      // need to update folder name
      console.log('Action Update')

      const dropboxFolderId = configurationRecord.dropbox_folder_id.value;
      const metadataResponse = await this.dbx.filesGetMetadata({ path: dropboxFolderId }).catch((error) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })

      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        // need to re-create folder here, because it was deleted on drobox
      }

      const currentRootPath = `${ROOT_FOLDER}/${metadataResponse.result.name}`;

      if (folderName != metadataResponse.result.name) {
        const newRootPath = `${ROOT_FOLDER}/${folderName}`;

        const filesMoveResponse = await this.dbx.filesMove({ from_path: currentRootPath, to_path: newRootPath }).catch((error: any) => {
          return {
            errorCode: 'invalidNewName'
          }
        })

        if (filesMoveResponse['errorCode'] == 'invalidNewName') {
          showNotificationError('Invalid name, it might be duplicated with other folder')
          return {
            errorCode: authResponse['errorCode']
          }
        }

        updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
          root_folder_name: { value: filesMoveResponse.result.name }
        })

        console.log('Updated folder')

        return {
          actionType: 'edit',
          path: newRootPath
        }
      } else {
        return {
          actionType: 'edit',
          path: currentRootPath
        }
      }

    } else {
      // Need to create new folder
      console.log('Action Create')

      const rootPath = `${ROOT_FOLDER}/${folderName}`

      const metadataResponse = await this.dbx.sharingGetFolderMetadata({ shared_folder_id: sharedFolderId }).catch((error) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })
      console.log("metadataResponse", metadataResponse)

      let createFolderResponse, folderId;
      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        createFolderResponse = await this.dbx.filesCreateFolderV2({ path: rootPath }).catch((error: any) => {
          return {
            errorCode: 'invalidFolderName'
          }
        })

        console.log("createFolderResponse", createFolderResponse)

        if (createFolderResponse['errorCode'] == 'invalidFolderName') {
          showNotificationError('Cannot create folder, please check the folder name. It might be duplicated!')
          return {
            errorCode: createFolderResponse['errorCode']
          }
        }

        folderId = createFolderResponse.result.metadata.id
        await this.dbx.sharingShareFolder({
          path: createFolderResponse.result.metadata.path_display,
          shared_link_policy: 'team',
          force_async: true
        })

      } else {
        folderId = metadataResponse.result.id
      }

      await addRootRecord(dropbox_configuration_app_id, folderName, folderId)

      console.log('Created folder')

      return {
        actionType: 'create',
        path: rootPath
      }
    }
  }

  async validateAccessToken() {
    let { accessToken, existingFoldersList } = this.state;
    const result = await validateDropboxToken(accessToken)
    this.dbx = result['dbx']

    console.log(result)
    if (result['status'] == 'invalidKey') {
      showNotificationError('Invalid access token, please generate a new one.')
    } else if (result['status'] == 'unauthorized') {
      showNotificationError('Invalid access token, please generate a new one.')
    } else if (result['status'] == 'businessAccount') {
      this.handleGetMembers()
    } else if (result['status'] == 'individualAccount') {
      // logic for individualAccount if needed
      this.dbx.filesListFolder({ path: ''}).then(response => {
        const { result: { entries } } = response;
        existingFoldersList = entries.map(entry => {
          const folder = {
            label: entry.name,
            value: entry.name
          }
          return folder;
        })

        this.setState({
          hasBeenValidated: true,
          existingFoldersList: existingFoldersList
        });
      })

    } else if (result['status'] == 'appPermissionError'   ) {
      showNotificationError('Please check app permission and generate a new access token.')
    }
  }

  async handleChangeselectMember(member: any) {
    let { accessToken, existingFoldersList } = this.state;
    this.dbx = new Dropbox({ accessToken: accessToken, selectUser: member.value });
    const sharingListFolders = await this.dbx.sharingListFolders();
    existingFoldersList = sharingListFolders.result.entries.map(entry => {
      const folder = {
        label: entry.name,
        value: entry.shared_folder_id
      }
      return folder;
    })

    const privateListFolders = await this.dbx.filesListFolder({path:''});
    console.log("privateListFolder", privateListFolders)
    privateListFolders.result.entries.forEach(folder => {
      if(folder['.tag'] === 'folder') {
        existingFoldersList.push({
          label: folder.name,
          value: folder.id
        })
      }
    })

    this.setState({
      memberId: member.id,
      existingFoldersList: existingFoldersList
    });
  }

  async handleGetMembers() {
    const { accessToken, membersList } = this.state;
    if (accessToken == "") {
      showNotificationError('Please enter access token')
      return;
    }

    // get team members
    const teamMemberListResponse = await this.dbx.teamMembersListV2({
      limit: 1000, include_removed: false
    })

    const { result: { members } } = teamMemberListResponse;
    members.forEach(member => {
      const param = {
        label: `${member.profile.name.display_name}<${member.profile.email}>`,
        value: member.profile.team_member_id,
      }
      membersList.push(param);
    });

    this.setState({
      membersList: membersList,
      isDropboxBusinessAPI: true,
      hasBeenValidated: true,
    })
  }

  UNSAFE_componentWillMount() {
    (async () => {
      // Get Root Folder
      const { dropbox_configuration_app_id, accessToken } = this.props;

      if (!accessToken && !dropbox_configuration_app_id) {
        return;
      }

      const configurationRecord = await getRootConfigurationRecord(dropbox_configuration_app_id)

      if (!!configurationRecord && !!configurationRecord['errorCode']) {
        // this mean wrong dropbox_configuration_app_id
        showNotificationError('Please enter correct configuration app id!')
        return;
      }

      if (!configurationRecord) {
        // this mean first setup plugin
        return;
      }

      this.dbx = new Dropbox({ accessToken: accessToken });
      const dropboxFolderId = configurationRecord.dropbox_folder_id.value
      const metadataResponse = await this.dbx.filesGetMetadata({path: dropboxFolderId}).catch((error: any) => {
        return {
          errorCode: 'notFoundFolderOnDropbox'
        }
      })

      console.log("metadataResponse", metadataResponse)

      if (metadataResponse['errorCode'] == 'notFoundFolderOnDropbox') {
        // need to re-create folder here, because it was deleted on drobox
        return ;
      }

      this.setState({ folderName: metadataResponse.result.name })
      updateRootRecord(dropbox_configuration_app_id, configurationRecord['$id'].value, {
        root_folder_name: { value: metadataResponse.result.name }
      })
    })()
  }

  render() {
    const { formFields } = this.props;

    const {
      accessToken,
      folderName,
      selectedField,
      dropbox_configuration_app_id,
      membersList, memberId, isDropboxBusinessAPI,
      hasBeenValidated, chooseFolderMethods, chooseFolderMethod,
      existingFoldersList
    } = this.state;

    return (
      <div>
        <div className="tab-content">
          <div>
            <div className="kintoneplugin-row kintoneplugin-flex">
              <div>
                <Label text='Access Token' isRequired={false} />
                <div className="input-config">
                  <Text
                    value={accessToken}
                    onChange={(value) => this.setState({accessToken: value})}
                    className="kintoneplugin-input-text" />
                </div>
              </div>
              <div>
              <button
                className="kintoneplugin-button-dialog-cancel btn-get-members"
                onClick={this.validateAccessToken}
              >
                Validate Access Token
              </button>
              </div>
            </div>

            {
              isDropboxBusinessAPI &&
                <div className="kintoneplugin-row">
                  <Label text='Specified member to use the user endpoints' />
                  <div className="input-config">
                    <Select
                      value={memberId}
                      options={membersList}
                      className="react-select-dropdown"
                      onChange={(value) => this.handleChangeselectMember(value)}
                    />
                  </div>
                </div>
            }

            <div className="kintoneplugin-row">
              <Label text='Dropbox Configuration App ID' isRequired={false} />
              <div className="input-config">
                <Text
                  value={dropbox_configuration_app_id}
                  onChange={(value) => this.setState({dropbox_configuration_app_id: value})}
                  className="kintoneplugin-input-text" />
              </div>
            </div>

            <div className="kintoneplugin-row">
              <Label text='Folder Name' isRequired={false} />
              <RadioButton
                name='chooseFolderMethods'
                items={chooseFolderMethods}
                value={chooseFolderMethod}
                onChange={(value) => {this.setState({chooseFolderMethod: value})}}
              />

              {
                chooseFolderMethod === 'input'
                ?
                  <div className="input-config">
                    <Text
                      value={folderName}
                      onChange={(value) => this.setState({folderName: value})}
                      className="kintoneplugin-input-text" />
                  </div>
                :
                  <div className="input-config">
                    <Select
                      options={existingFoldersList}
                      className="react-select-dropdown"
                      onChange={(value) => this.setState({
                        folderName: value.label,
                        sharedFolderId: value.value
                      })}
                    />
                  </div>
              }
            </div>
            <div className="kintoneplugin-row">
              <Label text='Specified field to set folder name' />
              <div className="input-config">
                <Select
                  options={formFields}
                  className="react-select-dropdown"
                  onChange={(value) => this.setState({selectedField: value.value})}
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
              className={`kintoneplugin-button-dialog-ok btn-action ${!hasBeenValidated ? 'disabled' : '' }`}
              onClick={!hasBeenValidated ?  null : this.handleClickSaveButton}
            >
              Save
            </button>
            {
              !hasBeenValidated &&
              <p className="notes">Please validate the access token before save *</p>
            }
          </div>
        </div>
      </div>
    )
  }
}
