// search/search.ts
Component({
  data: { pageTitle: '搜索博物馆' },
  lifetimes: { 
    attached() { 
      console.log('搜索页面加载') 
    } 
  },
  methods: { 
    goBack() { 
      wx.navigateBack() 
    },
    
    showUnimplementedFeature() { 
      wx.showToast({ 
        title: '功能开发中，敬请期待！', 
        icon: 'none', 
        duration: 2000 
      }) 
    },

    // 下拉刷新
    onPullDownRefresh() {
      console.log('搜索页面下拉刷新')
      // TODO: 实现搜索结果刷新逻辑
      wx.stopPullDownRefresh()
    }
  }
})
