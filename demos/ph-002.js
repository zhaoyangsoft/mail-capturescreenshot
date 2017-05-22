var page = require('webpage').create();
var system = require("system");

var param = system.args[1].split('#')[1].replace(/@/g, '&').replace('reoprtOwnerId', 'userId');
var url = system.args[1].split('#')[0] + param+'#' +param ;
var masks = "".split(',');
//
var sign = system.args[1].split('#')[2];
var timestamp = system.args[1].split('#')[3];
var salt = system.args[1].split('#')[4];

console.log('url-->', url);

/**
 * 超时机制
 * @return {[type]} [description]
 */
function just_wait() {
    setTimeout(function() {
        console.log(JSON.stringify(new Date())+'...........  超时自动退出  auto exit ..')
        try{
            page.render('autoexit_screenshot_'+(JSON.stringify(new Date()))+'.png');
        }catch(e){

        }
        phantom.exit();
    }, 1000*60*15);
}

/**
 * 模拟打开页面
 * @return {[type]}   [description]
 */
page.open(url, function() {
    //just_wait();

    page.includeJs('http://g.alicdn.com/sjzn/cloud-bi/js/lib/pbkdf2.js', function(url) {(
        page.evaluate(function(salt) {
            // 重写$.ajax 扩展 + tocken
            var _ajax = $.ajax;
            /**
             * 用于没有使用 jquery Ajax 的请求,
             * 使用方法如：
             * <script>
             var mockOption(url, params, type) {
                    let me = this;
                    var option = {
                        url: url,
                        data: params,
                        type: type
                    };
                    if(window.execSignByOption) {
                        var res = window.execSignByOption(option)
                        return res;
                    }
                    return {};
                }
             mockOption(...)
             * </script>
             * @param  {[type]} option [description]
             * @return {[type]}        [description]
             */
            window.execSignByOption = function(option){

                if (!option.headers) {
                    option.headers = {};
                }
                const timestamp = Date.now();
                var   dataToString = '';
                var host = window.location;
                // console.log(JSON.stringify(option));
                if (option.data) {
                    if(option.type && option.type.toLowerCase() === 'post'){
                        //console.log(JSON.stringify(option.data || ''));
                        //console.log(option.data);
                        dataToString = JSON.stringify(option.data || '');
                        dataToString = dataToString.replace(/\\/g,'');
                        if(dataToString.length >0){
                            dataToString = dataToString.substring(1,dataToString.length-1);
                        }
                        if(dataToString.length > 1024){
                            dataToString = dataToString.substring(0,1024);
                        }
                    }
                    else{
                        var _params = '';
                        for(var key in option.data){
                            _params+='&'+key+'='+option.data[key];
                        }
                        if(option.url.indexOf('?') < 0){
                            _params = '?'+_params.substring(1,_params.length);
                        }
                        dataToString = _params;
                    }
                }


                var port = '';
                if(host.port!=''){
                    port = ':'+host.port;
                }
                var parm = '';
                if(option.type && option.type.toLowerCase() === 'post'){
                    parm = '';
                } else {
                    parm = dataToString;
                }
                const content = location.origin+option.url + parm + timestamp; //del dataToString @2016-10-11 18:44:51 @modified by zy
                //console.log(content);
                var mi = CryptoJS.PBKDF2(content, salt, {
                    keySize: 64,
                    iterations: 10
                    //hasher:'sha1'
                });
                //console.log('---------');
                //console.log(timestamp);
                //console.log(content);
                //console.log(mi);mi

                option.headers['sign'] = mi;
                option.headers['timestamp'] = timestamp;
                option.headers['openMode'] = 'view';

                return {
                    sign:mi,
                    timestamp:timestamp,
                    openMode:'view',
                    before_content:content
                }
            }

            window.KMD = window.KMD || {};
            window.KMD.sppicAjaxChanged = true;

            var dispatch_sendEmailResourceLoaded_event = function() {
                if (!window.KMD.sendEmailResourceLoadedEvent) {
                    window.KMD.sendEmailResourceLoadedEvent = document.createEvent('HTMLEvents');
                    window.KMD.sendEmailResourceLoadedEvent.initEvent('sendEmailResourceLoaded', true, false);
                }
                document.dispatchEvent(window.KMD.sendEmailResourceLoadedEvent);
            }
            dispatch_sendEmailResourceLoaded_event();

        }, salt)

    )})
});


page.viewportSize = {
    width: 960,
    height: 500
};
page.onConsoleMessage = function(msg, lineNum, sourceId) {
    if (msg.indexOf('canvas load over') > -1) {
        var imgHeight = msg.split(',')[1];
        setTimeout(function(){
            var curDBName = page.evaluate(function() {
                $(window).resize();
                var aa=document.getElementsByClassName('canvas-name')[0];
                return aa&&aa.innerText||"";
            })

            var times = new Date().getTime();
            var file = times+'.png';
            var pageWidth = 960;
            var pageHeight = parseInt(imgHeight);

            page.clipRect = {
                top: 0,
                left: 0,
                width: pageWidth,
                height: pageHeight
            };

            var fileName =  file;
            fileName = pageWidth+'_'+pageHeight+'-'+fileName;
            page.render('public/images/' + 0+'_'+fileName, {
                format: 'png',
                quality: '1'
            });

            console.log('截图完成: ' + fileName + '#' + curDBName );
            phantom.exit();

        },1000)
    };



};

/**
 * 如果资源请求加载失败，则退出截图
 * 如: ['403', '404', '409', '500']
 * @modified  @zy@2016-10-20 11:10:58
 * @param  {[type]} resourceError [description]
 * @return {[type]}               [description]
 */
page.onResourceError = function(resourceError) {
    //如果服务器 内部出错 , 403, 500, 404,409资源找不到 ,400 参数错误
    var errorCodes = ['400','401', '403', '404', '409', '500', '504'];

    if (errorCodes.indexOf(resourceError.errorCode + '') != -1 || errorCodes.indexOf(resourceError.status + '') != -1) {
        console.log(JSON.stringify(new Date())+' Resource Load Error ' + resourceError.status + ', exit load page ');
        console.log(JSON.stringify(new Date())+' Resource Load Detail: ', JSON.stringify(resourceError));
        phantom.exit();
    }
};


/**
 * 资源加载
 * @param  {[type]} requestData    [description]
 * @param  {[type]} networkRequest [description]
 * @return {[type]}                [description]
 */
page.onResourceRequested = function(requestData, networkRequest) {
    console.log(JSON.stringify(new Date())+' Request (#' + requestData.id+' '+requestData.url + '): ' );
};


/**
 * 错误处理
 * @param  {[type]} msg   [description]
 * @param  {[type]} trace [description]
 * @return {[type]}       [description]
 */
page.onError = function(msg, trace) {
    console.log(JSON.stringify(arguments), 'arguments');
    var msgStack = ['ERROR: ' + msg];
    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
    }

    console.error(msgStack.join('\n'));
    phantom.exit();
};

