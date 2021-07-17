export function setStateAsync(state, that) {
  return new Promise((resolve) => {
    that.setState(state, resolve);
  });
}