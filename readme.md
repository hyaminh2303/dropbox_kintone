## Required configuration on dropbox
https://www.dropbox.com/developers/embedder

# Create or Rename folder workflow
## Business account
** Currently this plugin doesn't support business account, because Dropbox Api doesnt allow us create an account inside team folder.

* Dropbox api
https://www.dropbox.com/developers/documentation/http/documentation

## Individual Account

### Select Existing folder
if validate access token key
  alert error => end process

if invalid_configuration_app_id
  alert error => end process

** First install and save
1. Create new children folder on Dropbox inside selected folder
2. Add records to configuration app and then return path => end process

** Back to edit and select new
1. delete old configuration records
2. Create new children folder on Dropbox inside selected folder
3. Add records to configuration app and then return path => end process

### Type folder name into input field
#### On Create

```
if invalid_configuration_app_id
  alert error => end process

if invalid dropbox access token key
  alert error => end process

if not_found_configuration_record_with_correct_app_id
  => this mean action create => start create folder action

if folder_name_is_invalid
  => alert error => end process

if folder_is_created_on_dropbox
  => add a record to configuration app and then return path => end process
```

#### On Edit

```
if invalid_configuration_app_id
  alert error => end process

if invalid dropbox access token key
  alert error => end process

if found_configuration_record_with_correct_app_id
  => this mean action edit => start edit folder action

if not_found_folder_on_dropbox (in case the root folder has been deleted)
  => create new root folder on dropbox with new name

if found_folder_on_dropbox
  rename_folder_on_dropbox

  if rename_success
    => update configuration record with new name => end process
  else if rename error
    alert error, => end process
```


# Requirement
just some additional info from Ayumi san

1. at the plugin setting page on Kintone, users should be able to choose existing files on the linked dropbox account rather than typing into folder name

2. dropbox business account has a team folder at the top of folder hierarchy, so users should be able to choose a folder within it

structure of business account is bit different from  personal account so please be aware :))

