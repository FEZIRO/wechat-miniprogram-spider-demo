// 云函数入口文件
const axios = require('axios');
const cloud = require('wx-server-sdk');
const cheerio = require('cheerio');
const BASE_URL = 'http://www.xhsysu.edu.cn';
const MAIN_NEWSLIST_URL = BASE_URL + '/web/news/xinhuaxinwen/';
const INTERNATIONAL_NEWSLIST_URL = BASE_URL + '/web/news/duiwaijiaoliu/guojijiaoliu/';
const SCHOOLCLUB_NEWSLIST_URL = BASE_URL + '/web/news/jingjingxiaoyuan/shetuanfengcai/';
const UPCOMINGACTIVITY_NEWSLIST_URL = BASE_URL + '/web/news/jydt/huodongyugao/';
const ACADEMIC_AFFAIRS_NEWSLIST_URL = 'http://jwc.xhsysu.edu.cn/';
cloud.init();
function getNewsList(p) {
	return new Promise((resolve, reject) => {
		axios.get(p).then(function (res) {
			var $ = cheerio.load(res.data);
			$('div.column_list ul ul li').each(function (i, element) {
				var $element = $(element);
				//匹配时间的正则表达式
				var timePatt = /\d{4}\-\d{1,2}\-\d{1,2}\s*\d{2}\:\d{2}\:\d{2}/;
				items.push({
					imgPreviewUrl: BASE_URL + $element.find('img').attr('src'),
					title: $element.find('h4 a').text(),
					time: $element.find('p').first().text().match(timePatt),
					thisNewsUrl: BASE_URL + $element.find('a').first().attr('href'),
					target: 'normal'
				})
			})
			return resolve(items);
		}).catch(function (err) {
			return reject(err);
		});
	})
};

function getAffairsAnnouncementList(p) {
	return new Promise((resolve, reject) => {
		axios.get(p).then(function (res) {
			var $ = cheerio.load(res.data);
			$('div.col-md-4.marginright .col-sm-12 .noside .li').each(function (i, element) {
				var $element = $(element);
				items.push({
					id: i,
					title: $element.find('.pull-left').text(),
					time: $element.find('.pull-right').text(),
					thisNewsUrl: ACADEMIC_AFFAIRS_NEWSLIST_URL + $element.find('a').attr('href'),
					target: 'announcement'
				});
			});
			return resolve(items);
		}).catch(function (err) {
			return reject(err);
		});
	})
};

// 云函数入口函数
exports.main = async (event, context) => {
	let thisPage;
	let items = [];

	switch (event.newsTarget){
			case 'mainNews':
				thisPage = MAIN_NEWSLIST_URL + event.page + '.html';
				return getNewsList(thisPage);
				break;
			case 'internationalNews':
				thisPage = INTERNATIONAL_NEWSLIST_URL + event.page + '.html';
				return getNewsList(thisPage);
				break;
			case 'schoolClubNews':
				thisPage = SCHOOLCLUB_NEWSLIST_URL + event.page + '.html';
				return getNewsList(thisPage);
				break;
			case 'upcomingActivityNews':
				thisPage = UPCOMINGACTIVITY_NEWSLIST_URL + event.page + '.html';
				return getNewsList(thisPage);
				break;
			case 'affairsAnnouncement':
				//thisPage = ACADEMIC_AFFAIRS_NEWSLIST_URL + event.page + '.html';
				thisPage = ACADEMIC_AFFAIRS_NEWSLIST_URL;
				return getAffairsAnnouncementList(thisPage);
				break;				
			default:
				thisPage = MAIN_NEWSLIST_URL + event.page + '.html';
				return getNewsList(thisPage);
		}

}
