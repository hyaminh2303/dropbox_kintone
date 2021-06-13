## Required configuration on dropbox
https://www.dropbox.com/developers/embedder

# Create or Rename folder workflow
## On Create

```
if invalid_configuration_app_id
  alert error => end process

if invalid dropbox access token key
  alert error => end process

if not_found_configuration_record_with_correct_app_id
  => this mean action create => start create folder action

// action start //
if folder_name_is_invalid
  => alert error => end process

if folder_is_created_on_dropbox
  => add a record to configuration app and then return path => end process
```

## On Edit

```
if invalid_configuration_app_id
  alert error => end process

if invalid dropbox access token key
  alert error => end process

if found_configuration_record_with_correct_app_id
  => this mean action edit => start edit folder action

// action start //
if not_found_folder_on_dropbox
  => end process

if found_folder_on_dropbox
  rename_folder_on_dropbox

  if rename_success
    => update configuration record with new name => end process
  else if rename error
    alert error, => end process
```