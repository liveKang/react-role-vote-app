# role-voting-applications
React + Node.js + MongoDB + Socket.IO 角色投票应用

* 使用Node.js构建一个REST API
* 使用MongoDB保存和检索数据
* 使用Socket.IO跟踪在线的访问者
* 使用React + Flux和服务端渲染来构建单页面应用

###运行项目：

* git clone
* npm install
* bower install
* gulp
* npm run watch
* 浏览器打开http://localhost:3000/

###问题解决

* 当运行gulp时，报错，一个很奇怪的错误。
![](http://p1.bpimg.com/567571/cec642fa04e10812.png)
仔细看了问题，之后发现好像是bower_components下的一个css找不到。
呃呃，这个问题，有点搞，原因是在家里的时候，网络状况不佳，上次安装`bower install`的时候，没有
安装成功。出新害死人。。。

* 之前mac安装的mongoDB，一直运行不起来，提示`mongod commond is not found`
后来通过查阅资料后发现是环境变量PATH没有添加。
添加PATH后输入 `echo $PATH`发现并没有添加上来，重启下终端再次输入就ok了。
最后再设置下数据库的路径 mongod --dbpath 路径（如mongod --dbpath /USERS/dalong/data/db/）
