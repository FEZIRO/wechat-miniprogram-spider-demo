// 云函数入口文件
const axios = require('axios')
const cloud = require('wx-server-sdk')
const cheerio = require('cheerio')
const BASE_URL = 'http://www.xhsysu.edu.cn';
const MAIN_NEWSLIST_URL = BASE_URL + '/web/news/xinhuaxinwen/';
const INTERNATIONAL_NEWSLIST_URL = BASE_URL + '/web/news/duiwaijiaoliu/guojijiaoliu/';
const ACADEMIC_AFFAIRS_NEWSLIST_URL = 'http://jwc.xhsysu.edu.cn/';
cloud.init();

function getNormalContent(p) {
	return new Promise((resolve, reject) => {
		axios.get(p).then(function (res) {
			var $ = cheerio.load(res.data);
			$('div.content').find('p').each(function (i, element) {
				articles[i] = $(this).text().replace(/ /g, '');
			});
			$('div.content').find('img').each(function (i, element) {
				pictures[i] = BASE_URL + $(this).attr('src');
			});
			$('div.tushi').each(function (i, element) {
				pictureHints[i] = $(this).text();
			});
			items.push({
				articles: articles,
				pictures: {
					src: pictures,
					hint: pictureHints
				},
				footer: $('div.luokuan').text().replace(/\n/g, '<br>')
			})
			return resolve(items);
		}).catch(function (err) {
			return reject(err);
		});
	})
};

function getAnnouncementContent(p) {
	return new Promise((resolve, reject) => {
		axios.get(p).then(function (res) {
			var $ = cheerio.load(res.data, {
				decodeEntities: false
			});
			$('form[name=_newscontent_fromname] p[class=vsbcontent_img]').remove();
			$('form[name=_newscontent_fromname] p[style="text-align: center;"]').remove();
			$('form[name=_newscontent_fromname] hr').remove();
			$('form[name=_newscontent_fromname] p').after('<br>');

			items.push({
				//content: $('div.jz').text().replace(/\n/g, '<br>').replace(/ /g, '')
				content: $('form[name=_newscontent_fromname] #vsb_content_2').html(),
				title: $('form[name=_newscontent_fromname] h3').text(),
				time: $('form[name=_newscontent_fromname] h6').text(),
			})
			return resolve(items);
		}).catch(function (err) {
			return reject(err);
		});
	})
};


// 云函数入口函数
exports.main = async(event, context) => {
    let thisPage = event.page;
    let items = [];
    let articles = [];
    let pictures = [];
    let pictureHints = [];


    switch (event.target) {
        case 'normalContent':
            return getNormalContent(thisPage);
            break;
        case 'announcementContent':
            return getAnnouncementContent(thisPage);
            break;
    }

}