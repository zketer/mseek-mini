// city/detail.ts
// 城市博物馆详情页面

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
  provinceCode: string
  provinceName: string
  cityName: string
  totalMuseums: number
  visitedMuseums: number
  completionRate: number
  museums: MuseumDetail[]
}

Page({
  data: {
    // 城市信息
    cityInfo: null as CityDetail | null,
    
    // 筛选状态
    filterStatus: 'all', // all | visited | unvisited
    
    // 排序方式
    sortBy: 'default', // default | name | level | distance
    
    // 加载状态
    loading: false,
    
    // 排序后的博物馆列表
    filteredMuseums: [] as MuseumDetail[]
  },

  onLoad(options: { provinceCode?: string, provinceName?: string, cityName?: string }) {
    console.log('城市详情页面加载:', options)
    
    if (options.provinceCode && options.cityName) {
      // 设置导航标题
      wx.setNavigationBarTitle({
        title: `${decodeURIComponent(options.cityName || '')} · 博物馆`
      })
      
      this.loadCityDetail(options.provinceCode, decodeURIComponent(options.cityName || ''), decodeURIComponent(options.provinceName || ''))
    }
  },

  // 加载城市详情
  async loadCityDetail(provinceCode: string, cityName: string, provinceName: string) {
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '需要登录',
        content: '查看城市详情需要登录后使用',
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
      console.log('开始加载城市详情:', { provinceCode, cityName, provinceName })
      
      // 调用后端API获取省份博物馆详情，然后筛选出当前城市的博物馆
      const provinceDetail = await checkinService.getProvinceMuseumDetail(provinceCode)
      console.log('省份详情API响应:', provinceDetail)
      
      
      // 筛选当前城市的博物馆（支持多种城市名称格式匹配）
      const cityMuseums = (provinceDetail.museums || [])
        .filter((museum: any) => {
          if (!museum.cityName) return false
          
          // 精确匹配
          if (museum.cityName === cityName) return true
          
          // 去掉"市"后缀匹配
          const museumCityCore = museum.cityName.replace(/市$/, '')
          const targetCityCore = cityName.replace(/市$/, '')
          if (museumCityCore === targetCityCore) return true
          
          // 包含关系匹配
          if (museum.cityName.includes(targetCityCore) || targetCityCore.includes(museumCityCore)) return true
          
          return false
        })
        .map((museum: any, index: number) => {
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

      const visitedCount = cityMuseums.filter((m: MuseumDetail) => m.isVisited).length
      
      // 构建城市详情
      const cityInfo: CityDetail = {
        provinceCode,
        provinceName,
        cityName,
        totalMuseums: cityMuseums.length,
        visitedMuseums: visitedCount,
        completionRate: cityMuseums.length > 0 ? Math.round((visitedCount / cityMuseums.length) * 100) : 0,
        museums: cityMuseums
      }

      this.setData({ 
        cityInfo,
        loading: false 
      })
      
      // 初始加载筛选排序后的博物馆列表
      this.updateFilteredMuseums()
      
      console.log(`城市${cityName}详情加载成功，共${cityInfo.totalMuseums}个博物馆，已访问${cityInfo.visitedMuseums}个`)
      
    } catch (error) {
      console.error('加载城市详情失败:', error)
      
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

  // 筛选状态切换
  onFilterTap(e: WechatMiniprogram.BaseEvent) {
    const status = e.currentTarget.dataset.status
    this.setData({ filterStatus: status })
    this.updateFilteredMuseums()
  },


  // 更新筛选排序后的博物馆列表
  updateFilteredMuseums() {
    const { cityInfo, filterStatus } = this.data
    
    if (!cityInfo) {
      this.setData({ filteredMuseums: [] })
      return
    }
    
    let museums = cityInfo.museums
    
    // 筛选
    if (filterStatus === 'visited') {
      museums = museums.filter((m: MuseumDetail) => m.isVisited)
    } else if (filterStatus === 'unvisited') {
      museums = museums.filter((m: MuseumDetail) => !m.isVisited)
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

  // 博物馆卡片点击
  onMuseumTap(e: WechatMiniprogram.BaseEvent) {
    const museumId = e.currentTarget.dataset.id
    const museum = this.data.cityInfo?.museums.find(m => m.id === museumId)
    
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
    const { cityInfo } = this.data
    if (!cityInfo) return {}
    
    return {
      title: `我在${cityInfo.cityName}已打卡${cityInfo.visitedMuseums}个博物馆！`,
      path: `/pages/city/detail?provinceCode=${cityInfo.provinceCode}&provinceName=${encodeURIComponent(cityInfo.provinceName)}&cityName=${encodeURIComponent(cityInfo.cityName)}`
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
    const { cityInfo } = this.data
    if (cityInfo) {
      try {
        await this.loadCityDetail(cityInfo.provinceCode, cityInfo.cityName, cityInfo.provinceName)
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
