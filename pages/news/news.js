//获取应用实例
const baseUrl = 'http://www.xhsysu.edu.cn';
const newsListUrl = baseUrl + '/web/news/xinhuaxinwen/';
const app = getApp();
wx.cloud.init();
var that;

Page({
    data: {
        bannerImgUrl: [
            'http://www.xhsysu.edu.cn/statics/images/index/index_wwn/1.jpg',
            'http://www.xhsysu.edu.cn/statics/images/index/index_wwn/6.jpg',
            'http://www.xhsysu.edu.cn/statics/images/index/index_wwn/2.jpg'
        ],
        mainNewsItems: '',
        intNewsItems: '',
        schoolClubNewsItems: '',
        upcomingActivityNewsItems: '',
        affairsAnnouncementItems: '',
        comment: '评论 ' + '0',
        thisPageNum: 1,
        loaded: false,
        navItems: [{
                text: '新华要闻'
            },
            {
                text: '教务公告'
            },
            {
                text: '活动预告'
            },
            {
                text: '社团风采'
            },
            {
                text: '国际交流'
            },
        ],
        currentNav: 0,
        navFixed: false,
        navTop: '',
    },

    //页面加载时
    onLoad: function() {
        that = this;
        wx.showLoading({
            title: '加载中',
        })
        wx.cloud.callFunction({
            name: 'getNewsList',
            data: {
                page: 'index',
                newsTarget: 'mainNews'
            }
        }).then(res => {
            that.setData({
                mainNewsItems: res.result,
                loaded: true
            });
            //console.log(that.data.mainNewsItems)
            wx.hideLoading();
        }).catch(console.error);

    },

    //滑动固定Nav
    onPageScroll: function(e) {
        if (e.scrollTop >= that.data.navTop) {
            if (that.data.navFixed) {
                return;
            }
            that.setData({
                navFixed: true,
            });
        } else {
            that.setData({
                navFixed: false,
            });
        }
    },

    //下拉刷新
    onPullDownRefresh: function() {
        wx.showLoading({
            title: '加载中',
        });
        switch (that.data.currentNav) {
            case 0:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'mainNews',
                    }
                }).then(res => {
                    that.setData({
                        mainNewsItems: res.result,
                    });
                    wx.hideLoading();
                    wx.stopPullDownRefresh();
                }).catch(console.error);
                break;
            case 1:
                wx.showLoading({
                    title: '加载中',
                });
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'upcomingActivityNews',
                    }
                }).then(res => {
                    that.setData({
                        upcomingActivityNewsItems: res.result,
                    });
                    wx.hideLoading();
                    wx.stopPullDownRefresh();
                }).catch(console.error);
                break;
            case 2:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'upcomingActivityNews',
                    }
                }).then(res => {
                    that.setData({
                        upcomingActivityNewsItems: res.result,
                    });
                    wx.hideLoading();
                    wx.stopPullDownRefresh();
                }).catch(console.error);
                break;
            case 3:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'schoolClubNews',
                    }
                }).then(res => {
                    that.setData({
                        schoolClubNewsItems: res.result,
                    });
                    wx.hideLoading();
                    wx.stopPullDownRefresh();
                }).catch(console.error);
                break;
            case 4:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'internationalNews',
                    }
                }).then(res => {
                    that.setData({
                        intNewsItems: res.result,
                        loaded: true
                    });
                    wx.hideLoading();
                    wx.stopPullDownRefresh();
                }).catch(console.error);
                break;
        };
    },

    //上拉加载更多
    onReachBottom: function() {
        let pageNum = that.data.thisPageNum,
        p = that.data.thisPageNum;
        p++;
        that.setData({
            thisPageNum: p
        })
        wx.showLoading({
            title: '加载更多',
        })
        switch (that.data.currentNav) {
            case 0:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: pageNum,
                        newsTarget: 'mainNews'
                    },
                    success: function(res) {
                        var thisMainNewsItems = that.data.mainNewsItems;
                        for (var i = 0; i < res.result.length; i++) {
                            thisMainNewsItems.push(res.result[i])
                        }
                        that.setData({
                            mainNewsItems: thisMainNewsItems,
                        });
                        wx.hideLoading();
                    },
                    fail: function(err) {
                        wx.showToast({
                            title: '刷新失败',
                            duration: 1000
                        })
                    }
                });
                break;

            case 1:
                /*
                	wx.cloud.callFunction({
                		name: 'getNewsList',
                		data: {
                			page: pageNum,
                			newsTarget: 'affairsAnnouncement'
                		},
                		success: function (res) {
                			//console.log(res.result);
                			var thisAAItems = that.data.affairsAnnouncementItems;
                			for (var i = 0; i < res.result.length; i++) {
                				thisAAItems.push(res.result[i])
                			}
                			that.setData({
                				affairsAnnouncementItems: thisAAItems,
                			});
                			wx.hideLoading();
                		},
                		fail: function (err) {
                			wx.showToast({
                				title: '刷新失败',
                				duration: 1000
                			})
                		}
                	});
                	break;
                	*/
                wx.hideLoading();
                break;
            case 2:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: pageNum,
                        newsTarget: 'upcomingActivityNews'
                    },
                    success: function(res) {
                        //console.log(res.result);
                        var thisUANewsItems = that.data.upcomingActivityNewsItems;
                        for (var i = 0; i < res.result.length; i++) {
                            thisUANewsItems.push(res.result[i])
                        }
                        that.setData({
                            upcomingActivityNewsItems: thisUANewsItems,
                        });
                        wx.hideLoading();
                    },
                    fail: function(err) {
                        wx.showToast({
                            title: '刷新失败',
                            duration: 1000
                        })
                    }
                });
                break;
            case 3: //请求社团风采新闻
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: pageNum,
                        newsTarget: 'schoolClubNews'
                    },
                    success: function(res) {
                        //console.log(res.result);
                        var thisSCNewsItems = that.data.schoolClubNewsItems;
                        for (var i = 0; i < res.result.length; i++) {
                            thisSCNewsItems.push(res.result[i])
                        }
                        that.setData({
                            schoolClubNewsItems: thisSCNewsItems,
                        });
                        wx.hideLoading();
                    },
                    fail: function(err) {
                        wx.showToast({
                            title: '刷新失败',
                            duration: 1000
                        })
                    }
                });
                break;
            case 4:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: pageNum,
                        newsTarget: 'internationalNews'
                    },
                    success: function(res) {
                        //console.log(res.result);
                        var thisIntNewsItems = that.data.intNewsItems;
                        for (var i = 0; i < res.result.length; i++) {
                            thisIntNewsItems.push(res.result[i])
                        }
                        that.setData({
                            intNewsItems: thisIntNewsItems,
                        });
                        wx.hideLoading();
                    },
                    fail: function(err) {
                        wx.showToast({
                            title: '刷新失败',
                            duration: 1000
                        })
                    }
                });
                break;
        }
    },

    previewImage: function(e) {
        let thisImgSrc = e.currentTarget.dataset.src;
        wx.previewImage({
            current: thisImgSrc,
            urls: that.data.bannerImgUrl
        });
    },

    switchNav: function(e) {
        let currNav = e.currentTarget.dataset.currentnav;
        that.setData({
            currentNav: currNav
        })
        wx.showLoading({
            title: '加载中',
        });
        switch (currNav) {
            case 0:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'mainNews',
                    }
                }).then(res => {
                    that.setData({
                        mainNewsItems: res.result,
                    });
                    wx.hideLoading();
                }).catch(console.error);
                break;
            case 1:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'affairsAnnouncement',
                    }
                }).then(res => {
                    that.setData({
                        affairsAnnouncementItems: res.result,
                    });
                    wx.hideLoading();
                }).catch(console.error);
                break;
            case 2:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'upcomingActivityNews',
                    }
                }).then(res => {
                    that.setData({
                        upcomingActivityNewsItems: res.result,
                    });
                    wx.hideLoading();
                }).catch(console.error);
                break;
            case 3:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'schoolClubNews',
                    }
                }).then(res => {
                    that.setData({
                        schoolClubNewsItems: res.result,
                    });
                    wx.hideLoading();
                }).catch(console.error);
                break;
            case 4:
                wx.cloud.callFunction({
                    name: 'getNewsList',
                    data: {
                        page: 'index',
                        newsTarget: 'internationalNews',
                    }
                }).then(res => {
                    that.setData({
                        intNewsItems: res.result,
                    });
                    wx.hideLoading();
                }).catch(console.error);
                break;
        }
    },

    //打开新闻详情+传递title和time参数
    openNewsContent: function(e) {
        let thisNewsUrl = e.currentTarget.dataset.newsUrl,
            thisTitle = e.currentTarget.dataset.title,
            time = e.currentTarget.dataset.time,
            target = 'normal';
        wx.navigateTo({
            url: '../news_content/news_content' + '?newsUrl=' + thisNewsUrl + '&title=' + thisTitle + '&time=' + time + '&target=' + target
        })
    },

    openAnnouncementContent: function(e) {
        let thisNewsUrl = e.currentTarget.dataset.newsUrl,
            thisTitle = e.currentTarget.dataset.title,
            time = e.currentTarget.dataset.time,
            target = 'announcement'
        wx.navigateTo({
            url: '../news_content/news_content' + '?newsUrl=' + thisNewsUrl + '&title=' + thisTitle + '&time=' + time + '&target=' + target
        })
    }
})