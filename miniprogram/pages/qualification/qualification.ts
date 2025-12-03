// qualification.ts
// 资质公示页面

Component({
  data: {
    // TODO: 待更新 - 替换为真实的营业执照图片URL
    businessLicenseImage: '/images/bg.png', // 临时图片，需要替换为真实营业执照
    
    // 公司基本信息
    companyInfo: {
      name: '北京文博科技有限公司',
      creditCode: '91110000000000000X', // TODO: 待更新 - 真实统一社会信用代码
      businessScope: '软件开发、信息技术服务、文化传播',
      address: 'xxx', // TODO: 待更新 - 真实注册地址
      registrationDate: '2024年1月1日', // TODO: 待更新 - 真实注册日期
      registrationCapital: '100万元', // TODO: 待更新 - 真实注册资本
      legalRepresentative: '张三' // TODO: 待更新 - 真实法定代表人
    }
  },

  lifetimes: {
    attached() {
      console.log('资质公示页面加载完成')
    }
  },

  methods: {
    // 预览营业执照大图
    onPreviewLicense() {
      wx.previewImage({
        current: this.data.businessLicenseImage,
        urls: [this.data.businessLicenseImage]
      })
    },

    // 复制信用代码
    onCopyCreditCode() {
      wx.setClipboardData({
        data: this.data.companyInfo.creditCode,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          })
        }
      })
    },

    // 查询企业信息
    onQueryCompany() {
      wx.showModal({
        title: '查询企业信息',
        content: '可在国家企业信用信息公示系统查询详细信息',
        confirmText: '知道了',
        showCancel: false
      })
    }
  }
})
