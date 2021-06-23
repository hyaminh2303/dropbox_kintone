(async PLUGIN_ID => {
    "use strict";
    async function activationCheck(event) {
        kintone.proxy(
            'https://capdomain.xsrv.jp/public/activationDomain/?license_cd=5&domain=' + window.location.hostname,
            'GET',
            {},
            {},
            async function(body,status,headers){
                if (status==200)
                {
                    var json=JSON.parse(body);
                    if (json[0]['records'][0]['ドメイン名']['value']=='') {
                        errorMsgDialog('ライセンスが登録されていません。');
                        return false;
                    }
                    console.log('ライセンス認証に成功しました。');
                    return true;
                }else{
                    console.log('ライセンス認証に失敗しました。');
                }
            },
            function(error){
                console.log('ライセンス認証に失敗しました。');
            }
        );
    }

    async function mainStart(event){
        var config = kintone.plugin.app.getConfig(PLUGIN_ID);
        var startCheck =  activationCheck(event);
        if (startCheck){
            console.log('startCheck');
        }
        return event;
    }

    // 各種イベントハンドル
    kintone.events.on(['app.record.index.show'],   mainStart);

})(kintone.$PLUGIN_ID);