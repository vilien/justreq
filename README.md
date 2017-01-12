# justreq(JR Server)
永不离线的测试接口服务，摆脱测试接口离线之痛

## 特性

* 自动缓存每一次接口请求，当测试服务器宕机时，依然可以从容开发
* 接口替身服务，当后台GG们还没开发好接口时，可以用json、txt等替代
* 独有jrs脚本，仿php，可以定制更灵活的接口替身，甚至可以用来开发小型站点
* 支持ES6、ES7，开发更高效
* 支持CORS跨域，前端开发也可以放心使用
* 支持https，无论接口采用http还是https，都能从容应对

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
配置完成后，将在当前目录生成“.justreq”文件，你可以随时按自己需求进行配置

## 使用
运行以下命令启动justreq
```
justreq start
```
然后把你的接口地址直接指向justreq服务（JR Server），例如：
```javascript
// const API_HOST = "https://test.youhost.com";
const API_HOST = "http://127.0.0.1:8000";
$.get(API_HOST + "/getInfo.do?userId=1001", func);
```
 
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

由于***jrs***脚本完全基于js，并运行于Node.js环境，因此，你可以使用Node.js下面的一切优秀模块来进行开发。
并且，只要你的Node.js版本支持，你也可以使用ES6/ES7来编写***jrs***

*********

<a id="rules"></a>
### RULES配置
为了更好的发挥justreq的功能，我们提供了一些配置规则

|    name    |  description  
|------------|:-----------------------------------------------------
| href       | 接口路径，必填。可以使用正则表达式
| ignoreArgs | 可忽略字段，以逗号分割，可以忽略一些非关键字段。例如跳过常见的防缓存的`?v=1483884433384`，则设置 `{"ignoreArgs" : "v"}`
| noCache    | 不允许缓存该接口，缺省值为允许
| subs       | 接口替身，推荐使用我们的jrs脚本，也可以是json、txt

以下是一份样例：

```json
// .justreq
{
    ...
  "rules": [
    {
      "href":       "user.do",
      "subs":       "user.jrs"
    },
    {
      "href":       "login.do",
      "noCache":    true
    },
    {
      "href":       "getGoodsInfo.do",
      "ignoreArgs": "v,token,timestamp"
    }
  ]
}
```

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
| rules          | 可选。参照[RULES配置](#user-content-rules)

## ChangeLog

### 2017-1-12
#### v0.2.2
* 添加jrs处理文件上传的demo
* 修复因网络延迟造成丢包的bug

### 2017-1-11
#### v0.2.1
* 使用http模块及pipe重构server.js
* 使用https模块实现https代理支持
* 使用pipe重构proxy.js
* 使用formidable重构jrs.js
* 错误处理优化，添加jrs脚本400错误处理
* 添加cors配置选项

### 2017-1-9
#### v0.1.3
* 修复jrs脚本set-cookies不成功的bug

### 2017-1-8
#### v0.1.2
* 添加cors跨域支持
* 完善examples

## 相关
[justreq](https://github.com/vilien/justreq)  - github

[issue](https://github.com/vilien/justreq/issues)

[blog](http://blog.csdn.net/binjly)

## 开源协议
本项目依据MIT开源协议发布，允许任何组织和个人免费使用。