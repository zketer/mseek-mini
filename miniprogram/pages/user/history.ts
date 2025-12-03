// user/history.ts
// 打卡历史页面

import { authService } from '../../services/auth'
import { checkinService } from '../../services/museum'

interface CheckInRecord {
  id: number
  museumId: number
  museumName: string
  cityName: string
  provinceName: string
  checkInDate: string
  photos?: string[]
  notes?: string
  rating?: number
  address: string
}

interface ProvinceMuseumData {
  provinceCode: string
  provinceName: string
  totalMuseums: number
  visitedMuseums: number
  isUnlocked: boolean
  museums: {
    id: number
    name: string
    isVisited: boolean
  }[]
}

Page({
  data: {
    // 当前显示模式：list | map
    viewMode: 'list',

    // 打卡记录列表 (初始为空，从API加载)
    checkinRecords: [] as CheckInRecord[],

    // 全国博物馆地图数据
    provinceData: [] as ProvinceMuseumData[],

    // 统计信息 (初始值，从API加载后更新)
    totalCheckins: 0,
    totalProvinces: 34,
    unlockedProvinces: 0,
    totalNationalMuseums: 130,
    visitedNationalMuseums: 0,
    coverageRate: 0, // 覆盖率百分比
    thisMonthCheckins: 0, // 本月打卡次数

    // 搜索和筛选状态
    searchKeyword: '', // 搜索关键词
    filterType: 'all', // all | thisMonth | thisYear
    loading: false // 加载状态
  },

  onLoad() {
    console.log('打卡历史页面加载')
    
    // 检查登录状态
    if (!authService.isLoggedIn()) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看打卡历史',
        showCancel: false,
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }
    
    // 同时加载打卡历史和省份统计数据
    Promise.all([
      this.loadCheckinHistory(),
      this.loadProvinceStats()
    ]).catch(error => {
      console.error('页面数据加载失败:', error)
    })
  },

  // 加载打卡历史
  async loadCheckinHistory() {
    console.log('开始加载打卡历史数据')
    
    this.setData({ loading: true })
    wx.showLoading({
      title: '加载中...'
    })
    
    try {
      // 构建查询参数，支持后端筛选和搜索
      const params: any = {
        page: 1,
        pageSize: 100,
        isDraft: false,
        filterType: this.data.filterType
      }

      // 添加搜索关键词
      if (this.data.searchKeyword.trim()) {
        params.keyword = this.data.searchKeyword.trim()
      }

      // 添加时间筛选参数
      if (this.data.filterType !== 'all') {
        const now = new Date()
        const currentYear = now.getFullYear()
        
        if (this.data.filterType === 'thisMonth') {
          const currentMonth = now.getMonth()
          const monthStart = new Date(currentYear, currentMonth, 1)
          const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59)
          params.startDate = monthStart.toISOString().split('T')[0]
          params.endDate = monthEnd.toISOString().split('T')[0]
        } else if (this.data.filterType === 'thisYear') {
          const yearStart = new Date(currentYear, 0, 1)
          const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)
          params.startDate = yearStart.toISOString().split('T')[0]
          params.endDate = yearEnd.toISOString().split('T')[0]
        }
      }

      console.log('API请求参数:', params)
      
      // 调用真实的API获取打卡记录
      const pageResult = await checkinService.getUserCheckinRecords(params)
      console.log('API响应结果:', pageResult)
      
      console.log('API响应数据:', pageResult)
      console.log('records数量:', pageResult.records?.length || 0)
      
      // 转换API数据格式为页面需要的格式
      const checkinRecords = (pageResult.records || []).map((record: any) => {
        // 解析地址获取省市信息
        let provinceName = '未知省份'
        let cityName = '未知城市'
        
        if (record.address) {
          // 尝试从地址中提取省市信息
          const addressParts = record.address.split(/[省市区县]/);
          if (addressParts.length >= 2) {
            provinceName = addressParts[0] + (record.address.includes('省') ? '省' : 
                         record.address.includes('市') && !record.address.includes('省') ? '市' : '')
            if (addressParts.length >= 3) {
              cityName = addressParts[1] + '市'
            } else if (addressParts[1]) {
              cityName = addressParts[1]
            }
          }
        }
        
        return {
          id: record.id,
          museumId: record.museumId,
          museumName: record.museumName || '未知博物馆',
          cityName,
          provinceName,
          checkInDate: record.checkinTime ? this.formatDateToYMD(record.checkinTime) : this.formatDateToYMD(new Date().toISOString()),
          photos: Array.isArray(record.photos) ? record.photos : [],
          notes: record.feeling || '',
          rating: record.rating || 0,
          address: record.address || ''
        }
      })
      
      // 计算本月打卡次数
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      
      const thisMonthCheckins = checkinRecords.filter(record => {
        const recordDate = new Date(record.checkInDate)
        return recordDate.getFullYear() === currentYear && 
               recordDate.getMonth() === currentMonth
      }).length
      
      // 更新页面数据
      this.setData({
        checkinRecords,
        totalCheckins: checkinRecords.length,
        thisMonthCheckins: thisMonthCheckins,
        loading: false
      })
      
      console.log('打卡历史加载成功，共', checkinRecords.length, '条记录')
      
    } catch (error) {
      console.error('加载打卡历史失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error',
        duration: 2000
      })
      this.setData({ loading: false })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换视图模式
  onViewModeChange(e: WechatMiniprogram.BaseEvent) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ viewMode: mode })
    console.log('切换视图模式:', mode)
  },

  // 搜索输入事件
  onSearchInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value
    this.setData({ searchKeyword: value })
  },

  // 搜索确认事件
  onSearchConfirm() {
    console.log('搜索确认:', this.data.searchKeyword)
    this.loadCheckinHistory() // 重新加载数据，应用搜索条件
  },

  // 筛选类型切换
  onFilterTap(e: WechatMiniprogram.BaseEvent) {
    const filterType = e.currentTarget.dataset.type
    this.setData({ filterType })
    console.log('切换筛选类型:', filterType)
    this.loadCheckinHistory() // 重新加载数据，应用筛选条件
  },


  // 打卡记录点击
  onRecordTap(e: WechatMiniprogram.BaseEvent) {
    const recordId = e.currentTarget.dataset.id
    const record = this.data.checkinRecords.find(r => r.id === recordId)
    
    if (!record) return

    // 导航到打卡详情页
    wx.navigateTo({
      url: `/pages/checkin-detail/checkin-detail?id=${recordId}`
    })
  },

  // 省份点击查看详情
  onProvinceTap(e: WechatMiniprogram.BaseEvent) {
    const provinceCode = e.currentTarget.dataset.code
    const province = this.data.provinceData.find(p => p.provinceCode === provinceCode)
    
    if (!province) return

    if (!province.isUnlocked) {
      wx.showToast({
        title: '该省份暂未解锁',
        icon: 'none'
      })
      return
    }

    // 导航到省份详情页面
    wx.navigateTo({
      url: `/pages/province/detail?provinceCode=${provinceCode}`
    })
  },


  // 下拉刷新
  async onPullDownRefresh() {
    console.log('下拉刷新打卡历史')
    
    try {
      // 同时刷新打卡历史和省份统计，但不让错误相互影响
      const results = await Promise.allSettled([
        this.loadCheckinHistory(),
        this.loadProvinceStats()
      ])
      
      // 检查是否有任何失败
      const hasError = results.some(result => result.status === 'rejected')
      
      if (hasError) {
        console.warn('部分数据刷新失败')
        wx.showToast({
          title: '部分数据刷新失败',
          icon: 'none',
          duration: 1500
        })
      } else {
        wx.showToast({
          title: '刷新完成',
          icon: 'success',
          duration: 1000
        })
      }
    } catch (error) {
      console.error('刷新失败:', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'error',
        duration: 1500
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 删除打卡记录
  onDeleteRecord(e: any) {
    const { id, name } = e.currentTarget.dataset
    
    wx.showModal({
      title: '删除确认',
      content: `确定要删除"${name}"的打卡记录吗？删除后无法恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#ff8fa3',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({
              title: '删除中...',
              mask: true
            })
            
            // 调用后端删除API
            await checkinService.deleteCheckinRecord(id)
            
            // 从本地数据中移除已删除的记录
            const { checkinRecords } = this.data
            const updatedRecords = checkinRecords.filter(record => record.id !== id)
            
            this.setData({
              checkinRecords: updatedRecords,
              totalCheckins: updatedRecords.length
            })
            
            wx.hideLoading()
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 2000
            })
            
          } catch (error) {
            console.error('删除打卡记录失败:', error)
            wx.hideLoading()
            wx.showToast({
              title: '删除失败',
              icon: 'error',
              duration: 2000
            })
          }
        }
      }
    })
  },

  // 加载省份统计数据
  async loadProvinceStats() {
    if (!authService.isLoggedIn()) {
      return
    }

    try {
      console.log('开始加载省份统计数据')
      
      // 直接从后端获取完整的省份数据（包括未探索的）
      const provinceStatsData = await checkinService.getProvinceStats()
      console.log('省份统计API响应:', provinceStatsData)
      
      // 直接使用后端返回的完整省份数据
      const provinceData = (provinceStatsData.provinces || []).map((province: any) => {
        return {
          provinceCode: province.provinceCode,
          provinceName: province.provinceName,
          totalMuseums: province.totalMuseums,
          visitedMuseums: province.visitedMuseums,
          isUnlocked: province.isUnlocked,
          museums: (province.visitedMuseumList || []).map((museum: any) => ({
            id: museum.id,
            name: museum.name,
            isVisited: true
          }))
        }
      }).sort((a: any, b: any) => {
        // 优先排序：已解锁的省份排在前面
        if (a.isUnlocked && !b.isUnlocked) return -1
        if (!a.isUnlocked && b.isUnlocked) return 1
        
        // 同一状态内按省份名称排序
        return a.provinceName.localeCompare(b.provinceName)
      })

      // 更新统计信息
      const overallStats = provinceStatsData.overall || {}
      const unlockedProvinces = overallStats.unlockedProvinces || 0
      const totalProvinces = overallStats.totalProvinces || 34
      
      // 计算覆盖率（优先使用后端返回的值，否则前端计算）
      let coverageRate = 0
      if (overallStats.coverageRate !== undefined) {
        coverageRate = Math.round(overallStats.coverageRate)
      } else if (totalProvinces > 0) {
        coverageRate = Math.round((unlockedProvinces / totalProvinces) * 100)
      }
      
      this.setData({
        provinceData,
        unlockedProvinces: unlockedProvinces,
        totalProvinces: totalProvinces,
        visitedNationalMuseums: overallStats.visitedNationalMuseums || 0,
        totalNationalMuseums: overallStats.totalNationalMuseums || 130,
        coverageRate: coverageRate
      })

      console.log(`省份统计加载成功：解锁${overallStats.unlockedProvinces}个省份，覆盖率${overallStats.coverageRate?.toFixed(1)}%`)

    } catch (error) {
      console.error('加载省份统计失败:', error)
      // 失败时保持页面正常显示，不设置任何默认数据
    }
  },

  // 格式化日期为年月日格式
  formatDateToYMD(dateString: string): string {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('日期格式化失败:', error)
      return dateString.split(' ')[0] || dateString
    }
  },

  // 分享页面
  onShareAppMessage() {
    const { totalCheckins, unlockedProvinces } = this.data
    return {
      title: `我已在${unlockedProvinces}个省份打卡${totalCheckins}个博物馆！`,
      path: '/pages/user/history'
    }
  }
})