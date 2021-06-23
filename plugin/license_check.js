(async PLUGIN_ID => {

    "use strict";

    async function activationCheck(event) {
        console.log(encodeURI(window.location.hostname));
        kintone.proxy(
            'https://capdomain.xsrv.jp/public/activationDomain/?license_cd=5&domain=' + window.location.hostname,
            'GET',
            {},
            {},
            async function(body,status,headers){
                if (status==200)
                {
                    console.log('2');
                    var json=JSON.parse(body);
                    console.log(json);
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
        console.log('1')
        var config = kintone.plugin.app.getConfig(PLUGIN_ID);
        console.log(config,'config')
        var startCheck =  activationCheck(event);
        if (startCheck){
            console.log('startCheck');
        }
        return event;

    }

    // 各種イベントハンドル
    kintone.events.on(['app.record.index.show'],   mainStart);

})(kintone.$PLUGIN_ID);