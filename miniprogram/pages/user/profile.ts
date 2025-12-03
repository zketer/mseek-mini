// user/profile.ts
Component({
  data: { pageTitle: 'profile' },
  lifetimes: { attached() { console.log('profile页加载') } },
  methods: { 
    goBack() { wx.navigateBack() },
    showUnimplementedFeature() { wx.showToast({ title: '功能开发中，敬请期待！', icon: 'none', duration: 2000 }) }
  }
})
