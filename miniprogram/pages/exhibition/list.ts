// exhibition/list.ts
Component({
  data: { pageTitle: 'list' },
  lifetimes: { attached() { console.log('list页加载') } },
  methods: { 
    goBack() { wx.navigateBack() },
    showUnimplementedFeature() { wx.showToast({ title: '功能开发中，敬请期待！', icon: 'none', duration: 2000 }) }
  }
})
