import swal from 'sweetalert';

export const showNotificationSuccess = (message) => {
  swal({
    title: "Success",
    text: message,
    icon: "success",
  })
}

export const showNotificationError = (message) => {
  swal({
    title: "Error",
    text: message,
    icon: "warning",
    dangerMode: true
  })
}

export const showConfirm = (onConfirm: Function) => {
  swal({
    title: "Are you sure?",
    text: "This entry will be deleted",
    icon: "warning",
    buttons: {
      cancel: true,
      confirm: true
    },
  }).then((agree) => {
    if(agree) {
     return onConfirm()
    }
  })
}
