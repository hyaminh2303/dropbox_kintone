(async PLUGIN_ID => {
  "use strict";
  async function activationCheck(event) {

    kintone.proxy(
      'https://capdomain.xsrv.jp/public/activationDomain/?license_cd=17&domain=' + window.location.hostname,
      'GET',
      {},
      {},
      async function (body, status, headers) {
        if (status >= 200 && status < 300) {
        } else {
          swal('Error!', 'ライセンス認証に失敗しました。', 'error');
        }
      },
      function (error) {
        swal('Error!', 'ライセンス認証に失敗しました。', 'error');
      }
    );
  }

  // 各種イベントハンドル
  kintone.events.on(['app.record.index.show'], activationCheck);

})(kintone.$PLUGIN_ID);