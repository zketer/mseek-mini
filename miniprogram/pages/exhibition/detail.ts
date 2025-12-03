// exhibition/detail.ts
// 展览详情页

import { museumService, exhibitionService, favoriteService } from '../../services/museum'
import { authService } from '../../services/auth'
import { requireAuthForAction } from '../../utils/auth-guard'

interface ExhibitionDetail {
  id: number
  museumId: number
  museumName: string
  title: string
  description?: string
  coverImage?: string
  startDate: string
  endDate: string
  location?: string
  ticketPrice?: number
  freeAdmission?: number
  status: number
  isPermanent?: number
  images: string[]
  isFavorited: boolean
  // 可能的其他字段
  organizer?: string
  contactPhone?: string
  website?: string
  tags?: string[]
  visitCount?: number
  rating?: number
  reviewCount?: number
}

Page({
  data: {
    exhibitionId: '',
    loading: true,
    error: null as string | null,
    
    // 展览详情
    exhibitionDetail: null as ExhibitionDetail | null,
    
    // 描述展开状态
    showFullDesc: false
  },

  // 数字格式化函数
  formatNumber(num: number | undefined): string {
    if (!num || num === 0) return '0'
    
    // 超过万的数字用万为单位
    if (num >= 10000) {
      const wan = Math.floor(num / 10000)
      const remainder = num % 10000
      if (remainder === 0) {
        return `${wan}万`
      } else {
        return `${wan}.${Math.floor(remainder / 1000)}万`
      }
    }
    
    // 小于万的数字直接显示
    return num.toLocaleString()
  },

  onLoad(options: Record<string, string>) {
    // 获取页面参数
    const exhibitionId = options.id || '1'
    console.log('展览详情页参数:', { options, exhibitionId })
    
    this.setData({ exhibitionId })
    this.loadExhibitionDetail()
  },

  onShow() {
    // 检查是否有登录后需要执行的操作
    this.checkPendingAction()
  },

  // 检查并执行登录后的待处理操作
  checkPendingAction() {
    try {
      const pendingAction = wx.getStorageSync('auth_pending_action')
      if (pendingAction && authService.isLoggedIn()) {
        console.log('发现登录后待执行的操作:', pendingAction)
        
        // 清除待处理的操作标记
        wx.removeStorageSync('auth_pending_action')
        wx.removeStorageSync('auth_success_callback')
        
        // 根据操作类型执行对应的操作
        setTimeout(() => {
          this.performFavoriteAction()
        }, 500) // 延迟执行，确保页面状态稳定
      }
    } catch (error) {
      console.error('检查待处理操作失败:', error)
    }
  },

  onPullDownRefresh() {
    // 下拉刷新时重新加载数据
    this.checkPendingAction()
    this.loadExhibitionDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载展览详情
  async loadExhibitionDetail() {
    const exhibitionId = parseInt(this.data.exhibitionId)
    if (!exhibitionId) {
      this.setData({ 
        error: '展览ID无效',
        loading: false 
      })
      return
    }

    console.log('加载展览详情:', exhibitionId)
    this.setData({ loading: true, error: null })

    try {
      const exhibition = await exhibitionService.getExhibitionDetail(exhibitionId) as any
      if (!exhibition) {
        throw new Error('展览信息不存在')
      }

      // 转换数据格式
      const exhibitionDetail: ExhibitionDetail = {
        id: exhibition.id,
        museumId: exhibition.museumId,
        museumName: exhibition.museumName,
        title: exhibition.title,
        description: exhibition.description || '暂无介绍',
        coverImage: exhibition.coverImage,
        startDate: exhibition.startDate,
        endDate: exhibition.endDate,
        location: exhibition.location,
        ticketPrice: exhibition.ticketPrice,
        freeAdmission: exhibition.freeAdmission,
        status: exhibition.status,
        isPermanent: exhibition.isPermanent,
        images: exhibition.imageUrls && exhibition.imageUrls.length > 0 ? exhibition.imageUrls : (exhibition.coverImage ? [exhibition.coverImage] : ['/images/bg.png']),
        isFavorited: false, // TODO: 从用户收藏状态获取
        
        // 其他可能字段
        organizer: exhibition.organizer,
        contactPhone: exhibition.contactPhone,
        website: exhibition.website,
        tags: exhibition.tags?.map((tag: any) => tag.name) || [],
        visitCount: exhibition.visitCount,
        rating: exhibition.rating || 4.5,
        reviewCount: exhibition.reviewCount || 0
      }

      this.setData({ 
        exhibitionDetail,
        loading: false 
      })

      // 加载收藏状态
      await this.loadFavoriteStatus()

    } catch (error) {
      console.error('加载展览详情失败:', error)
      this.setData({ 
        error: error instanceof Error ? error.message : '加载失败',
        loading: false 
      })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 加载收藏状态
  async loadFavoriteStatus() {
    if (!authService.isLoggedIn() || !this.data.exhibitionDetail) {
      return
    }

    try {
      const isFavorited = await favoriteService.checkExhibitionFavorite(this.data.exhibitionDetail.id)
      this.setData({ 'exhibitionDetail.isFavorited': isFavorited })
      console.log('展览收藏状态加载成功:', isFavorited)
    } catch (error) {
      console.error('加载展览收藏状态失败:', error)
    }
  },

  // 图片预览
  onImagePreview(e: WechatMiniprogram.BaseEvent) {
    if (!this.data.exhibitionDetail) return
    
    const url = e.currentTarget.dataset.url
    wx.previewImage({
      urls: this.data.exhibitionDetail.images,
      current: url
    })
  },

  // 分享
  onShare() {
    wx.showToast({
      title: '分享功能正在开发中',
      icon: 'none',
      duration: 2000
    })
  },

  // 收藏
  async onFavorite() {
    if (!this.data.exhibitionDetail) return

    // 检查登录状态 - 使用操作级认证
    if (!authService.isLoggedIn()) {
      await requireAuthForAction('收藏展览', () => {
        this.performFavoriteAction()
      })
      return
    }

    // 已登录，直接执行收藏操作
    this.performFavoriteAction()
  },

  // 执行收藏操作的具体逻辑
  async performFavoriteAction() {
    if (!this.data.exhibitionDetail) return

    const exhibitionId = this.data.exhibitionDetail.id
    const isFavorited = this.data.exhibitionDetail.isFavorited

    try {
      wx.showLoading({
        title: isFavorited ? '取消收藏中...' : '收藏中...'
      })

      // 调用收藏/取消收藏API
      let success = false
      if (isFavorited) {
        success = await favoriteService.unfavoriteExhibition(exhibitionId)
      } else {
        success = await favoriteService.favoriteExhibition(exhibitionId)
      }

      wx.hideLoading()

      if (success) {
        // 更新本地状态
        this.setData({
          'exhibitionDetail.isFavorited': !isFavorited
        })

        wx.showToast({
          title: isFavorited ? '已取消收藏' : '已添加收藏',
          icon: 'success'
        })
      } else {
        throw new Error('服务器返回操作失败')
      }

    } catch (error) {
      wx.hideLoading()
      console.error('展览收藏操作失败:', error)
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      })
    }
  },

  // 导航到博物馆
  onNavigateToMuseum() {
    if (!this.data.exhibitionDetail) return
    
    wx.navigateTo({
      url: `/pages/museum/detail?id=${this.data.exhibitionDetail.museumId}`
    })
  },

  // 电话咨询
  onPhone() {
    const exhibitionDetail = this.data.exhibitionDetail
    const phoneNumber = exhibitionDetail?.contactPhone || '400-123-4567'
    
    wx.showModal({
      title: '拨打电话',
      content: `是否拨打 ${phoneNumber}？`,
      confirmText: '拨打',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber,
            fail: (error) => {
              console.error('拨打电话失败:', error)
              wx.showToast({
                title: '拨打失败',
                icon: 'error'
              })
            }
          })
        }
      }
    })
  },

  // 访问官方网站
  onWebsite() {
    const exhibitionDetail = this.data.exhibitionDetail
    const website = exhibitionDetail?.website
    
    if (!website) {
      wx.showToast({
        title: '网站链接不可用',
        icon: 'error'
      })
      return
    }

    wx.showModal({
      title: '访问官方网站',
      content: `即将跳转到：${website}`,
      confirmText: '访问',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 复制链接到剪贴板，因为小程序无法直接打开外部网站
          wx.setClipboardData({
            data: website,
            success: () => {
              wx.showToast({
                title: '链接已复制到剪贴板',
                icon: 'success'
              })
            },
            fail: () => {
              wx.showToast({
                title: '复制失败',
                icon: 'error'
              })
            }
          })
        }
      }
    })
  },

  // 展开/收起描述
  onToggleDesc() {
    this.setData({
      showFullDesc: !this.data.showFullDesc
    })
  },

  // 页面分享
  onShareAppMessage() {
    const exhibitionDetail = this.data.exhibitionDetail
    if (!exhibitionDetail) {
      return {
        title: '文博探索 - 展览详情',
        path: `/pages/exhibition/detail?id=${this.data.exhibitionId}`
      }
    }

    return {
      title: `${exhibitionDetail.title} - ${exhibitionDetail.museumName}`,
      path: `/pages/exhibition/detail?id=${exhibitionDetail.id}`,
      imageUrl: exhibitionDetail.coverImage || '/images/bg.png'
    }
  }
})