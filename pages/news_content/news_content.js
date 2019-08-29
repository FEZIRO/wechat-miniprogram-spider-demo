// pages/news_content/news_content.js
var that;
wx.cloud.init();

Page({
	data: {
		loaded: false,
		url: '',
		title: '',
		time: '',
		article: '',
		articleFooter: '',
		contentTarget:''
	},

	onLoad: function (option) {
		that = this;
		var target = option.target
		wx.showLoading({
			title: '加载中',
		})
		that.setData({
			url: option.newsUrl,
			title:option.title,
			time:option.time,
			contentTarget: option.target
		});
		switch (option.target){
			case 'normal':
				wx.cloud.callFunction({
					name: 'getNewsContent',
					data: {
						page: that.data.url,
						target: 'normalContent'
					}
				}).then(res => {
					that.setData({
						article: res.result[0],
					});
					wx.hideLoading();
					that.setData({
						loaded: true
					});
					//console.log(that.data.article);
				}).catch(console.error);
				break;
			case 'announcement':
				wx.cloud.callFunction({
					name: 'getNewsContent',
					data: {
						page: that.data.url,
						target: 'announcementContent'
					}
				}).then(res => {
					console.log(res.result);
					that.setData({
						article: res.result[0].content,
						title: res.result[0].title,
						time: res.result[0].time,
					});
					wx.hideLoading();
					that.setData({
						loaded: true
					});
					console.log(that.data.article);
				}).catch(console.error);
				break;
		}
		
	},

	previewImage: function (e) {
		var that = this;
		var thisImgSrc = e.currentTarget.dataset.src;
		wx.previewImage({
			current: thisImgSrc,
			urls: that.data.article.pictures.src
		});
	}


})