// checkin.ts
// 打卡页面

import { authService } from '../../services/auth'
import { checkinService, museumService } from '../../services/museum'

interface NearbyMuseum {
  id: number
  name: string
  image: string
  distance: string
  canCheckin: boolean
  latitude?: number
  longitude?: number
}

interface CheckinRecord {
  id: number
  museumName: string
  image: string
  checkinTime: string
  points: number
}

interface UserStats {
  totalCheckins: number
  totalCities: number
  totalPoints: number
  currentRank: number
}

Component({
  data: {
    // 当前位置
    currentLocation: '定位中...',
    
    // 登录状态
    isLoggedIn: false,
    
    // 最近的博物馆（用于打卡卡片）
    nearestMuseum: {
      id: 1,
      name: '故宫博物院',
      image: '/images/bg.png',
      distance: '120m',
      canCheckin: true
    } as NearbyMuseum,

    // 暂存数量
    draftCount: 0,

    // 距离选择（默认10km）
    selectedDistance: 10,
    
    // 附近博物馆
    nearbyMuseums: [
      {
        id: 1,
        name: '故宫博物院',
        image: '/images/bg.png',
        distance: '120m',
        canCheckin: true
      },
      {
        id: 2,
        name: '国家博物馆',
        image: '/images/head.png',
        distance: '350m',
        canCheckin: false
      },
      {
        id: 3,
        name: '天安门广场',
        image: '/images/bg.png',
        distance: '80m',
        canCheckin: true
      }
    ] as NearbyMuseum[],

    // 打卡记录
    checkinHistory: [] as CheckinRecord[],

    // 用户统计
    userStats: {
      totalCheckins: 15,
      totalCities: 3,
      totalPoints: 680,
      currentRank: 128
    } as UserStats
  },

  lifetimes: {
    attached() {
      // 读取用户距离偏好设置
      const preferredDistance = wx.getStorageSync('preferredDistance') || 10
      // 如果之前存储的是20km，重置为10km
      const validDistance = preferredDistance === 20 ? 10 : preferredDistance
      this.setData({ selectedDistance: validDistance })
      
      this.loadPageData()
      this.loadDraftList()
    }
  },

  pageLifetimes: {
    show() {
      // 页面显示时检查登录状态和刷新暂存列表
      this.checkLoginStatus()
    }
  },

  methods: {
    // 加载页面数据
    loadPageData() {
      console.log('打卡页面数据加载完成')
      // 检查登录状态
      this.checkLoginStatus()
      // 暂时注释掉GPS定位功能
      // this.getCurrentLocation()
    },

    // 检查登录状态
    checkLoginStatus() {
      const isLoggedIn = authService.isLoggedIn()
      this.setData({ isLoggedIn })
      
      // 只有登录用户才加载暂存列表和打卡记录
      if (isLoggedIn) {
        this.loadDraftList()
        this.loadRecentCheckins()
      } else {
        this.setData({ 
          draftCount: 0,
          checkinHistory: [] 
        })
      }

      // 无论是否登录都加载附近博物馆
      this.loadNearbyMuseums()
    },

    // 加载附近博物馆
    async loadNearbyMuseums() {
      console.log('开始加载附近博物馆')
      
      try {
        // 获取用户当前位置
        const location = await this.getCurrentLocation()
        if (!location) {
          console.log('无法获取位置，显示默认数据')
          return
        }

        console.log('用户位置获取成功')
        
        // 更新当前位置显示（不显示精确坐标）
        this.setData({ 
          currentLocation: '定位中...' 
        })
        
        // 调用现有的附近博物馆API（获取足够范围的博物馆用于20km筛选）
        const response = await museumService.getNearbyMuseums({
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 50, // 获取50km范围的博物馆数据用于20km筛选
          page: 1,
          pageSize: 100 // 获取100个博物馆用于筛选
        })

        console.log('附近博物馆API响应:', response)
        console.log('API返回的博物馆数量:', response.museums?.records?.length || 0)
        
        // 打印前几个博物馆的坐标信息
        const museums = response.museums?.records || []
        if (museums.length > 0) {
          console.log('博物馆数据加载成功')
        }

        // 计算距离并筛选10km内的博物馆
        const allMuseums = response.museums?.records || []
        console.log(`开始处理${allMuseums.length}个博物馆数据`)
        
        // 处理博物馆数据，计算距离并筛选
        const museumsWithCoords = allMuseums.filter((museum: any) => museum.latitude && museum.longitude)
        console.log(`有坐标的博物馆数量: ${museumsWithCoords.length}`)
        
        const processedMuseums = museumsWithCoords.map((museum: any) => {
            const distance = this.calculateDistance(
              location.latitude, location.longitude,
              museum.latitude, museum.longitude
            )
            
            const processed = {
              id: museum.id,
              name: museum.name,
              image: museum.image || '/images/default-museum.png',
              distance: distance,
              distanceFormatted: this.formatDistance(distance),
              // canCheckin: distance <= 0.3, // 300m内可打卡
              canCheckin: distance <= 100.0, // 300m内可打卡
              latitude: museum.latitude,
              longitude: museum.longitude
            }
            
            // console.log(`${museum.name}: ${distance.toFixed(2)}km`) // 隐私保护：不显示具体距离
            return processed
          })
          
        console.log(`所有博物馆距离计算完成，总数: ${processedMuseums.length}`)
        
        const nearbyFiltered = processedMuseums.filter((museum: any) => museum.distance <= this.data.selectedDistance)
        console.log(`${this.data.selectedDistance}km内的博物馆数量: ${nearbyFiltered.length}`)
        
        const sortedMuseums = nearbyFiltered
          .sort((a: any, b: any) => a.distance - b.distance) // 按距离排序
          .slice(0, 10) // 显示最近的10个博物馆

        // 转换为最终格式
        const nearbyMuseums: NearbyMuseum[] = sortedMuseums.map((museum: any) => ({
          id: museum.id,
          name: museum.name,
          image: museum.image,
          distance: museum.distanceFormatted,
          canCheckin: museum.canCheckin,
          latitude: museum.latitude,
          longitude: museum.longitude
        }))

        // 更新最近的博物馆卡片
        const updateData: any = { nearbyMuseums }
        
        if (nearbyMuseums.length > 0) {
          const closest = nearbyMuseums[0]
          updateData.nearestMuseum = {
            id: closest.id,
            name: closest.name,
            image: closest.image,
            distance: closest.distance,
            canCheckin: closest.canCheckin,
            latitude: closest.latitude,
            longitude: closest.longitude
          }
        } else {
          // 当没有附近博物馆时，保留原来的示例数据但更新状态
          updateData.nearestMuseum = {
            id: 0,
            name: '该地区暂无博物馆',
            image: '/images/default-museum.png',
            distance: '无数据',
            canCheckin: false,
            latitude: location.latitude,
            longitude: location.longitude
          }
        }

        this.setData(updateData)
        console.log(`附近博物馆加载完成，共${nearbyMuseums.length}个博物馆`)
        
        // 尝试获取更友好的地址显示
        this.updateLocationDisplay(location.latitude, location.longitude)

      } catch (error) {
        console.error('加载附近博物馆失败:', error)
        // 保持默认的示例数据
      }
    },

    // 获取当前位置
    getCurrentLocation(): Promise<{latitude: number, longitude: number} | null> {
      return new Promise((resolve) => {
        wx.getLocation({
          type: 'gcj02', // 使用国测局坐标系
          success: (res) => {
            console.log('定位成功')
            resolve({
              latitude: res.latitude,
              longitude: res.longitude
            })
          },
          fail: (err) => {
            console.error('定位失败:', err)
            wx.showToast({
              title: '无法获取位置',
              icon: 'none'
            })
            resolve(null)
          }
        })
      })
    },

    // 更新位置显示
    async updateLocationDisplay(latitude: number, longitude: number) {
      try {
        // 从附近博物馆API获取详细的位置信息
        const response = await museumService.getNearbyMuseums({
          latitude: latitude,
          longitude: longitude,
          radius: 1, // 小范围，主要是为了获取位置信息
          page: 1,
          pageSize: 1
        })
        
        const locationInfo = response.location
        if (locationInfo) {
          // 构建更详细的地址显示，优先显示区级信息
          let detailAddress = ''
          
          if (locationInfo.formattedAddress) {
            // 如果有格式化地址，提取关键部分
            const address = locationInfo.formattedAddress
            const parts = address.split(/[省市区县]/);
            if (parts.length >= 3) {
              // 显示市区级信息，如"大连市沙河口区"
              detailAddress = `${locationInfo.cityName}${locationInfo.district || ''}`
            } else {
              detailAddress = locationInfo.cityName || ''
            }
          } else if (locationInfo.district) {
            detailAddress = `${locationInfo.cityName}${locationInfo.district}`
          } else {
            detailAddress = locationInfo.cityName || ''
          }
          
          if (detailAddress && detailAddress !== '未知城市') {
            this.setData({ 
              currentLocation: detailAddress
            })
            console.log('位置显示已更新')
          }
        }
      } catch (error) {
        console.error('获取位置信息失败:', error)
        // 无法获取友好地址时显示通用信息
        this.setData({ 
          currentLocation: '当前位置'
        })
      }
    },

    // 计算两点间距离（km）
    calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
      const R = 6371 // 地球半径（公里）
      const dLat = (lat2 - lat1) * Math.PI / 180
      const dLng = (lng2 - lng1) * Math.PI / 180
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    },

    // 格式化距离显示
    formatDistance(km: number): string {
      if (km < 1) {
        return Math.round(km * 1000) + 'm'
      } else {
        return km.toFixed(1) + 'km'
      }
    },

    // 刷新位置和附近博物馆
    async onRefreshLocation() {
      console.log('刷新位置和附近博物馆')
      await this.loadNearbyMuseums()
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      })
    },

    // 定位测试
    onLocationTest() {
      wx.showLoading({ title: '定位中...' })
      
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '定位功能开发中',
          icon: 'none',
          duration: 2000
        })
      }, 1500)
    },

    // 相机测试
    onCameraTest() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['camera'],
        success: (res) => {
          wx.showToast({
            title: '相机功能正常',
            icon: 'success'
          })
          console.log('拍照成功:', res.tempFilePaths)
        },
        fail: () => {
          wx.showToast({
            title: '相机调用失败',
            icon: 'none'
          })
        }
      })
    },

    // 附近博物馆点击
    onNearbyMuseumTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('附近博物馆点击:', id)
      
      wx.navigateTo({
        url: `/pages/museum/detail?id=${id}`
      })
    },

    // 距离选择
    onDistanceSelect(e: WechatMiniprogram.BaseEvent) {
      const distance = parseInt(e.currentTarget.dataset.distance)
      console.log('选择距离:', distance + 'km')
      
      this.setData({ selectedDistance: distance })
      
      // 保存用户偏好到本地存储
      wx.setStorageSync('preferredDistance', distance)
      
      // 重新加载附近博物馆
      this.loadNearbyMuseums()
    },

    // 打卡点击
    async onCheckinTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('打卡点击:', id)

      // 查找对应的博物馆信息
      const museum = this.data.nearbyMuseums.find(m => m.id === id)
      if (!museum) {
        wx.showToast({
          title: '博物馆信息不存在',
          icon: 'none'
        })
        return
      }

      // 检查是否可以打卡（300m范围内）
      if (!museum.canCheckin) {
        wx.showModal({
          title: '距离过远',
          content: `您当前距离${museum.name}约${museum.distance}，需要在300米内才能打卡。`,
          showCancel: false,
          confirmText: '我知道了'
        })
        return
      }

      // 可以打卡，跳转到打卡页面
      wx.navigateTo({
        url: `/pages/checkin-action/checkin-action?museumId=${id}`
      })
    },

    // 主打卡按钮点击
    async onMainCheckinTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('主打卡按钮点击:', id)
      
      const museum = this.data.nearestMuseum
      if (museum && museum.canCheckin) {
        // 可以打卡，先检查登录状态
        if (!authService.isLoggedIn()) {
          // 用户未登录，显示登录提示
          wx.showModal({
            title: '需要登录',
            content: '打卡功能需要登录后使用，是否前往登录？',
            success: (res) => {
              if (res.confirm) {
                // 跳转到登录页面，带上回调参数
                const redirectUrl = `/pages/checkin-action/checkin-action?id=${id}&fresh=true`
                wx.navigateTo({
                  url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
                })
              }
            }
          })
          return
        }
        
        // 已登录，跳转到打卡功能页面，添加 fresh=true 表示新打卡
        wx.navigateTo({
          url: `/pages/checkin-action/checkin-action?id=${id}&fresh=true`
        })
      } else {
        // 不能打卡，跳转到博物馆详情
        wx.navigateTo({
          url: `/pages/museum/detail?id=${id}`
        })
      }
    },

    // 查看打卡历史
    onViewHistory() {
      wx.navigateTo({
        url: '/pages/user/history'
      })
    },

    // 历史记录点击
    onHistoryTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('历史记录点击:', id)
      
      wx.navigateTo({
        url: `/pages/checkin-detail/checkin-detail?id=${id}`
      })
    },

    // 未实现功能提示
    showUnimplementedFeature(featureName: string) {
      wx.showToast({
        title: `${featureName}正在开发中，敬请期待！`,
        icon: 'none',
        duration: 2000
      })
    },

    // 下拉刷新
    async onPullDownRefresh() {
      try {
        // 重新加载页面数据
        this.checkLoginStatus()
        
        // 如果登录了，重新加载打卡记录
        if (authService.isLoggedIn()) {
          await this.loadRecentCheckins()
        }
        
        wx.showToast({
          title: '刷新完成',
          icon: 'success',
          duration: 1000
        })
      } catch (error) {
        console.error('刷新失败:', error)
        wx.showToast({
          title: '刷新失败',
          icon: 'error',
          duration: 1000
        })
      } finally {
        wx.stopPullDownRefresh()
      }
    },

    // 加载暂存列表
    loadDraftList() {
      try {
        const allDrafts = wx.getStorageSync('all_checkin_drafts') || {}
        const draftCount = Object.keys(allDrafts).length

        this.setData({
          draftCount
        })
      } catch (error) {
        console.log('加载暂存数量失败:', error)
      }
    },

    // 查看暂存列表
    onViewDraftList() {
      // 再次检查登录状态（防御性编程）
      if (!authService.isLoggedIn()) {
        wx.showModal({
          title: '需要登录',
          content: '查看暂存草稿需要登录后使用，是否前往登录？',
          success: (res) => {
            if (res.confirm) {
              // 跳转到登录页面，带上回调参数
              const redirectUrl = '/pages/draft-list/draft-list'
              wx.navigateTo({
                url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
              })
            }
          }
        })
        return
      }
      
      wx.navigateTo({
        url: '/pages/draft-list/draft-list'
      })
    },

    // 加载最近打卡记录
    async loadRecentCheckins() {
      if (!authService.isLoggedIn()) {
        return
      }

      try {
        // 获取最近5条正式打卡记录
        const pageResult = await checkinService.getUserCheckinRecords({
          page: 1,
          pageSize: 5,
          isDraft: false // 只获取正式打卡记录
        })

        console.log('获取最近打卡记录:', pageResult)

        // 转换数据格式
        const checkinHistory = (pageResult.records || []).map((record: any, index: number) => {
          return {
            id: record.id,
            museumName: record.museumName || '未知博物馆',
            image: this.getMuseumImage(index), // 使用默认图片
            checkinTime: this.formatCheckinTime(record.checkinTime),
            points: this.calculatePoints(record) // 根据打卡记录计算积分
          }
        })

        this.setData({ checkinHistory })
        console.log('最近打卡记录加载完成，共', checkinHistory.length, '条')

      } catch (error) {
        console.error('加载最近打卡记录失败:', error)
        // 失败时保持空数组，不影响页面显示
      }
    },

    // 格式化打卡时间显示
    formatCheckinTime(checkinTime: string): string {
      if (!checkinTime) {
        return '未知时间'
      }

      try {
        const checkinDate = new Date(checkinTime)
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        const checkinDay = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate())

        // 格式化时间为 HH:mm
        const timeStr = checkinDate.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })

        if (checkinDay.getTime() === today.getTime()) {
          return `今天 ${timeStr}`
        } else if (checkinDay.getTime() === yesterday.getTime()) {
          return `昨天 ${timeStr}`
        } else {
          // 超过昨天的显示月日
          const month = checkinDate.getMonth() + 1
          const day = checkinDate.getDate()
          return `${month}月${day}日 ${timeStr}`
        }
      } catch (error) {
        console.error('格式化打卡时间失败:', error)
        return '时间格式错误'
      }
    },

    // 根据博物馆索引获取默认图片
    getMuseumImage(index: number): string {
      const images = ['/images/bg.png', '/images/head.png', '/images/Icon1.png']
      return images[index % images.length]
    },

    // 计算打卡积分（基于博物馆名称和打卡时间的简单规则）
    calculatePoints(record: any): number {
      let basePoints = 30 // 基础积分
      
      // 根据博物馆名称判断等级（简单规则）
      const museumName = record.museumName || ''
      if (museumName.includes('故宫') || museumName.includes('国家博物馆')) {
        basePoints += 20 // 知名博物馆额外积分
      } else if (museumName.includes('省博物馆') || museumName.includes('市博物馆')) {
        basePoints += 10 // 省市级博物馆额外积分
      }
      
      // 根据打卡日期添加随机变动（模拟活跃度奖励机制）
      const variation = Math.floor(Math.random() * 21) - 10 // -10到+10的随机变动
      
      return Math.max(20, basePoints + variation) // 最少20分
    },

    // 页面分享
    onShareAppMessage() {
      return {
        title: '我正在博物馆打卡',
        path: '/pages/checkin/checkin',
        imageUrl: '/images/bg.png'
      }
    }
  }
})
