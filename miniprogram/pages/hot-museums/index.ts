/**
 * 热门博物馆列表页面
 * 根据用户打卡次数统计的最热门博物馆，支持懒加载
 * 
 * @author lynn
 * @since 2024-01-01
 */

import { museumService, type Museum as ApiMuseum, type TagInfo } from '../../services/museum'

// 页面数据接口定义
interface Museum {
  id: number
  name: string
  location: string
  image: string
  rating: number
  isHot: boolean
  ticketPrice?: string
  hotLevel?: string
  tags?: TagInfo[] // 添加标签字段
}

Page({
  data: {
    // 页面状态
    loading: false,
    refreshing: false,
    loadingMore: false,
    hasMore: true,

    // 分页参数
    currentPage: 1,
    pageSize: 10,
    total: 0,

    // 搜索相关
    searchKeyword: '',

    // 热门博物馆列表
    museums: [] as Museum[]
  },

  onLoad() {
    console.log('热门博物馆列表页面加载')
    this.loadHotMuseums(true)
  },

  // 下拉刷新
  async onPullDownRefresh() {
    console.log('下拉刷新热门博物馆列表')
    this.setData({ refreshing: true })
    await this.loadHotMuseums(true)
    wx.stopPullDownRefresh()
  },

  // 上拉加载更多
  async onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore) {
      return
    }
    console.log('上拉加载更多热门博物馆')
    await this.loadHotMuseums(false)
  },

  // 加载热门博物馆数据
  async loadHotMuseums(isRefresh: boolean = false) {
    if (this.data.loading) return

    const page = isRefresh ? 1 : this.data.currentPage + 1
    
    this.setData({ 
      loading: isRefresh,
      loadingMore: !isRefresh
    })

    try {
      const params: any = {
        page,
        pageSize: this.data.pageSize
      }
      
      // 只在有搜索关键词时才添加name参数
      if (this.data.searchKeyword && this.data.searchKeyword.trim()) {
        params.name = this.data.searchKeyword.trim()
      }
      
      const response = await museumService.getHotMuseums(params)

      const newMuseums: Museum[] = (response.records || []).map((museum, index) => ({
        id: museum.id,
        name: museum.name || '未知博物馆',
        location: museum.address || '位置信息暂无',
        image: (museum as any).image || '/images/bg.png', // 从后端获取图片，无图片时使用默认图片
        rating: (museum as any).rating || 0, // 从后端获取评分，API暂未提供此字段
        isHot: true,
        ticketPrice: this.formatTicketPrice(museum.ticketPrice, museum.freeAdmission),
        hotLevel: this.getHotLevel(page, index),
        tags: this.generateDisplayTags(museum) // 生成显示标签
      }))

      const museums = isRefresh ? newMuseums : [...this.data.museums, ...newMuseums]
      const hasMore = museums.length < response.total

      this.setData({
        museums,
        currentPage: page,
        total: response.total,
        hasMore
      })

      console.log(`热门博物馆加载完成 - 页码：${page}，当前总数：${museums.length}，总记录：${response.total}`)

    } catch (error) {
      console.error('热门博物馆加载失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ 
        loading: false, 
        loadingMore: false,
        refreshing: false
      })
    }
  },

  // 格式化票价显示
  formatTicketPrice(price?: number, freeAdmission?: number): string {
    if (freeAdmission === 1) {
      return '' // 免费博物馆不显示价格标签，通过后端标签显示"免费参观"
    }
    if (!price || price === 0) {
      return '价格待定'
    }
    return `¥${price}`
  },

  // 获取热门等级标签
  getHotLevel(page: number, index: number): string {
    const rank = (page - 1) * this.data.pageSize + index + 1
    
    if (rank <= 3) {
      return '🔥 超热门'
    } else if (rank <= 10) {
      return '🌟 很热门'  
    } else if (rank <= 30) {
      return '👍 热门'
    } else {
      return '📍 推荐'
    }
  },

  // 博物馆点击事件
  onMuseumTap(e: WechatMiniprogram.BaseEvent) {
    const id = e.currentTarget.dataset.id
    console.log('博物馆点击:', id)
    
    wx.navigateTo({
      url: `/pages/museum/detail?id=${id}`,
      fail: () => {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'error'
        })
      }
    })
  },


  // 搜索输入
  onSearchInput(e: WechatMiniprogram.Input) {
    const keyword = e.detail.value.trim()
    this.setData({ searchKeyword: keyword })
  },

  // 搜索确认
  onSearchConfirm() {
    console.log('搜索博物馆:', this.data.searchKeyword)
    this.loadHotMuseums(true)
  },

  // 清除搜索
  onSearchClear() {
    this.setData({ searchKeyword: '' })
    this.loadHotMuseums(true)
  },

  // 生成显示标签（结合后端数据）
  generateDisplayTags(museum: ApiMuseum): TagInfo[] {
    const tags: TagInfo[] = []

    // 1. 后端返回的标签（如果有）
    if (museum.tags && museum.tags.length > 0) {
      tags.push(...museum.tags)
    }

    // 2. 分类标签
    if (museum.categories && museum.categories.length > 0) {
      museum.categories.forEach(category => {
        tags.push({
          id: category.id,
          name: category.name,
          code: category.code,
          color: this.getCategoryColor(category.code)
        })
      })
    }

    // 3. 等级标签
    if (museum.level && museum.level > 0) {
      const levelNames = ['', '一级博物馆', '二级博物馆', '三级博物馆', '四级博物馆', '五级博物馆']
      tags.push({
        id: 9999 + museum.level,
        name: levelNames[museum.level] || `${museum.level}级`,
        code: `LEVEL_${museum.level}`,
        color: '#f6ffed'
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

    return tags
  },

  // 获取分类标签颜色
  getCategoryColor(categoryCode: string): string {
    const colorMap: Record<string, string> = {
      'TYPE_CULTURAL': '#e6f7ff', // 文化文物系统 - 蓝色
      'TYPE_PRIVATE': '#f6ffed',  // 非国有博物馆 - 绿色
      'FOLK': '#fff7e6',          // 民俗类 - 橙色
      'SCIENCE': '#f0f5ff',       // 科技类 - 紫色
      'HISTORY': '#fef1f0',       // 历史类 - 红色
    }
    return colorMap[categoryCode] || '#fafafa'
  }
})
