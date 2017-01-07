# justreq
永不离线的测试接口服务，摆脱测试机离线之痛

## 特性

* 自动缓存每一次api请求，当测试服务器宕机时，依然可以从容开发
* api替身服务，当后台GG们还没开发好接口时，可以用json、txt等替代
* 独有JRS脚本，仿php，可以定制更灵活的api替身，甚至可以用来开发小型站点
* 支持ES6、ES7，开发更高效

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
运行以下命令即可启动justreq
```
justreq start
```

如果需要在启动的同时，更新缓存，可以用以下命令
```
justreq start -c
```

如果api地址临时改动了，而你又不想修改配置文件，可以用以下命令
```
justreq start -h api.yourhost.com
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
|----------|----------------------------------------
| $_GET    | 获取querystring
| $_POST   | 获取POST方式提交的表单数据
| $_COOKIE | 获取cookies
| $_HEADER | 获取header
| $_FILES  | 获取表单上传的文件。注意，如需要上传文件，须将form编码方式设置为enctype="multipart/form-data"
| $_TEMP   | 获取临时文件目录，所有上传的文件都暂存于此目录。该目录将不定时清理，如果需要存储，请及时将上传的文件移到其它位置。

#### 方法
|   name                 |  description  
|------------------------|---------------------------------------
| echo(string)           | 向页面输出字符串
| end([string])          | 结束当前脚本，输出字符串为可选参数。***注：请务必使用该方法结束脚本，否则脚本将运行至超时***
| sendFile(filepath)     | 也可直接使用文件做为输出。使用该方法时，不必再使用`end()`结束脚本
| setMime(suffix)        | 设置当前输出的mimetype；缺省将尝试json，如自动检测不通过，将切换为txt。可选值为：（txt、html、css、xml、json、js、jpg、jpeg、gif、png、svg）
| setCookie(name, value) | 设置输出的cookies
| setHeader(name, value) | 设置header，其中'Server'、'Date'、'Content-Length'由JR Server自动设置，不允许修改

由于***jrs***脚本完全基于js，并运行于Node.js环境，因此，你可以使用Node.js下面的一切优秀模块来进行开发。
并且，只要你的Node.js版本支持，你也可以使用ES6/ES7来编写***jrs***

## more
[justreq](https://github.com/vilien/justreq)  - github

[issue](https://github.com/vilien/justreq/issues)