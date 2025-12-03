// user/favorites.ts
// 我的收藏页面

import { favoriteService, FavoriteStats } from '../../services/museum'
import { authService } from '../../services/auth'
import { checkPageAuth } from '../../utils/auth-guard'

interface FavoriteMuseum {
  id: number
  name: string
  cityName: string
  provinceName: string
  address: string
  level: string
  category: string
  rating?: number
  distance?: string
  ticketPrice?: string
  images?: string[]
  isVisited: boolean
  favoriteTime: string
}

interface FavoriteExhibition {
  id: number
  title: string
  museumName: string
  cityName: string
  startDate: string
  endDate: string
  category: string
  status: 'ongoing' | 'upcoming' | 'ended'
  isPermanent: boolean
  ticketPrice?: string
  images?: string[]
  favoriteTime: string
}

Page({
  data: {
    // 当前选中的类型：museums | exhibitions
    activeTab: 'museums',

    // 用户ID（实际应用中从登录状态获取）
    userId: 1,

    // 收藏的博物馆
    favoriteMuseums: [] as FavoriteMuseum[],

    // 收藏的展览
    favoriteExhibitions: [] as FavoriteExhibition[],

    // 统计信息
    totalFavoriteMuseums: 0,
    totalFavoriteExhibitions: 0,
    
    // 筛选和排序
    museumFilter: 'all', // all | visited | unvisited
    exhibitionFilter: 'all', // all | ongoing | upcoming | ended
    sortBy: 'time', // time | name | distance

    // 加载状态
    loading: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10
  },

  async onLoad() {
    console.log('我的收藏页面加载')
    
    // 检查登录状态
    const isAuthorized = await checkPageAuth('我的收藏')
    if (!isAuthorized) {
      return
    }
    
    this.loadFavoriteStats()
    this.loadFavorites()
  },

  // 加载收藏统计数据
  async loadFavoriteStats() {
    try {
      const stats = await favoriteService.getUserFavoriteStats()
      this.setData({
        totalFavoriteMuseums: stats.museumCount,
        totalFavoriteExhibitions: stats.exhibitionCount
      })
    } catch (error) {
      console.error('加载收藏统计失败：', error)
    }
  },

  // 加载收藏数据
  async loadFavorites() {
    const { activeTab, userId, currentPage, pageSize, museumFilter, exhibitionFilter, sortBy } = this.data
    
    this.setData({ loading: true })

    try {
      if (activeTab === 'museums') {
        await this.loadFavoriteMuseums()
      } else {
        await this.loadFavoriteExhibitions()
      }
    } catch (error) {
      console.error('加载收藏数据失败：', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载收藏的博物馆
  async loadFavoriteMuseums(append = false) {
    const { currentPage, pageSize, museumFilter, sortBy } = this.data
    
    let visitStatus: boolean | null = null
    if (museumFilter === 'visited') visitStatus = true
    if (museumFilter === 'unvisited') visitStatus = false

    const result = await favoriteService.getUserFavoriteMuseums({
      page: currentPage,
      pageSize,
      visitStatus,
      sortBy
    })

    const museums = result.records || []
    
    this.setData({
      favoriteMuseums: append ? [...this.data.favoriteMuseums, ...museums] : museums,
      hasMore: museums.length === pageSize,
      currentPage: append ? currentPage + 1 : currentPage
    })
  },

  // 加载收藏的展览
  async loadFavoriteExhibitions(append = false) {
    const { currentPage, pageSize, exhibitionFilter, sortBy } = this.data
    
    let status: number | null = null
    if (exhibitionFilter === 'ongoing') status = 1
    if (exhibitionFilter === 'upcoming') status = 2
    if (exhibitionFilter === 'ended') status = 0

    const result = await favoriteService.getUserFavoriteExhibitions({
      page: currentPage,
      pageSize,
      status,
      sortBy
    })

    const exhibitions = result.records || []
    
    this.setData({
      favoriteExhibitions: append ? [...this.data.favoriteExhibitions, ...exhibitions] : exhibitions,
      hasMore: exhibitions.length === pageSize,
      currentPage: append ? currentPage + 1 : currentPage
    })
  },

  // 切换标签
  onTabChange(e: WechatMiniprogram.BaseEvent) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ 
      activeTab: tab,
      currentPage: 1
    })
    this.loadFavorites()
  },

  // 博物馆筛选
  onMuseumFilterTap(e: WechatMiniprogram.BaseEvent) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ 
      museumFilter: filter,
      currentPage: 1
    })
    this.loadFavoriteMuseums()
  },

  // 展览筛选
  onExhibitionFilterTap(e: WechatMiniprogram.BaseEvent) {
    const filter = e.currentTarget.dataset.filter
    this.setData({ 
      exhibitionFilter: filter,
      currentPage: 1
    })
    this.loadFavoriteExhibitions()
  },

  // 排序方式切换
  onSortTap(e: WechatMiniprogram.BaseEvent) {
    const sort = e.currentTarget.dataset.sort
    this.setData({ 
      sortBy: sort,
      currentPage: 1
    })
    
    if (this.data.activeTab === 'museums') {
      this.loadFavoriteMuseums()
    } else {
      this.loadFavoriteExhibitions()
    }
  },

  // 博物馆卡片点击
  onMuseumTap(e: WechatMiniprogram.BaseEvent) {
    const museumId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/museum/detail?id=${museumId}`
    })
  },

  // 展览卡片点击
  onExhibitionTap(e: WechatMiniprogram.BaseEvent) {
    const exhibitionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/exhibition/detail?id=${exhibitionId}`
    })
  },

  // 取消收藏
  onUnfavorite(e: WechatMiniprogram.BaseEvent) {
    const { type, id } = e.currentTarget.dataset
    
    console.log('🗑️ 准备取消收藏：', { type, id, currentUserId: authService.getCurrentUserId() })
    
    wx.showModal({
      title: '取消收藏',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            let success = false
            
            console.log('🔄 开始取消收藏请求...', { type, id })
            
            if (type === 'museum') {
              success = await favoriteService.unfavoriteMuseum(id)
              console.log('📥 取消收藏博物馆API响应：', { id, success })
              
              if (success) {
                const originalCount = this.data.favoriteMuseums.length
                const museums = this.data.favoriteMuseums.filter(m => m.id !== id)
                const newCount = museums.length
                
                console.log('🔢 更新本地博物馆列表：', { 
                  originalCount, 
                  newCount, 
                  removed: originalCount - newCount,
                  museumId: id 
                })
                
                this.setData({ 
                  favoriteMuseums: museums,
                  totalFavoriteMuseums: Math.max(0, this.data.totalFavoriteMuseums - 1)
                })
              }
            } else if (type === 'exhibition') {
              success = await favoriteService.unfavoriteExhibition(id)
              console.log('📥 取消收藏展览API响应：', { id, success })
              
              if (success) {
                const originalCount = this.data.favoriteExhibitions.length
                const exhibitions = this.data.favoriteExhibitions.filter(e => e.id !== id)
                const newCount = exhibitions.length
                
                console.log('🔢 更新本地展览列表：', { 
                  originalCount, 
                  newCount, 
                  removed: originalCount - newCount,
                  exhibitionId: id 
                })
                
                this.setData({ 
                  favoriteExhibitions: exhibitions,
                  totalFavoriteExhibitions: Math.max(0, this.data.totalFavoriteExhibitions - 1)
                })
              }
            }
            
            if (success) {
              console.log('✅ 取消收藏成功，等待刷新验证...')
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              })
              
              // 延迟1秒后重新验证数据（用于调试）
              setTimeout(() => {
                console.log('🔍 1秒后验证 - 当前本地数据：', {
                  museums: this.data.favoriteMuseums.length,
                  exhibitions: this.data.favoriteExhibitions.length,
                  totalMuseums: this.data.totalFavoriteMuseums,
                  totalExhibitions: this.data.totalFavoriteExhibitions
                })
              }, 1000)
              
            } else {
              console.error('❌ 取消收藏失败 - API返回false')
              wx.showToast({
                title: '取消收藏失败',
                icon: 'error'
              })
            }
          } catch (error) {
            console.error('❌ 取消收藏异常：', error)
            wx.showToast({
              title: '取消收藏失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  // 顶部星标点击（阻止冒泡，避免跳转）
  onFavoriteStarTap(e: WechatMiniprogram.BaseEvent) {
    // catchtap 已经阻止了冒泡，这里无需再调用 stopPropagation
    // 某些运行时不会注入 stopPropagation，防御处理
    const anyEvt = e as any
    if (anyEvt && typeof anyEvt.stopPropagation === 'function') {
      try { anyEvt.stopPropagation() } catch {}
    }
    const { type, id } = e.currentTarget.dataset
    // 这里先复用取消收藏逻辑（也可以切换收藏状态，按需调整）
    this.onUnfavorite({ currentTarget: { dataset: { type, id } } } as any)
  },


  // 下拉刷新
  async onPullDownRefresh() {
    console.log('🔄 开始下拉刷新收藏数据...')
    console.log('📊 刷新前本地数据状态：', {
      activeTab: this.data.activeTab,
      museums: this.data.favoriteMuseums.length,
      exhibitions: this.data.favoriteExhibitions.length,
      totalMuseums: this.data.totalFavoriteMuseums,
      totalExhibitions: this.data.totalFavoriteExhibitions,
      currentUserId: authService.getCurrentUserId()
    })
    
    this.setData({ currentPage: 1 })
    
    try {
      console.log('📈 重新加载收藏统计...')
      await this.loadFavoriteStats()
      
      console.log('📋 重新加载收藏列表...')
      await this.loadFavorites()
      
      console.log('📊 刷新后本地数据状态：', {
        museums: this.data.favoriteMuseums.length,
        exhibitions: this.data.favoriteExhibitions.length,
        totalMuseums: this.data.totalFavoriteMuseums,
        totalExhibitions: this.data.totalFavoriteExhibitions
      })
      
      // 检查是否有之前取消但又出现的项目
      const suspiciousItems = this.data.favoriteMuseums.filter(museum => {
        // 这里可以添加更多检查逻辑
        return false // 暂时不检查
      })
      
      if (suspiciousItems.length > 0) {
        console.warn('⚠️ 发现可疑的收藏项（可能是取消后又出现的）：', suspiciousItems)
      }
      
      console.log('✅ 下拉刷新完成')
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      })
    } catch (error) {
      console.error('❌ 下拉刷新失败：', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },

  // 分享页面
  onShareAppMessage() {
    const { totalFavoriteMuseums, totalFavoriteExhibitions } = this.data
    return {
      title: `我收藏了${totalFavoriteMuseums}个博物馆和${totalFavoriteExhibitions}个展览！`,
      path: '/pages/user/favorites'
    }
  }
})