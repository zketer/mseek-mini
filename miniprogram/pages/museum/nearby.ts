// nearby.ts - 附近博物馆页面
import { museumService, Museum, LocationInfo, NearbyMuseumsResponse } from '../../services/museum'

// 标签信息接口  
interface TagInfo {
  id: number
  name: string
  code: string
  color?: string
}

// API返回的博物馆数据接口
interface ApiMuseum extends Museum {
  tags?: TagInfo[]
}

Page({
  data: {
    // 位置信息
    currentLocation: null as LocationInfo | null,
    locationError: false,
    
    // 博物馆列表
    museums: [] as Museum[],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    
    // 搜索相关
    searchKeyword: '',
    searchRadius: 20
  },

  onLoad() {
    console.log('附近博物馆页面加载')
    this.getCurrentLocation()
  },

  onPullDownRefresh() {
    this.onRefresh()
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadNearbyMuseums()
    }
  },

  // 获取当前位置
  getCurrentLocation() {
    console.log('开始获取位置信息...')
    this.setData({ loading: true, locationError: false })
    
    // 先检查定位权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation'] === false) {
          // 用户已拒绝定位权限，引导用户到设置页面
          this.showLocationPermissionDialog()
          return
        }
        
        // 获取位置（使用高精度定位）
        wx.getLocation({
          type: 'gcj02',
          isHighAccuracy: true,
          highAccuracyExpireTime: 4000,
          success: (res) => {
            console.log('位置获取成功:', res)
            const location: LocationInfo = {
              latitude: res.latitude,
              longitude: res.longitude
            }
            this.setData({ 
              currentLocation: location,
              locationError: false,
              loading: false  // 重置loading状态
            })
            
            // 直接加载附近博物馆（会同时获取位置信息）
            this.loadNearbyMuseums(true)
          },
          fail: (err) => {
            console.error('位置获取失败:', err)
            this.handleLocationError(err)
          }
        })
      },
      fail: (err) => {
        console.error('获取设置失败:', err)
        this.setData({ 
          locationError: true,
          loading: false
        })
      }
    })
  },

  // 处理定位错误
  handleLocationError(err: any) {
    this.setData({ 
      locationError: true,
      loading: false
    })
    
    if (err.errMsg.includes('auth deny')) {
      // 权限被拒绝
      this.showLocationPermissionDialog()
    } else {
      // 其他错误
      wx.showToast({
        title: '定位失败',
        icon: 'error'
      })
    }
  },

  // 显示定位权限对话框
  showLocationPermissionDialog() {
    wx.showModal({
      title: '需要定位权限',
      content: '为了为您推荐附近的博物馆，需要获取您的位置信息。请在设置中开启定位权限。',
      confirmText: '去设置',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                // 用户开启了定位权限，重新获取位置
                this.getCurrentLocation()
              }
            }
          })
        }
      }
    })
  },

  // 加载附近博物馆
  async loadNearbyMuseums(reset: boolean = false) {
    console.log('开始加载附近博物馆, reset:', reset, 'loading:', this.data.loading)
    
    if (this.data.loading) {
      console.log('页面正在加载中，跳过本次请求')
      return
    }
    if (!this.data.currentLocation) {
      console.warn('位置信息不可用')
      return
    }

    this.setData({ loading: true })

    try {
      const currentPage = reset ? 1 : this.data.page
      const { latitude, longitude } = this.data.currentLocation
      
      // 调用后端接口获取附近博物馆（包含位置信息）
      // 如果不是第一次加载且已有城市信息，传递给后端避免重复调用高德API
      const requestParams: any = {
        latitude,
        longitude,
        radius: this.data.searchRadius,
        page: currentPage,
        pageSize: this.data.pageSize
      }

      // 添加搜索关键词
      if (this.data.searchKeyword) {
        requestParams.name = this.data.searchKeyword
      }

      // 如果已经有城市信息且不是第一次加载，传递城市信息
      if (!reset && this.data.currentLocation && this.data.currentLocation.cityCode && this.data.currentLocation.cityName) {
        requestParams.cityCode = this.data.currentLocation.cityCode
        requestParams.cityName = this.data.currentLocation.cityName
        console.log('使用已有城市信息，避免重复调用高德API:', requestParams.cityName)
      }

      const response: NearbyMuseumsResponse = await museumService.getNearbyMuseums(requestParams)

      // 如果是第一次加载，更新位置信息
      if (reset && response.location) {
        this.setData({
          'currentLocation.cityName': response.location.cityName || '未知城市',
          'currentLocation.cityCode': response.location.cityCode,
          'currentLocation.formattedAddress': response.location.formattedAddress,
          'currentLocation.province': response.location.province,
          'currentLocation.district': response.location.district
        })
        console.log('位置信息更新:', response.location)
      }

      // 生成显示标签
      const museums = response.museums.records.map(museum => ({
        ...museum,
        tags: this.generateDisplayTags(museum as ApiMuseum)
      }))

      this.setData({
        museums: reset ? museums : [...this.data.museums, ...museums],
        total: response.museums.total,
        page: currentPage + 1,
        hasMore: museums.length === this.data.pageSize,
        loading: false
      })

      if (reset) {
        wx.stopPullDownRefresh()
      }

      console.log(`附近博物馆加载完成，共 ${museums.length} 条`)
    } catch (error) {
      console.error('附近博物馆加载失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 生成显示标签
  generateDisplayTags(museum: ApiMuseum): TagInfo[] {
    const tags: TagInfo[] = []

    // 1. 后端返回的标签
    if (museum.tags && museum.tags.length > 0) {
      tags.push(...museum.tags)
    } else {
      // 2. 根据分类生成标签
      if (museum.categories && museum.categories.length > 0) {
        museum.categories.forEach(category => {
          tags.push({
            id: category.id,
            name: category.name,
            code: category.code,
            color: '#e6f7ff'
          })
        })
      }

      // 3. 根据等级生成标签
      if (museum.level === 1) {
        tags.push({
          id: 9999,
          name: '一级博物馆',
          code: 'LEVEL_1',
          color: '#fff7e6'
        })
      }

      // 4. 免费标签
      if (museum.freeAdmission === 1) {
        tags.push({
          id: 9998,
          name: '免费参观',
          code: 'FREE_ADMISSION',
          color: '#fff2e8'
        })
      }
    }

    return tags
  },

  // 刷新位置
  onRefreshLocation() {
    this.getCurrentLocation()
  },

  // 重试定位
  onRetryLocation() {
    this.getCurrentLocation()
  },

  // 打开设置页面
  onOpenSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          // 用户开启了定位权限，重新获取位置
          this.getCurrentLocation()
        }
      }
    })
  },

  // 刷新数据
  onRefresh() {
    if (this.data.currentLocation) {
      this.loadNearbyMuseums(true)
    } else {
      this.getCurrentLocation()
    }
  },

  // 搜索输入
  onSearchInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value
    this.setData({ searchKeyword: value })
  },

  // 搜索确认
  onSearchConfirm() {
    console.log('搜索确认:', this.data.searchKeyword)
    this.loadNearbyMuseums(true)
  },

  // 清除搜索
  onSearchClear() {
    this.setData({ searchKeyword: '' })
    this.loadNearbyMuseums(true)
  },

  // 博物馆点击
  onMuseumTap(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id
    console.log('博物馆点击:', id)
    wx.navigateTo({
      url: `/pages/museum/detail?id=${id}`
    })
  },

})
