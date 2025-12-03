// detail.ts
// 省份博物馆详情页面

import { authService } from '../../services/auth'
import { checkinService } from '../../services/museum'

interface MuseumDetail {
  id: number
  name: string
  address: string
  logo: string
  level: string
  category: string
  isVisited: boolean
  visitDate?: string
  distance?: string
  openTime?: string
  ticketPrice?: string
  rating?: number
  description?: string
  cityName: string
}

interface CityDetail {
  cityName: string
  totalMuseums: number
  visitedMuseums: number
  completionRate: number
  museums: MuseumDetail[]
}

interface ProvinceDetail {
  provinceCode: string
  provinceName: string
  totalMuseums: number
  visitedMuseums: number
  totalCities: number
  unlockedCities: number
  completionRate: number // 预计算的完成度百分比
  museums: MuseumDetail[]
  cities: CityDetail[]
}

Page({
  data: {
    // 省份信息
    provinceInfo: null as ProvinceDetail | null,
    
    // 显示模式：cities（显示城市列表）或 museums（显示博物馆列表，原有模式）
    viewMode: 'cities', // cities | museums
    
    // 筛选状态
    filterStatus: 'all', // all | visited | unvisited
    
    // 排序方式
    sortBy: 'default', // default | name | level | distance
    
    // 加载状态
    loading: false,
    
    // 排序后的博物馆列表
    filteredMuseums: [] as MuseumDetail[]
  },

  onLoad(options: { provinceCode?: string }) {
    console.log('省份详情页面加载:', options)
    
    if (options.provinceCode) {
      this.loadProvinceDetail(options.provinceCode)
    }
  },

  // 加载省份详情
  async loadProvinceDetail(provinceCode: string) {
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '查看省份详情需要登录后使用',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          } else {
            wx.navigateBack()
          }
        }
      })
      return
    }

    this.setData({ loading: true })
    
    try {
      console.log('开始加载省份详情:', provinceCode)
      
      // 调用后端API获取省份博物馆详情
      const provinceDetail = await checkinService.getProvinceMuseumDetail(provinceCode)
      console.log('省份详情API响应:', provinceDetail)
      
      // 转换博物馆数据格式
      const museums: MuseumDetail[] = (provinceDetail.museums || []).map((museum: any, index: number) => {
        return {
          id: museum.id,
          name: museum.name,
          address: museum.address || '地址未知',
          logo: this.getMuseumLogo(index), // 使用默认图标
          level: museum.level || '未定级',
          category: museum.category || '综合类',
          isVisited: museum.isVisited === true, // 严格判断布尔值
          visitDate: museum.firstVisitDate ? this.formatVisitDate(museum.firstVisitDate) : undefined,
          // distance字段在此页面中不需要，因为没有GPS定位功能
          openTime: museum.openTime || '09:00-17:00',
          ticketPrice: this.formatTicketPrice(museum.ticketPrice, museum.freeAdmission),
          rating: museum.rating || 0, // 从后端获取评分
          description: museum.description || '暂无描述',
          cityName: museum.cityName || '未知城市'
        }
      })

      // 使用后端返回的城市统计数据，并为每个城市添加博物馆列表
      const cities: CityDetail[] = (provinceDetail.cities || []).map((cityStats: any) => {
        // 找到该城市的所有博物馆
        const cityMuseums = museums.filter(museum => museum.cityName === cityStats.cityName)
        
        return {
          cityName: cityStats.cityName,
          totalMuseums: cityStats.totalMuseums,
          visitedMuseums: cityStats.visitedMuseums,
          completionRate: cityStats.completionRate,
          museums: cityMuseums
        }
      }).sort((a: CityDetail, b: CityDetail) => {
        // 优先排序：已访问的城市排在前面
        const aVisited = a.visitedMuseums > 0
        const bVisited = b.visitedMuseums > 0
        
        if (aVisited && !bVisited) return -1
        if (!aVisited && bVisited) return 1
        
        // 同一状态内按城市名称排序
        return a.cityName.localeCompare(b.cityName)
      })

      // 计算完成度百分比
      const completionRate = provinceDetail.totalMuseums > 0 
        ? Math.round((provinceDetail.visitedMuseums / provinceDetail.totalMuseums) * 100)
        : 0

      console.log('省份统计数据调试:', {
        provinceName: provinceDetail.provinceName,
        totalMuseums: provinceDetail.totalMuseums,
        visitedMuseums: provinceDetail.visitedMuseums,
        completionRate: completionRate,
        citiesCount: cities.length,
        unlockedCitiesCount: cities.filter(c => c.visitedMuseums > 0).length
      })

      // 转换数据格式
      const provinceInfo: ProvinceDetail = {
        provinceCode: provinceDetail.provinceCode,
        provinceName: provinceDetail.provinceName,
        totalMuseums: provinceDetail.totalMuseums,
        visitedMuseums: provinceDetail.visitedMuseums,
        totalCities: cities.length,
        unlockedCities: cities.filter(c => c.visitedMuseums > 0).length,
        completionRate: completionRate,
        museums,
        cities
      }

        // 设置导航标题
        wx.setNavigationBarTitle({
        title: `${provinceInfo.provinceName} · 博物馆`
        })
        
        this.setData({ 
        provinceInfo,
          loading: false 
        })
      
      // 初始加载筛选排序后的博物馆列表
      this.updateFilteredMuseums()
      
      console.log(`省份${provinceInfo.provinceName}详情加载成功，共${provinceInfo.totalMuseums}个博物馆，已访问${provinceInfo.visitedMuseums}个`)
      
    } catch (error) {
      console.error('加载省份详情失败:', error)
      
      this.setData({ loading: false })
      
        wx.showToast({
        title: '加载失败',
          icon: 'error'
        })
        
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      }
  },

  // 视图模式切换
  onViewModeChange(e: WechatMiniprogram.BaseEvent) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ viewMode: mode })
    console.log('切换视图模式:', mode)
  },

  // 筛选状态切换
  onFilterTap(e: WechatMiniprogram.BaseEvent) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status })
    this.updateFilteredMuseums()
  },


  // 更新筛选排序后的博物馆列表
  updateFilteredMuseums() {
    const { provinceInfo, filterStatus } = this.data
    
    if (!provinceInfo) {
      this.setData({ filteredMuseums: [] })
      return
    }
    
    let museums = provinceInfo.museums
    
    // 筛选
    if (filterStatus === 'visited') {
      museums = museums.filter(m => m.isVisited)
    } else if (filterStatus === 'unvisited') {
      museums = museums.filter(m => !m.isVisited)
    }
    
    // 排序：已访问优先，然后按名称排序
    museums = museums.sort((a, b) => {
      // 第一优先级：访问状态
      if (a.isVisited && !b.isVisited) return -1
      if (!a.isVisited && b.isVisited) return 1
      
      // 第二优先级：按名称排序
      return a.name.localeCompare(b.name)
    })
    
    // 更新到data中
    this.setData({ filteredMuseums: museums })
  },

  // 城市卡片点击
  onCityTap(e: WechatMiniprogram.BaseEvent) {
    const cityName = e.currentTarget.dataset.name
    const { provinceInfo } = this.data
    
    if (!provinceInfo || !cityName) return

    const city = provinceInfo.cities.find(c => c.cityName === cityName)
    if (!city) return

    // 导航到城市详情页面
    wx.navigateTo({
      url: `/pages/city/detail?provinceCode=${provinceInfo.provinceCode}&provinceName=${provinceInfo.provinceName}&cityName=${encodeURIComponent(cityName)}`
    })
  },

  // 博物馆卡片点击
  onMuseumTap(e: WechatMiniprogram.BaseEvent) {
    const museumId = e.currentTarget.dataset.id
    const museum = this.data.provinceInfo?.museums.find(m => m.id === museumId)
    
    if (!museum) return

    if (museum.isVisited) {
      // 已打卡博物馆 - 查看详情
      wx.navigateTo({
        url: `/pages/museum/detail?id=${museum.id}`
      })
    } else {
      // 未打卡博物馆 - 显示基本信息和导航
      wx.showModal({
        title: `🏛️ ${museum.name}`,
        content: `地址：${museum.address}\n等级：${museum.level}\n类别：${museum.category}\n开放时间：${museum.openTime}\n门票：${museum.ticketPrice}\n\n${museum.description}`,
        confirmText: '去打卡',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            // 导航到打卡页面
            wx.switchTab({
              url: '/pages/checkin/checkin'
            })
          }
        }
      })
    }
  },

  // 博物馆logo加载失败处理
  onLogoError(e: any) {
    console.log('博物馆logo加载失败:', e.detail)
    // 显示默认CSS图标，无需额外处理
  },

  // 分享页面
  onShareAppMessage() {
    const { provinceInfo } = this.data
    if (!provinceInfo) return {}
    
    return {
      title: `我在${provinceInfo.provinceName}已打卡${provinceInfo.visitedMuseums}个博物馆！`,
      path: `/pages/province/detail?provinceCode=${provinceInfo.provinceCode}`
    }
  },

  // 获取博物馆logo（使用默认图标）
  getMuseumLogo(index: number): string {
    const logos = [
      '/images/museums/gugong.png',
      '/images/museums/national.png', 
      '/images/museums/capital.png',
      '/images/museums/science.png',
      '/images/museums/art.png',
      '/images/bg.png' // 默认图片
    ]
    return logos[index % logos.length]
  },

  // 格式化访问日期
  formatVisitDate(visitDate: string): string {
    try {
      const date = new Date(visitDate)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    } catch (error) {
      return visitDate.split(' ')[0] // 如果解析失败，取日期部分
    }
  },

  // 格式化门票价格
  formatTicketPrice(ticketPrice?: number, freeAdmission?: number): string {
    if (freeAdmission === 1 || ticketPrice === 0) {
      return '免费'
    } else if (ticketPrice && ticketPrice > 0) {
      return `${ticketPrice}元`
    } else {
      return '价格待查'
    }
  },

  // 下拉刷新
  async onPullDownRefresh() {
    const { provinceInfo } = this.data
    if (provinceInfo) {
      try {
        await this.loadProvinceDetail(provinceInfo.provinceCode)
        wx.showToast({
          title: '刷新完成',
          icon: 'success',
          duration: 1000
        })
      } catch (error) {
        console.error('刷新失败:', error)
      }
    }
    
      wx.stopPullDownRefresh()
  }
})
