// draft-list.ts
// 暂存草稿列表页面

import { checkinService } from '../../services/museum'
import { authService } from '../../services/auth'

Page({
  data: {
    draftList: [] as any[]
  },

  onLoad() {
    // 检查登录状态
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '查看暂存草稿需要登录后使用，是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            // 带上当前页面作为回调
            const redirectUrl = '/pages/draft-list/draft-list'
            wx.redirectTo({
              url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }
    
    this.loadDraftList()
  },

  onShow() {
    // 页面显示时刷新列表（从打卡页面返回时）
    this.loadDraftList()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadDraftList()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 加载暂存列表
  loadDraftList() {
    try {
      const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
      console.log('加载暂存数据:', allDrafts)
      console.log('暂存数据键值:', Object.keys(allDrafts))
      console.log('暂存数据数量:', Object.keys(allDrafts).length)
      
      const draftList = Object.entries(allDrafts).map(([key, draft]: [string, any]) => {
        // 如果暂存数据没有draftId，使用存储的key作为draftId
        if (!draft.draftId) {
          draft.draftId = key
        }
        // 格式化时间显示
        const saveTime = new Date(draft.saveTime)
        const now = new Date()
        const diffHours = Math.floor((now.getTime() - saveTime.getTime()) / (1000 * 60 * 60))
        
        let saveTimeText = ''
        if (diffHours < 1) {
          saveTimeText = '刚刚'
        } else if (diffHours < 24) {
          saveTimeText = `${diffHours}小时前`
        } else {
          const diffDays = Math.floor(diffHours / 24)
          saveTimeText = `${diffDays}天前`
        }

        // 格式化评分显示
        const ratingOptions = [
          { value: 1, label: '很差' },
          { value: 2, label: '一般' },
          { value: 3, label: '不错' },
          { value: 4, label: '很好' },
          { value: 5, label: '极佳' }
        ]
        const ratingOption = ratingOptions.find(option => option.value === draft.rating)
        const ratingText = ratingOption ? ratingOption.label : ''

        // 格式化心情显示
        const moodOptions = [
          { value: 'excited', label: '兴奋' },
          { value: 'happy', label: '开心' },
          { value: 'peaceful', label: '平静' },
          { value: 'thoughtful', label: '沉思' },
          { value: 'amazed', label: '震撼' }
        ]
        const moodOption = moodOptions.find(option => option.value === draft.selectedMood)
        const moodText = moodOption ? moodOption.label : ''

        return {
          ...draft,
          saveTimeText,
          ratingText,
          moodText
        }
      }).sort((a, b) => new Date(b.saveTime).getTime() - new Date(a.saveTime).getTime())

      console.log('处理后的暂存列表:', draftList)
      console.log('最终显示数量:', draftList.length)

      this.setData({
        draftList
      })
    } catch (error) {
      console.log('加载暂存列表失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 点击暂存项，跳转到编辑页面
  onDraftTap(e: WechatMiniprogram.BaseEvent) {
    const { draftId, museumId } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/checkin-action/checkin-action?id=${museumId}&draftId=${draftId}`
    })
  },

  // 删除暂存项
  async onDeleteDraft(e: WechatMiniprogram.BaseEvent) {
    const draftId = e.currentTarget.dataset.draftId
    console.log('删除暂存项点击，draftId:', draftId, '类型:', typeof draftId)
    
    if (!draftId) {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      return
    }
    
    // 确保 draftId 是字符串类型
    const draftIdStr = String(draftId)
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个暂存草稿吗？删除后无法恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 先尝试调用后端API删除
            const success = await checkinService.deleteDraft(draftIdStr)
            
            if (success) {
              console.log('后端删除成功')
            } else {
              console.log('后端删除失败，继续本地删除')
            }
          } catch (error) {
            console.log('后端删除失败:', error, '继续本地删除')
          }
          
          // 无论后端是否成功，都删除本地存储
          try {
            const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
            console.log('删除前的暂存数据:', allDrafts)
            console.log('要删除的draftIdStr:', draftIdStr)
            
            delete allDrafts[draftIdStr]
            wx.setStorageSync('all_checkin_drafts', allDrafts)
            
            console.log('删除后的暂存数据:', allDrafts)
            
            // 刷新列表
            this.loadDraftList()
            
            wx.showToast({
              title: '已删除',
              icon: 'success',
              duration: 1000
            })
          } catch (error) {
            console.log('本地删除失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },


  // 页面分享
  onShareAppMessage() {
    return {
      title: '我的打卡草稿',
      path: '/pages/draft-list/draft-list'
    }
  }
})
