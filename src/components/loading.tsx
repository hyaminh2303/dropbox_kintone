import { Spinner } from "@kintone/kintone-ui-component";
import React from "react";

export default class Loading extends React.Component {
  render() {
    let { isVisible } = this.props;
    return <Spinner isVisible={isVisible} />;
  }
}
