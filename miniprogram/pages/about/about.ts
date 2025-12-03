// about.ts
// 关于我们页面

interface AppFeature {
  id: number
  icon: string
  title: string
  description: string
}

interface TeamMember {
  id: number
  name: string
  role: string
  avatar: string
  description: string
}

interface ContactInfo {
  type: string
  label: string
  value: string
  action?: string
}

Component({
  data: {
    // 应用信息
    appInfo: {
      name: '文博探索',
      version: '1.0.0',
      description: '发现身边的文化宝藏，记录你的文博之旅',
      logo: '/images/Icon1.png'
    },

    // 功能特色
    features: [
      {
        id: 1,
        icon: '/images/Icon1.png',
        title: '智能定位',
        description: '精准定位附近博物馆，实时显示距离和路线'
      },
      {
        id: 2,
        icon: '/images/Icon2.png',
        title: '打卡记录',
        description: '记录每一次文化之旅，积累专属的文博足迹'
      },
      {
        id: 3,
        icon: '/images/Icon3.png',
        title: '展览推荐',
        description: '及时获取最新展览信息，不错过精彩内容'
      },
      {
        id: 4,
        icon: '/images/Icon4.png',
        title: '成就系统',
        description: '解锁文化成就，见证你的博物馆探索历程'
      }
    ] as AppFeature[],


    // 联系方式
    contactInfo: [
      {
        type: 'email',
        label: '邮箱联系',
        value: 'museumseek@163.com',
        action: 'copy'
      },
      {
        type: 'phone',
        label: '客服电话',
        value: '400-123-4567',
        action: 'call'
      },
      {
        type: 'address',
        label: '公司地址',
        value: 'xxx',
        action: 'copy'
      }
    ] as ContactInfo[],


    // 更新日志
    changelog: [
      {
        version: '1.0.0',
        date: '2024-01-01',
        expanded: false,  // 默认关闭
        features: [
          '全新发布文博探索小程序',
          '支持GPS定位查找附近博物馆',
          '实现博物馆打卡功能',
          '展览信息实时推送',
          '个人成就系统上线'
        ]
      }
    ],

    // 协议与说明列表
    legalItems: [
      {
        id: 'qualification',
        title: '资质公示',
        description: '查看平台相关资质证书和经营许可'
      },
      {
        id: 'agreement',
        title: '用户协议',
        description: '了解用户权利义务和服务条款'
      },
      {
        id: 'privacy',
        title: '隐私权政策',
        description: '了解我们如何保护您的隐私信息'
      }
    ]
  },

  lifetimes: {
    attached() {
      console.log('关于我们页面加载完成')
    }
  },

  methods: {
    // 更新日志展开/收起
    onToggleChangelog(e: WechatMiniprogram.BaseEvent) {
      const index = e.currentTarget.dataset.index
      const changelog = this.data.changelog
      changelog[index].expanded = !changelog[index].expanded
      
      this.setData({
        changelog: changelog
      })
    },

    // 协议与说明点击
    onLegalItemTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('协议点击:', id)
      
      switch (id) {
        case 'qualification':
          wx.navigateTo({
            url: '/pages/qualification/qualification'
          })
          break
        case 'agreement':
          wx.navigateTo({
            url: '/pages/agreement/agreement'
          })
          break
        case 'privacy':
          wx.navigateTo({
            url: '/pages/privacy/privacy'
          })
          break
        default:
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
      }
    },

    // 联系方式点击
    onContactTap(e: WechatMiniprogram.BaseEvent) {
      const index = e.currentTarget.dataset.index
      const contact = this.data.contactInfo[index]
      
      if (!contact) return

      switch (contact.action) {
        case 'copy':
          wx.setClipboardData({
            data: contact.value,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              })
            }
          })
          break
        case 'call':
          wx.makePhoneCall({
            phoneNumber: contact.value,
            fail: () => {
              wx.showToast({
                title: '拨打电话失败',
                icon: 'none'
              })
            }
          })
          break
        default:
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
      }
    },

    // 用户协议
    onUserAgreement() {
      wx.showModal({
        title: '用户协议',
        content: '用户协议详情页面开发中，敬请期待！',
        showCancel: false,
        confirmText: '知道了'
      })
    },

    // 隐私政策
    onPrivacyPolicy() {
      wx.showModal({
        title: '隐私政策',
        content: '隐私政策详情页面开发中，敬请期待！',
        showCancel: false,
        confirmText: '知道了'
      })
    },

    // 版本检查
    onCheckUpdate() {
      wx.showLoading({ title: '检查更新中...' })
      
      // 使用微信小程序的版本更新机制
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        // 检查更新结果
        if (res.hasUpdate) {
          wx.hideLoading()
          wx.showModal({
            title: '发现新版本',
            content: '发现新版本，是否重启应用更新？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 用户确认更新
                updateManager.onUpdateReady(() => {
                  updateManager.applyUpdate()
                })
              }
            }
          })
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '已是最新版本',
            icon: 'success'
          })
        }
      })
      
      updateManager.onUpdateFailed(() => {
        wx.hideLoading()
        wx.showToast({
          title: '检查更新失败',
          icon: 'error'
        })
      })
    },

    // 分享应用
    onShareApp() {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      })
    },

    // 页面分享
    onShareAppMessage() {
      return {
        title: '发现身边的文化宝藏 - 文博探索',
        path: '/pages/index/index',
        imageUrl: '/images/bg.png'
      }
    }
  }
})
