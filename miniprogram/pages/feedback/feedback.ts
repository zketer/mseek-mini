// feedback.ts
// 反馈建议页面

import { feedbackService } from '../../services/museum'

interface FeedbackType {
  id: string
  name: string
  icon: string
}

Page({
  data: {
    // 反馈类型
    feedbackTypes: [
      { id: 'bug', name: '问题反馈', icon: 'warn' },
      { id: 'feature', name: '功能建议', icon: 'success' },
      { id: 'content', name: '内容建议', icon: 'info' },
      { id: 'other', name: '其他建议', icon: 'circle' }
    ] as FeedbackType[],
    
    // 表单数据
    selectedType: '',
    selectedTypeName: '',
    feedbackContent: '',
    contactInfo: '',
    
    // 提交状态
    submitting: false
  },

  onLoad() {
    console.log('反馈建议页面加载')
  },

  // 选择反馈类型
  onSelectType(e: WechatMiniprogram.BaseEvent) {
    const type = e.currentTarget.dataset.type
    const typeName = e.currentTarget.dataset.name
    
    this.setData({
      selectedType: type,
      selectedTypeName: typeName
    })
  },

  // 输入反馈内容
  onContentInput(e: WechatMiniprogram.Input) {
    this.setData({
      feedbackContent: e.detail.value
    })
  },

  // 输入联系方式
  onContactInput(e: WechatMiniprogram.Input) {
    this.setData({
      contactInfo: e.detail.value
    })
  },

  // 提交反馈
  async onSubmitFeedback() {
    const { selectedType, selectedTypeName, feedbackContent, contactInfo } = this.data

    // 表单验证
    if (!selectedType) {
      wx.showToast({
        title: '请选择反馈类型',
        icon: 'none'
      })
      return
    }

    if (!feedbackContent.trim()) {
      wx.showToast({
        title: '请输入反馈内容',
        icon: 'none'
      })
      return
    }

    if (feedbackContent.trim().length < 10) {
      wx.showToast({
        title: '反馈内容至少10个字符',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    // 准备邮件内容
    const emailData = {
      type: selectedType,
      typeName: selectedTypeName,
      content: feedbackContent.trim(),
      contact: contactInfo.trim() || '未提供',
      timestamp: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      userAgent: 'WeChat MiniProgram - 文博探索'
    }

    // 发送反馈到后端API
    try {
      const result = await feedbackService.submitFeedback({
        to: 'museumseek@163.com',
        subject: `【文博探索】${emailData.typeName} - 用户反馈`,
        type: emailData.type,
        typeName: emailData.typeName,
        content: emailData.content,
        contact: emailData.contact,
        timestamp: emailData.timestamp,
        userAgent: emailData.userAgent
      })

      console.log('反馈提交成功:', result)
      this.setData({ submitting: false })
      
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      })

      // 重置表单
      setTimeout(() => {
        this.setData({
          selectedType: '',
          selectedTypeName: '',
          feedbackContent: '',
          contactInfo: ''
        })
      }, 1500)

    } catch (err) {
      console.error('反馈提交失败:', err)
      this.setData({ submitting: false })
      
      wx.showToast({
        title: '提交失败，请稍后重试',
        icon: 'error'
      })
    }
  },


  // 清空表单
  onClearForm() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前填写的内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            selectedType: '',
            selectedTypeName: '',
            feedbackContent: '',
            contactInfo: ''
          })
          wx.showToast({
            title: '已清空',
            icon: 'success'
          })
        }
      }
    })
  },

  // 分享页面
  onShareAppMessage() {
    return {
      title: '反馈建议 - 文博探索',
      path: '/pages/feedback/feedback'
    }
  }
})