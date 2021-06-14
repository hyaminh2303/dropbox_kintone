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

export const showConfirm = () => {
  swal({
    title: "Are you sure?",
    text: "But you will still be able to retrieve this file.",
    icon: "warning",
    buttons: {
      cancel: true,
      confirm: true
    },
  }).then((result) => {
    console.log(result)
  })
}
export const getStateOfSwal = () => {
  const state = swal.getState();
  console.log(state)
}