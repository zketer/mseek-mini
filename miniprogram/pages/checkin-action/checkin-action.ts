// checkin-action.ts
// 博物馆打卡功能页面

import { checkinService, CheckinRecord, museumService } from '../../services/museum'
import { authService } from '../../services/auth'

interface MuseumInfo {
  id: number
  name: string
  image: string
  address: string
  distance: string
  canCheckin: boolean
  longitude?: number
  latitude?: number
}

Page({
  data: {
    museumInfo: {} as MuseumInfo,
    photos: [] as string[],
    feeling: '',
    rating: 0,
    selectedMood: '',
    selectedWeather: '',
    companionInput: '',
    companions: [] as string[],
    tagInput: '',
    tags: [] as string[],
    loading: false,
    currentDraftId: '', // 当前正在编辑的暂存ID，如果为空则是新暂存
    canSubmitCheckin: false, // 是否可以提交打卡
    
    // 用户位置信息
    userLocation: {
      longitude: 0,
      latitude: 0,
      hasLocation: false
    } as {
      longitude: number,
      latitude: number,
      hasLocation: boolean
    },
    
    // 评分选项
    ratingOptions: [
      { value: 1, label: '很差' },
      { value: 2, label: '一般' },
      { value: 3, label: '不错' },
      { value: 4, label: '很好' },
      { value: 5, label: '极佳' }
    ],
    
    // 心情选项
    moodOptions: [
      { value: 'excited', label: '兴奋', emoji: '😆' },
      { value: 'happy', label: '开心', emoji: '😊' },
      { value: 'peaceful', label: '平静', emoji: '😌' },
      { value: 'thoughtful', label: '沉思', emoji: '🤔' },
      { value: 'amazed', label: '震撼', emoji: '😲' }
    ],
    
    // 天气选项
    weatherOptions: [
      { value: 'sunny', label: '晴朗', emoji: '☀️' },
      { value: 'cloudy', label: '多云', emoji: '☁️' },
      { value: 'rainy', label: '下雨', emoji: '🌧️' },
      { value: 'snowy', label: '下雪', emoji: '❄️' },
      { value: 'windy', label: '有风', emoji: '💨' }
    ]
  },

  onLoad(options: { id?: string, museumId?: string, fresh?: string, draftId?: string }) {
    // 检查登录状态
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '打卡功能需要登录后使用，是否前往登录？',
        success: (res) => {
          if (res.confirm) {
            // 构建当前页面的完整URL作为回调
            const currentUrl = getCurrentPages()[getCurrentPages().length - 1].route
            const currentOptions = Object.keys(options).map(key => `${key}=${options[key as keyof typeof options]}`).join('&')
            const redirectUrl = currentOptions ? `/${currentUrl}?${currentOptions}` : `/${currentUrl}`
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
    
    const museumId = options.id || options.museumId
    const isFresh = options.fresh === 'true' // 检查是否是新的打卡
    const draftId = options.draftId // 特定的暂存ID
    
    // 保存当前的暂存ID（如果有的话）
    if (draftId) {
      this.setData({ currentDraftId: draftId })
    }
    
    if (museumId) {
      // 先获取用户位置，再加载博物馆信息
      this.getUserLocation().then(() => {
        this.loadMuseumInfo(parseInt(museumId))
      }).catch(() => {
        // 即使获取位置失败，也要加载博物馆信息
        this.loadMuseumInfo(parseInt(museumId))
      })
      
      // 如果有特定的draftId，加载该暂存
      if (draftId) {
        this.loadSpecificDraft(draftId)
      } else if (!isFresh) {
        // 只有不是新打卡时才恢复暂存内容（兼容旧逻辑）
        this.loadDraftData(parseInt(museumId))
      } else {
        console.log('新打卡，不加载暂存内容')
      }
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 获取用户GPS位置
  async getUserLocation(): Promise<void> {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          console.log('获取用户位置成功')
          this.setData({
            'userLocation.longitude': res.longitude,
            'userLocation.latitude': res.latitude,
            'userLocation.hasLocation': true
          })
          resolve()
        },
        fail: (error) => {
          console.error('获取用户位置失败:', error)
          wx.showModal({
            title: '位置权限',
            content: '获取位置失败，将无法计算距离。请在系统设置中开启位置权限。',
            showCancel: false,
            confirmText: '知道了'
          })
          reject(error)
        }
      })
    })
  },

  // 计算两点之间的直线距离（单位：米）
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const radLat1 = lat1 * Math.PI / 180.0
    const radLat2 = lat2 * Math.PI / 180.0
    const a = radLat1 - radLat2
    const b = lng1 * Math.PI / 180.0 - lng2 * Math.PI / 180.0
    let s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + 
                           Math.cos(radLat1) * Math.cos(radLat2) * 
                           Math.pow(Math.sin(b / 2), 2)))
    s = s * 6378137.0 // 地球半径
    s = Math.round(s * 10000) / 10000
    return s
  },

  // 格式化距离显示
  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${Math.round(distance)}m`
    } else {
      return `${(distance / 1000).toFixed(1)}km`
    }
  },

  // 加载博物馆信息
  async loadMuseumInfo(museumId: number) {
    console.log('开始加载博物馆信息，ID:', museumId)
    
    wx.showLoading({ title: '加载中...' })
    
    try {
      // 调用博物馆详情API
      const museum = await museumService.getMuseumDetail(museumId)
      
      if (museum) {
        // 计算距离和打卡权限
        let distance = '位置未知'
        let canCheckin = false
        const { userLocation } = this.data
        
        if (userLocation.hasLocation && museum.longitude && museum.latitude) {
          const distanceInMeters = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            museum.latitude,
            museum.longitude
          )
          distance = this.formatDistance(distanceInMeters)
          // 设置打卡范围：500米内可以打卡
          canCheckin = distanceInMeters <= 500
          console.log('位置计算完成，更新打卡状态')
          
          // 如果距离过远，显示提示
          if (!canCheckin) {
            setTimeout(() => {
              wx.showModal({
                title: '距离提醒',
                content: `您当前距离博物馆约${distance}，建议在500米范围内打卡以获得更好的体验。`,
                showCancel: false,
                confirmText: '知道了'
              })
            }, 1000)
          }
        } else if (!userLocation.hasLocation) {
          // 没有位置权限时，允许打卡但提示距离未知  
          canCheckin = true
          distance = '位置未知'
        } else {
          // 博物馆没有位置信息时
          canCheckin = true
          distance = '位置未知'
        }

        // 转换API数据格式为页面需要的格式
        const museumInfo: MuseumInfo = {
          id: museum.id,
          name: museum.name,
          image: '/images/bg.png', // 暂时使用默认图片，等后端API提供图片字段后再修改
          address: museum.address || '地址未知',
          distance: distance,
          canCheckin: canCheckin,
          longitude: museum.longitude,
          latitude: museum.latitude
        }
        
        this.setData({ museumInfo })
        
        // 更新按钮状态
        this.updateSubmitButtonState()
        
        console.log('博物馆信息加载成功:', museum.name)
      } else {
        wx.showToast({
          title: '博物馆信息未找到',
          icon: 'error'
        })
      }
    } catch (error) {
      console.error('加载博物馆信息失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载特定的暂存数据
  loadSpecificDraft(draftId: string) {
    try {
      const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
      const draftData = allDrafts[draftId]
      
      if (draftData) {
        this.setData({
          photos: draftData.photos || [],
          feeling: draftData.feeling || '',
          rating: draftData.rating || 0,
          selectedMood: draftData.mood || draftData.selectedMood || '', // 兼容新旧字段名
          selectedWeather: draftData.weather || draftData.selectedWeather || '', // 兼容新旧字段名
          companions: draftData.companions || [],
          tags: draftData.tags || []
        })
        
        // 更新按钮状态
        this.updateSubmitButtonState()
        
        wx.showToast({
          title: '已恢复暂存内容',
          icon: 'none',
          duration: 2000
        })
        
        console.log('加载特定暂存内容:', draftData)
      } else {
        console.log('未找到指定的暂存数据:', draftId)
      }
    } catch (error) {
      console.log('加载特定暂存数据失败:', error)
    }
  },

  // 加载暂存数据
  loadDraftData(museumId: number) {
    try {
      // 优先从统一的暂存列表中加载该博物馆最新的暂存
      const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
      console.log('加载暂存数据，所有暂存:', allDrafts)
      console.log('目标博物馆ID:', museumId)
      
      // 查找该博物馆的所有暂存，选择最新的一个
      let draftData = null
      let latestTimestamp = 0
      
      for (const [draftId, draft] of Object.entries(allDrafts)) {
        const typedDraft = draft as any
        if (typedDraft.museumId === museumId) {
          // 从draftId中提取时间戳（格式：museumId_timestamp）
          const timestampMatch = draftId.match(/_(\d+)$/)
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : 0
          
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp
            draftData = typedDraft
            console.log('找到更新的暂存:', draftId, timestamp)
          }
        }
      }
      
      // 如果没有找到，尝试从旧的单个暂存中加载（兼容性）
      if (!draftData) {
        const oldDraftData = wx.getStorageSync('checkin_draft')
        if (oldDraftData && oldDraftData.museumId === museumId) {
          draftData = oldDraftData
          console.log('使用旧格式暂存数据')
        }
      }
      
      if (draftData) {
        // 恢复暂存的数据
        this.setData({
          photos: draftData.photos || [],
          feeling: draftData.feeling || '',
          rating: draftData.rating || 0,
          selectedMood: draftData.mood || draftData.selectedMood || '', // 兼容新旧字段名
          selectedWeather: draftData.weather || draftData.selectedWeather || '', // 兼容新旧字段名
          companions: draftData.companions || [],
          tags: draftData.tags || []
        })
        
        // 更新按钮状态
        this.updateSubmitButtonState()
        
        // 提示用户已恢复暂存内容
        wx.showToast({
          title: '已恢复暂存内容',
          icon: 'none',
          duration: 2000
        })
        
        console.log('暂存数据已恢复到页面，数据:', draftData)
      } else {
        console.log('未找到博物馆ID为', museumId, '的暂存数据')
      }
    } catch (error) {
      console.log('加载暂存数据失败:', error)
    }
  },

  // 添加照片
  onAddPhoto() {
    const { photos } = this.data
    if (photos.length >= 9) {
      wx.showToast({
        title: '最多添加9张照片',
        icon: 'none'
      })
      return
    }

    // 显示选择方式
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.takePhoto()
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.chooseFromAlbum()
        }
      }
    })
  },

  // 拍照
  takePhoto() {
    const { photos } = this.data
    wx.chooseImage({
      count: Math.min(9 - photos.length, 3),
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        this.setData({
          photos: [...photos, ...res.tempFilePaths]
        })
        this.updateSubmitButtonState()
      },
      fail: () => {
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        })
      }
    })
  },

  // 从相册选择
  chooseFromAlbum() {
    const { photos } = this.data
    wx.chooseImage({
      count: Math.min(9 - photos.length, 9),
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          photos: [...photos, ...res.tempFilePaths]
        })
        this.updateSubmitButtonState()
      },
      fail: () => {
        wx.showToast({
          title: '选择照片失败',
          icon: 'none'
        })
      }
    })
  },

  // 预览照片
  onPreviewPhoto(e: WechatMiniprogram.BaseEvent) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: index,
      urls: this.data.photos
    })
  },

  // 删除照片
  onDeletePhoto(e: WechatMiniprogram.BaseEvent) {
    const index = e.currentTarget.dataset.index
    const { photos } = this.data
    photos.splice(index, 1)
    this.setData({ photos })
    this.updateSubmitButtonState()
  },

  // 输入感受
  onFeelingInput(e: WechatMiniprogram.Input) {
    this.setData({
      feeling: e.detail.value
    })
    this.updateSubmitButtonState()
  },

  // 评分
  onRatingTap(e: WechatMiniprogram.BaseEvent) {
    const rating = parseInt(e.currentTarget.dataset.rating)
    console.log('评分点击:', rating)
    this.setData({ rating })
    this.updateSubmitButtonState()
    
    // 找到对应的评分标签
    const ratingOption = this.data.ratingOptions.find(option => option.value === rating)
    const ratingLabel = ratingOption ? ratingOption.label : `${rating}星`
    
    // 给用户反馈
    wx.showToast({
      title: `评分：${ratingLabel}`,
      icon: 'none',
      duration: 1000
    })
  },

  // 选择心情
  onMoodSelect(e: WechatMiniprogram.BaseEvent) {
    const mood = e.currentTarget.dataset.mood
    this.setData({ selectedMood: mood })
    this.updateSubmitButtonState()
  },

  // 选择天气
  onWeatherSelect(e: WechatMiniprogram.BaseEvent) {
    const weather = e.currentTarget.dataset.weather
    this.setData({ selectedWeather: weather })
    this.updateSubmitButtonState()
  },

  // 输入同行伙伴
  onCompanionInput(e: WechatMiniprogram.Input) {
    this.setData({
      companionInput: e.detail.value
    })
  },

  // 添加同行伙伴
  onAddCompanion() {
    const { companionInput, companions } = this.data
    if (companionInput.trim()) {
      if (companions.includes(companionInput.trim())) {
        wx.showToast({
          title: '伙伴已存在',
          icon: 'none'
        })
        return
      }
      this.setData({
        companions: [...companions, companionInput.trim()],
        companionInput: ''
      })
    }
  },

  // 删除同行伙伴
  onDeleteCompanion(e: WechatMiniprogram.BaseEvent) {
    const index = e.currentTarget.dataset.index
    const { companions } = this.data
    companions.splice(index, 1)
    this.setData({ companions })
  },

  // 输入标签
  onTagInput(e: WechatMiniprogram.Input) {
    this.setData({
      tagInput: e.detail.value
    })
  },

  // 添加标签
  onAddTag() {
    const { tagInput, tags } = this.data
    if (tagInput.trim()) {
      if (tags.includes(tagInput.trim())) {
        wx.showToast({
          title: '标签已存在',
          icon: 'none'
        })
        return
      }
      this.setData({
        tags: [...tags, tagInput.trim()],
        tagInput: ''
      })
    }
  },

  // 删除标签
  onDeleteTag(e: WechatMiniprogram.BaseEvent) {
    const index = e.currentTarget.dataset.index
    const { tags } = this.data
    tags.splice(index, 1)
    this.setData({ tags })
  },

  // 验证必填字段
  validateRequiredFields() {
    const { rating, selectedMood, selectedWeather, feeling } = this.data
    const errors: string[] = []

    if (!rating || rating === 0) {
      errors.push('请选择评分')
    }
    if (!selectedMood) {
      errors.push('请选择心情')
    }
    if (!selectedWeather) {
      errors.push('请选择天气')
    }
    if (!feeling || feeling.trim() === '') {
      errors.push('请填写打卡感受')
    }

    if (errors.length > 0) {
      wx.showToast({
        title: errors[0], // 显示第一个错误
        icon: 'none',
        duration: 2000
      })
      return false
    }
    return true
  },

  // 更新提交按钮状态
  updateSubmitButtonState() {
    const { museumInfo, rating, selectedMood, selectedWeather, feeling } = this.data
    const canSubmitCheckin = museumInfo.canCheckin && 
                            rating > 0 && 
                            !!selectedMood && 
                            !!selectedWeather &&
                            !!feeling && feeling.trim() !== ''
    this.setData({ canSubmitCheckin })
  },

  // 智能跳转到打卡页面
  navigateToCheckinPage() {
    const pages = getCurrentPages()
    console.log('当前页面栈:', pages.map(p => p.route))
    
    if (pages.length > 1) {
      // 有上一页，尝试返回
      const prevPage = pages[pages.length - 2]
      console.log('上一页路径:', prevPage.route)
      
      if (prevPage.route.includes('checkin')) {
        // 上一页是打卡相关页面，直接返回
        console.log('上一页是打卡页面，执行navigateBack')
        wx.navigateBack({
          delta: 1,
          fail: (error) => {
            console.log('navigateBack失败:', error)
            this.redirectToCheckinPage()
          }
        })
      } else {
        // 上一页不是打卡页面，直接跳转
        console.log('上一页不是打卡页面，直接跳转')
        this.redirectToCheckinPage()
      }
    } else {
      // 当前是第一页，直接跳转
      console.log('当前是第一页，直接跳转到打卡页面')
      this.redirectToCheckinPage()
    }
  },

  // 重定向到打卡页面
  redirectToCheckinPage() {
    wx.redirectTo({
      url: '/pages/checkin/checkin',
      fail: (error) => {
        console.log('redirectTo失败，尝试switchTab:', error)
        // 如果打卡页面是tabBar页面，使用switchTab
        wx.switchTab({
          url: '/pages/checkin/checkin',
          fail: (switchError) => {
            console.log('switchTab也失败:', switchError)
            wx.showToast({
              title: '跳转失败',
              icon: 'error'
            })
          }
        })
      }
    })
  },

  // 暂存打卡内容
  async onSaveDraft() {
    // 验证必填字段
    if (!this.validateRequiredFields()) {
      return
    }

    const { museumInfo, photos, feeling, rating, selectedMood, selectedWeather, companions, tags, currentDraftId } = this.data
    
    // 如果是编辑现有暂存，使用现有ID；如果是新暂存，生成新ID
    const draftId = currentDraftId || `${museumInfo.id}_${Date.now()}`
    
    console.log('保存暂存，当前draftId:', currentDraftId, '最终使用draftId:', draftId)
    
    // 构建打卡数据
    const checkinData: CheckinRecord = {
      museumId: museumInfo.id,
      museumName: museumInfo.name,
      photos,
      feeling,
      rating,
      mood: selectedMood,
      weather: selectedWeather,
      companions,
      tags,
      isDraft: true,  // 标识为暂存
      draftId,
      location: {
        longitude: this.data.userLocation.hasLocation ? this.data.userLocation.longitude : 0,
        latitude: this.data.userLocation.hasLocation ? this.data.userLocation.latitude : 0,
        address: museumInfo.address
      }
    }
    
    try {
      // 调用后端API保存暂存
      const response = await checkinService.submitCheckin(checkinData)
      
      if (response.success) {
        // 同时保存到本地存储（用于离线支持和快速加载）
        const localDraftData = {
          ...checkinData,
          saveTime: new Date().toISOString(),
          id: response.id
        }
        
        const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
        allDrafts[draftId] = localDraftData
        wx.setStorageSync('all_checkin_drafts', allDrafts)
        
        // 为了兼容旧的单个暂存逻辑，也保存到旧的key
        wx.setStorageSync('checkin_draft', localDraftData)
        
        // 更新当前暂存ID，这样再次点击暂存时会更新而不是创建新的
        this.setData({ currentDraftId: draftId })
        
        wx.showToast({
          title: currentDraftId ? '已更新' : '已暂存',
          icon: 'success',
          duration: 800
        })
        
        console.log('暂存成功:', response)
        
        // 暂存成功后跳转回打卡页面
        setTimeout(() => {
          console.log('暂存成功，准备跳转回打卡页面')
          this.navigateToCheckinPage()
        }, 800)
      } else {
        throw new Error(response.message || '暂存失败')
      }
    } catch (error) {
      console.log('暂存失败:', error)
      
      // 如果API调用失败，降级到本地存储
      try {
        const localDraftData = {
          ...checkinData,
          saveTime: new Date().toISOString()
        }
        
        const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
        allDrafts[draftId] = localDraftData
        wx.setStorageSync('all_checkin_drafts', allDrafts)
        wx.setStorageSync('checkin_draft', localDraftData)
        
        // 更新当前暂存ID，这样再次点击暂存时会更新而不是创建新的
        this.setData({ currentDraftId: draftId })
        
        wx.showToast({
          title: currentDraftId ? '已更新' : '已本地暂存',
          icon: 'success',
          duration: 800
        })
        
        setTimeout(() => {
          console.log('本地暂存成功，准备跳转回打卡页面')
          this.navigateToCheckinPage()
        }, 800)
      } catch (localError) {
        wx.showToast({
          title: '暂存失败',
          icon: 'error'
        })
      }
    }
  },

  // 提交打卡
  async onSubmitCheckin() {
    const { museumInfo, photos, feeling, rating, selectedMood, selectedWeather, companions, tags } = this.data

    if (!museumInfo.canCheckin) {
      wx.showToast({
        title: '请靠近博物馆后再打卡',
        icon: 'none'
      })
      return
    }

    // 验证必填字段
    if (!this.validateRequiredFields()) {
      return
    }

    this.setData({ loading: true })

    // 构建打卡数据
    const checkinData: CheckinRecord = {
      museumId: museumInfo.id,
      museumName: museumInfo.name,
      photos,
      feeling,
      rating,
      mood: selectedMood,
      weather: selectedWeather,
      companions,
      tags,
      isDraft: false,  // 标识为正式打卡
      location: {
        longitude: this.data.userLocation.hasLocation ? this.data.userLocation.longitude : 0,
        latitude: this.data.userLocation.hasLocation ? this.data.userLocation.latitude : 0,
        address: museumInfo.address
      }
    }

    try {
      // 调用后端API提交打卡
      const response = await checkinService.submitCheckin(checkinData)
      
      if (response.success) {
        // 清除相关的暂存数据
        try {
          const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
          
          // 清除所有与该博物馆相关的暂存数据
          Object.keys(allDrafts).forEach(key => {
            const draft = allDrafts[key]
            if (draft.museumId === museumInfo.id) {
              delete allDrafts[key]
            }
          })
          
          wx.setStorageSync('all_checkin_drafts', allDrafts)
          
          // 清除旧的单个暂存（兼容性）
          const oldDraft = wx.getStorageSync('checkin_draft')
          if (oldDraft && oldDraft.museumId === museumInfo.id) {
            wx.removeStorageSync('checkin_draft')
          }
        } catch (error) {
          console.log('清除暂存数据失败:', error)
        }
        
        this.setData({ loading: false })
        
        wx.showToast({
          title: '打卡成功！',
          icon: 'success',
          duration: 2000
        })

        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/checkin-detail/checkin-detail?id=${response.id}`
          })
        }, 2000)
      } else {
        throw new Error(response.message || '打卡失败')
      }
    } catch (error) {
      this.setData({ loading: false })
      console.log('打卡失败:', error)
      
      wx.showToast({
        title: (error as Error).message || '打卡失败，请重试',
        icon: 'error',
        duration: 2000
      })
    }
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: `我在${this.data.museumInfo.name}打卡啦！`,
      path: `/pages/museum/detail?id=${this.data.museumInfo.id}`,
      imageUrl: this.data.photos[0] || '/images/bg.png'
    }
  }
})
