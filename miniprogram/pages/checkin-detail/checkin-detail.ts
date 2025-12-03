// checkin-detail.ts
// 打卡详情页面

import { checkinService } from '../../services/museum'

interface CheckInDetail {
  id: number
  museumId: number
  museumName: string
  museumAddress: string
  cityName: string
  provinceName: string
  checkInDate: string
  checkInTime: string
  photos: string[]
  notes: string
  rating: number
  mood: string
  weather: string
  companions: string[]
  tags: string[]
  location: {
    latitude: number
    longitude: number
  }
}

Page({
  data: {
    checkinId: 0,
    loading: true,
    error: null as string | null,
    
    // 打卡详情数据
    checkinDetail: null as CheckInDetail | null,
    
    // 显示选项
    showFullPhotos: false,
    showMap: false
  },

  onLoad(options: any) {
    const checkinId = parseInt(options.id)
    if (!checkinId) {
      this.setData({ 
        error: '打卡记录ID无效',
        loading: false 
      })
      return
    }
    
    this.setData({ checkinId })
    this.loadCheckinDetail()
  },

  // 加载打卡详情
  async loadCheckinDetail() {
    const { checkinId } = this.data
    console.log('加载打卡详情:', checkinId)
    
    this.setData({ loading: true, error: null })
    
    try {
      // 调用API获取打卡详情
      const checkinRecord = await checkinService.getCheckinDetail(checkinId)
      
      if (!checkinRecord) {
        throw new Error('打卡记录不存在')
      }
      
      console.log('API返回的打卡详情:', checkinRecord)
      
      // 解析地址获取省市信息
      let provinceName = '未知省份'
      let cityName = '未知城市'
      
      if (checkinRecord.address) {
        const addressParts = checkinRecord.address.split(/[省市区县]/);
        if (addressParts.length >= 2) {
          provinceName = addressParts[0] + (checkinRecord.address.includes('省') ? '省' : 
                       checkinRecord.address.includes('市') && !checkinRecord.address.includes('省') ? '市' : '')
          if (addressParts.length >= 3) {
            cityName = addressParts[1] + '市'
          } else if (addressParts[1]) {
            cityName = addressParts[1]
          }
        }
      }
      
      // 转换API数据格式为页面需要的格式
      const checkinDetail: CheckInDetail = {
        id: checkinRecord.id || checkinId,
        museumId: checkinRecord.museumId || 0,
        museumName: checkinRecord.museumName || '未知博物馆',
        museumAddress: checkinRecord.address || '',
        cityName,
        provinceName,
        checkInDate: checkinRecord.checkinTime ? checkinRecord.checkinTime.split(' ')[0] : '',
        checkInTime: checkinRecord.checkinTime ? checkinRecord.checkinTime.split(' ')[1] || '' : '',
        photos: Array.isArray(checkinRecord.photos) ? checkinRecord.photos : [],
        notes: checkinRecord.feeling || '',
        rating: checkinRecord.rating || 0,
        mood: this.getMoodLabel(checkinRecord.mood || ''),
        weather: this.getWeatherLabel(checkinRecord.weather || ''),
        companions: Array.isArray(checkinRecord.companions) ? checkinRecord.companions : [],
        tags: Array.isArray(checkinRecord.tags) ? checkinRecord.tags : [],
        location: {
          latitude: checkinRecord.latitude || 39.9163,
          longitude: checkinRecord.longitude || 116.3972
        }
      }
      
      this.setData({
        checkinDetail,
        loading: false
      })
      
      console.log('打卡详情加载成功:', checkinDetail)
      
    } catch (error: any) {
      console.error('加载打卡详情失败:', error)
      this.setData({
        error: error.message || '加载失败，请稍后重试',
        loading: false
      })
      
      // 如果API失败，显示错误提示，不使用模拟数据
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 获取心情标签（emoji + 文字）
  getMoodLabel(moodValue: string): string {
    const moodMap: { [key: string]: string } = {
      'excited': '😆 兴奋',
      'happy': '😊 开心',
      'peaceful': '😌 平静',
      'thoughtful': '🤔 沉思',
      'amazed': '😲 震撼'
    }
    return moodMap[moodValue] || moodValue || '😐 未知'
  },

  // 获取天气标签（emoji + 文字）
  getWeatherLabel(weatherValue: string): string {
    const weatherMap: { [key: string]: string } = {
      'sunny': '☀️ 晴朗',
      'cloudy': '☁️ 多云',
      'rainy': '🌧️ 下雨',
      'snowy': '❄️ 下雪',
      'windy': '💨 有风'
    }
    return weatherMap[weatherValue] || weatherValue || '❓ 未知'
  },

  // 查看完整照片
  onViewPhotos() {
    const { checkinDetail } = this.data
    if (!checkinDetail || !checkinDetail.photos.length) return
    
    wx.previewImage({
      urls: checkinDetail.photos,
      current: checkinDetail.photos[0]
    })
  },


  // 前往博物馆详情
  onViewMuseum() {
    const { checkinDetail } = this.data
    if (!checkinDetail) return
    
    wx.navigateTo({
      url: `/pages/museum/detail?id=${checkinDetail.museumId}`
    })
  },


  // 编辑打卡记录
  onEdit() {
    const { checkinDetail } = this.data
    if (!checkinDetail) return
    
    wx.showToast({
      title: '编辑功能开发中',
      icon: 'none'
    })
  },

  // 删除打卡记录
  onDelete() {
    const { checkinDetail } = this.data
    if (!checkinDetail) return
    
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条打卡记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.deleteCheckin()
        }
      }
    })
  },

  // 执行删除操作
  async deleteCheckin() {
    const { checkinId } = this.data
    
    try {
      wx.showLoading({ title: '删除中...' })
      
      // 调用后端删除打卡记录API
      await checkinService.deleteCheckinRecord(checkinId.toString())
      
      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error: any) {
      wx.hideLoading()
      wx.showToast({
        title: error.message || '删除失败',
        icon: 'error'
      })
    }
  },

  // 重新加载
  onRetry() {
    this.loadCheckinDetail()
  },

  // 分享配置
  onShareAppMessage() {
    const { checkinDetail } = this.data
    if (!checkinDetail) return {}
    
    return {
      title: `我在${checkinDetail.museumName}打卡了！`,
      path: `/pages/checkin-detail/checkin-detail?id=${checkinDetail.id}`,
      imageUrl: checkinDetail.photos[0] || ''
    }
  }
})
