# 微信小程序云开发实现网络爬虫
本项目是我在不花钱单独搭建第三方独立服务器的前提下利用小程序实现网络爬虫的探索成果；因为当时学校官网暂无手机版，手机端看学校新闻很费劲，于是突发奇想的想实现一个学校新闻汇总的微信小程序，并能实时同步更新。当然一段时间后学校官方网站有了移动端版本，所以我也不再维护此小程序，故此项目已无法运行，但是我希望的是记录一下用小程序进行爬虫的思路。

## 依赖
* 小程序云开发-云函数（担任后端服务器角色）
* cheerio.js（解析DOM结构，文档https://cheerio.js.org/）
* axios.js（HTTP请求，中文文档https://www.kancloud.cn/yunye/axios/234845）

## 分析过程
* 小程序端不能直接向未在后台备注的https网站发起请求，并且存在跨域问题，而且当时学校的网站还是http未加密的协议，所以不能直接使用小程序接口wx.request的请求方案。
* 要想实现解析HTML结构，就必须借助第三方依赖库的实现方案，类似jquery的库才能实现对DOM的操作，奈何小程序不支持DOM，但是支持NPM和云开发。
* 小程序云开发是一个免费的服务器应用，支持Node.js作为后端语言，可通过编写云函数来实现服务器同样的功能
  

## 实现步骤
1、按照官方的文档教程初始化本小程序的云开发环境，配置相应的初始化参数。  
2、小程序项目配置开启npm支持和es6编译。  
3、在云函数文件夹下创建云函数，在当前云函数初始化npm包管理工具，并下载cheerio和axios库，上传部署云函数。  
4、编写云函数过程：先使用axios爬取目标网站整体结构，再使用cheerio加载结构，通过使用cheerio提供的api完成爬虫数据分析，并返回小程序端。  
5、小程序请求过程：使用 `wx.cloud.callFunction()` 接口发起云函数请求即可。
<br>
code by FEZIRO
