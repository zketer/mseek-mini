// map/map.ts
Component({
  data: { pageTitle: 'map' },
  lifetimes: { attached() { console.log('map页加载') } },
  methods: { 
    goBack() { wx.navigateBack() },
    showUnimplementedFeature() { wx.showToast({ title: '功能开发中，敬请期待！', icon: 'none', duration: 2000 }) }
  }
})
