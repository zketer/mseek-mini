// settings.ts
// 设置页面

import { authService } from '../../services/auth'

interface SettingItem {
  id: string
  title: string
  description?: string
  type: 'switch' | 'navigation' | 'action'
  value?: boolean
  icon?: string
}

interface SettingGroup {
  title: string
  items: SettingItem[]
}

Page({
  data: {
    // 设置分组
    settingGroups: [
      {
        title: '通知设置',
        items: [
          {
            id: 'pushNotification',
            title: '推送通知',
            description: '接收展览、活动等相关通知',
            type: 'switch',
            value: true,
            icon: 'success'
          },
          {
            id: 'checkinReminder',
            title: '打卡提醒',
            description: '定时提醒您进行博物馆打卡',
            type: 'switch',
            value: false,
            icon: 'info'
          }
        ]
      },
      {
        title: '隐私设置',
        items: [
          {
            id: 'locationService',
            title: '位置服务',
            description: '用于查找附近博物馆和打卡定位',
            type: 'switch',
            value: true,
            icon: 'warn'
          },
          {
            id: 'dataSync',
            title: '数据同步',
            description: '同步打卡记录和收藏数据',
            type: 'switch',
            value: true,
            icon: 'success'
          }
        ]
      },
      {
        title: '应用设置',
        items: [
          {
            id: 'language',
            title: '语言设置',
            description: '当前：简体中文',
            type: 'navigation',
            icon: 'circle'
          },
          {
            id: 'theme',
            title: '主题设置',
            description: '当前：跟随系统',
            type: 'navigation',
            icon: 'circle'
          },
          {
            id: 'cache',
            title: '清除缓存',
            description: '清除应用缓存数据',
            type: 'action',
            icon: 'warn'
          }
        ]
      },
      {
        title: '账户管理',
        items: [
          {
            id: 'logout',
            title: '退出登录',
            description: '退出当前账户',
            type: 'action',
            icon: 'warn'
          }
        ]
      }
    ] as SettingGroup[]
  },

  onLoad() {
    console.log('设置页面加载')
    this.loadUserSettings()
  },

  // 加载用户设置
  loadUserSettings() {
    // 从本地存储加载用户设置
    const pushNotification = wx.getStorageSync('setting_pushNotification') !== false
    const checkinReminder = wx.getStorageSync('setting_checkinReminder') === true
    const locationService = wx.getStorageSync('setting_locationService') !== false
    const dataSync = wx.getStorageSync('setting_dataSync') !== false

    // 更新设置状态
    const settingGroups = this.data.settingGroups
    settingGroups[0].items[0].value = pushNotification
    settingGroups[0].items[1].value = checkinReminder
    settingGroups[1].items[0].value = locationService
    settingGroups[1].items[1].value = dataSync

    this.setData({ settingGroups })
  },

  // 设置项点击处理
  onSettingTap(e: WechatMiniprogram.BaseEvent) {
    const { groupIndex, itemIndex } = e.currentTarget.dataset
    const item = this.data.settingGroups[groupIndex].items[itemIndex]

    switch (item.type) {
      case 'switch':
        this.handleSwitchToggle(groupIndex, itemIndex, item)
        break
      case 'navigation':
        this.handleNavigation(item)
        break
      case 'action':
        this.handleAction(item)
        break
    }
  },

  // 处理开关切换
  handleSwitchToggle(groupIndex: number, itemIndex: number, item: SettingItem) {
    const newValue = !item.value
    
    // 更新数据
    const settingGroups = this.data.settingGroups
    settingGroups[groupIndex].items[itemIndex].value = newValue
    this.setData({ settingGroups })

    // 保存到本地存储
    wx.setStorageSync(`setting_${item.id}`, newValue)

    // 特殊处理
    switch (item.id) {
      case 'locationService':
        this.handleLocationServiceToggle(newValue)
        break
      case 'pushNotification':
        this.handlePushNotificationToggle(newValue)
        break
    }

    wx.showToast({
      title: newValue ? '已开启' : '已关闭',
      icon: 'success'
    })
  },

  // 处理位置服务切换
  handleLocationServiceToggle(enabled: boolean) {
    if (enabled) {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.userLocation']) {
            wx.authorize({
              scope: 'scope.userLocation',
              fail: () => {
                wx.showModal({
                  title: '位置权限',
                  content: '需要位置权限才能使用附近博物馆功能，请在设置中开启',
                  confirmText: '去设置',
                  success: (modalRes) => {
                    if (modalRes.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              }
            })
          }
        }
      })
    }
  },

  // 处理推送通知切换
  handlePushNotificationToggle(enabled: boolean) {
    if (enabled) {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.subscribeMessage']) {
            wx.requestSubscribeMessage({
              tmplIds: ['template_id_1', 'template_id_2'], // 实际的模板ID
              fail: () => {
                console.log('用户拒绝订阅消息')
              }
            })
          }
        }
      })
    }
  },

  // 处理导航类设置
  handleNavigation(item: SettingItem) {
    switch (item.id) {
      case 'language':
        wx.showToast({
          title: '暂不支持切换语言',
          icon: 'none'
        })
        break
      case 'theme':
        wx.showToast({
          title: '暂不支持主题切换',
          icon: 'none'
        })
        break
    }
  },

  // 处理操作类设置
  handleAction(item: SettingItem) {
    switch (item.id) {
      case 'cache':
        this.clearCache()
        break
      case 'logout':
        this.logout()
        break
    }
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除应用缓存吗？这不会影响您的个人数据',
      success: (res) => {
        if (res.confirm) {
          // 清除特定的缓存数据，保留用户设置
          const keysToKeep = ['setting_', 'user_', 'token_']
          
          wx.getStorageInfo({
            success: (info) => {
              info.keys.forEach(key => {
                const shouldKeep = keysToKeep.some(prefix => key.startsWith(prefix))
                if (!shouldKeep) {
                  wx.removeStorageSync(key)
                }
              })
              
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
            }
          })
        }
      }
    })
  },

  // 退出登录
  async logout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账户吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '退出中...' })
            
            // 调用认证服务退出登录
            await authService.logout()
            
            wx.showToast({
              title: '已退出登录',
              icon: 'success'
            })

            // 返回首页
            setTimeout(() => {
              wx.switchTab({
                url: '/pages/index/index'
              })
            }, 1500)
          } catch (error) {
            console.error('退出登录失败:', error)
            wx.showToast({
              title: '退出失败',
              icon: 'error'
            })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '设置 - 文博探索',
      path: '/pages/settings/settings'
    }
  }
})
