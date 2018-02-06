# justreq(JR Server)

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![License][license-image]][npm-url]

永不离线的测试接口服务，让开发不再等待。

## 特性

* 自动缓存每一次接口请求，当接口服务器宕机时，依然可以从容开发
* 接口替身服务(Mock Server)，当后台GG们还没开发好接口时，可以用json、txt等替代
* 独有jrs脚本，仿php，可以定制更灵活的接口替身，甚至可以用来开发小型站点
* 支持ES6、ES7，开发更高效
* 支持CORS跨域，前端开发也可以放心使用
* 支持https，无论接口采用http还是https，都能从容应对
* 零侵入，不需要在项目中植入任何代码

## 安装
首先下载安装[Node.js](https://nodejs.org/en/)，然后运行以下命令安装justreq命令行工具
```
npm install -g justreq-cli
```
运行以下命令安装主程序
```
npm install justreq
```

## 初始化
运行以下命令进行初始化
```
justreq init
```
初始化完成后，将在当前目录生成“.justreq”配置文件，你可以随时按自己需求进行配置。另外，也可以添加js风格的注释。

## 使用
运行以下命令启动justreq
```
justreq start
```
然后把你的接口地址直接指向justreq服务（JR Server）即可。例如：
```javascript
// const API_HOST = "https://test.yourhost.com";
const API_HOST = "http://127.0.0.1:8000";
$.get(API_HOST + "/getInfo.do?userId=1001", callback);
```

OK，一切就绪，现在我们就已经可以愉快地敲代码去了。

******

### 命令行参数

如果需要在启动的同时更新缓存，可以用以下命令
```
justreq start -c
```

如果接口地址临时改动了，而你又不想修改配置文件，可以用以下命令
```
justreq start -h temp.yourhost.com
```

可运行如下命令查看更多命令行参数
```
justreq start --help
```

## 进阶玩法
### JRS脚本
接下来要郑重推荐我们独创的***jrs***脚本了。该脚本基于javascript，因此你完全不需要任何学习成本即可上手。先来一段：
```javascript
// getUser.jrs
var userId = $_GET['userId'];
var users = {
    1001 : {name:'zhangsan', age: 22},
    1002 : {name:'lily', age: 21}
};
var user = users[userId];
setCookie('userName', user.name);
echo(JSON.stringify(user));
end();
```
除了你所熟知的javascript对象外，我们新增加了一些必要的全局函数、属性
#### 属性
|   name   |  description  
|----------|:-----------------------------------------------------
| $_GET    | 获取querystring
| $_POST   | 获取POST方式提交的表单数据
| $_COOKIE | 获取cookies
| $_HEADER | 获取header
| $_FILES  | 获取表单上传的文件。注意，如需要上传文件，须将form编码方式设置为enctype="multipart/form-data"

#### 方法
|   name                 |  description  
|------------------------|:---------------------------------------
| echo(string)           | 向页面输出字符串
| end([string])          | 结束当前脚本，输出字符串为可选参数。***注：请务必使用该方法结束脚本，否则脚本将运行至超时***
| sendFile(filepath)     | 也可直接使用文件做为输出。使用该方法时，不必再使用`end()`结束脚本
| setMime(suffix)        | 设置当前输出的mimetype；缺省将尝试json，如自动检测不通过，将切换为txt。可选值为：txt、html、css、xml、json、js、jpg、jpeg、gif、png、svg。如需设置其它类型，可直接使用setHeader函数设置“Content-Type”
| setCookie(name, value) | 设置输出的cookies。完整参数：setCookie(name, value [, expires [, path [, domain [, secure [, httponly]]]]])
| setHeader(name, value) | 设置header，其中'Server'、'Date'由JR Server自动设置，不允许修改

由于***jrs***脚本完全基于js，并运行于Node.js环境，因此，你可以使用Node.js下面的一切优秀模块来进行开发，例如[Faker.js](https://github.com/marak/Faker.js/), [mockjs](https://github.com/nuysoft/Mock)等等
并且，只要你的Node.js版本支持，你也可以使用ES6/ES7来编写***jrs***

*********

<a id="rules"></a>
### RULES配置
为了更好的发挥justreq的功能，我们提供了一些配置规则

|    name    |  description  
|------------|:-----------------------------------------------------
| url        | 接口路径，必填。可以使用正则表达式
| method     | 接口请求方式，选填。默认不筛选请求方式
| ignoreArgs | 可忽略字段，以逗号分割，可以忽略一些非关键字段。例如跳过常见的防缓存的`?v=1483884433384`，则设置 `{"ignoreArgs" : "v"}`
| noCache    | 不允许缓存该接口，缺省值为允许
| subs       | 接口替身，推荐使用我们的jrs脚本，也可以是json、txt
| keepFresh  | 总是请求最新数据，仅在接口服务器不可用时才使用缓存
| host       | 临时替换host，相当于对单条规则转发
| port       | 临时替换port
| rewrite    | 重写url

以下是一份样例：

```javascript
// .justreq
{
    ...
  "rules": [
    { // 总是先尝试代理，失败时才使用缓存
      "url":        ".+",
      "keepFresh":  true
    },
    { // 使用正则表达式
      "url":        "user.do\\?id=(\\d+)",
      "subs":       "user.jrs?userId=$1"
    },
    {
      "url":        "login.do",
      "noCache":    true
    },
    {
      "url":        "getGoodsInfo.do",
      "ignoreArgs": "v,token,timestamp"
    },
    { // 所有url中包含'system'的接口都代理到188机子
      "url":        "system.+",
      "host":       "192.168.1.188",
      "port":       "8080"
    }
  ]
}
```

*********

### Inspector
有时，我们会遇到一些特殊的情况，需要介入justreq来决定是否缓存该请求。例如接下来的例子，postData被用base64编码了，而里面有一个参数其实是无关紧要的。如果不进行介入处理，justreq将无法自行判断，从而导致缓存了多份“重复”的请求。

#### 示例
```javascript
// myInsp.js
const querystring = require('querystring');
const crypto = require('crypto');
const base64 = require('base64-utf8');

function md5(str) {
  let md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
}

function insp(req, buf) {
  let rawData = buf.toString('utf8'); // token=F2F0CF28&encrypt=eyJhcnRpY2xlSWQiOjk5LCJtaXN0IjoiWTJodiJ9
  let postData = querystring.parse(rawData); // {token:"F2F0CF28", encrypt:"eyJ..."}
  if (postData.encrypt) {
    let decodeString = base64.decode(postData.encrypt);
    let payload = JSON.parse(decodeString); // {"articleId":99,"mist":"Y2hv"}
    let md5Code = md5(req.method + req.url + payload.articleId);
    return {needCache: true, cacheId: md5Code}; // need to be cached
  } else {
    return null; // inspector should skip this request
  }
}

module.exports = insp; // Must be exported it as node module
```
然后在.justreq里进行配置
```json
{
  ...
  "inspector": ".jr/myInsp.js"
}
```

#### insp.js格式要求
```javascript
/**
 * @param  {object} req 由客户端请求产生的reqest对象
 * @param  {buffer} buf 客户端post过来的data
 * @return {json}       {needCache: <boolean>, cacheId: <md5>} or null
 */
function insp(req, buf) {
  ...
  return {needCache: <boolean>, cacheId: <md5>};
}
module.exports = insp; // 必须导出为node模块
```

#### 注意
* 返回的cacheId必须为32位md5编码。建议用`md5(req.method + req.url + bufData)`以避免缓存冲突。
* 如果insp返回值为null，将会跳过介入该客户端请求，交由justreq决定是否缓存。
* 为防阻塞http，提高性能，该介入脚本禁止使用异步操作及计时器(setTimeout、setInterval)


*********

### 其它配置项
|    name        |  description  
|----------------|:-----------------------------------------------------
| host           | 必须。将要代理的接口服务器主机名
| port           | 可选。将要代理的接口服务器端口，默认80。（如设为443，并且没有配置proxyHttps选项，将自动切换为https方式连接接口服务器）
| cacheTime      | 可选。多久更新缓存，默认20分钟
| cachePath      | 可选。缓存存放路径，默认.jr/cache
| substitutePath | 可选。替身文件存放路径，默认.jr/subs
| jrPort         | 可选。JR Server服务端口，默认8000
| proxyTimeout   | 可选。请求接口超时时间，默认6秒
| proxyHttps     | 可选。所请求的接口是否https，可选值为：auto、yes、no。默认auto（检测port是否443）。
| ssl_ca         | 可选。如果接口是https，并且需要数字证书，可使用该选项指定ca.pem存放地址
| ssl_key        | 可选。如果接口是https，并且需要数字证书，可使用该选项指定key.pem存放地址
| ssl_cert       | 可选。如果接口是https，并且需要数字证书，可使用该选项指定cert.pem存放地址
| onCors         | 可选。是否开启cors跨域，可选值为：yes、no，默认yes
| inspector      | 可选。指定自定义监视脚本，用于决定是否缓存请求。该脚本返回值的格式应为`{needCache: <boolean>, cacheId: <md5>}`
| rules          | 可选。参照[RULES配置](#user-content-rules)

*********

## DEMO
演示页面在examples目录。
进入该目录，直接双击`run_examples.cmd`（*linux用户运行`./run_examples`*）启动justreq。也可以在当前目录执行`justreq start`启动。
OK，一切准备就绪，现在可以打开任意html文件进行体验
[jrs.html](examples/jrs-cn.html)、[substitutes.html](examples/substitutes-cn.html)、[upload.html](examples/upload-cn.html)

*********

## 相关
[justreq](https://github.com/vilien/justreq)  - github

[issue](https://github.com/vilien/justreq/issues)

[blog](http://blog.csdn.net/binjly)

## 开源协议
本项目依据MIT开源协议发布，允许任何组织和个人免费使用。

[downloads-image]: https://img.shields.io/npm/dm/justreq.svg
[license-image]: https://img.shields.io/npm/l/justreq.svg?style=flat
[npm-image]: https://img.shields.io/npm/v/justreq.svg
[npm-url]: https://www.npmjs.com/package/justreq