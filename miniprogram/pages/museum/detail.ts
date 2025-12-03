// museum/detail.ts
// 博物馆详情页

import { museumService, favoriteService } from '../../services/museum'
import { authService } from '../../services/auth'

interface MuseumDetail {
  id: number
  name: string
  address: string
  openTime?: string
  ticketPrice?: string
  rating?: number
  reviewCount?: number
  description?: string
  images: string[]
  tags: string[]
  isFavorited: boolean
  longitude?: number
  latitude?: number
  status: number
  level?: number
  phone?: string
  website?: string
  isOpen?: boolean
  type?: string
  collectionCount?: number
  visitorCount?: number
  exhibitions?: number
  educationActivities?: number
  preciousItems?: number
  capacity?: number
  freeAdmission?: number
  ticketDescription?: string
  code?: string
  cityName?: string
  provinceName?: string
}

Page({
  data: {
    museumId: '',
    loading: true,
    error: null as string | null,
    
    // 博物馆详情
    museumDetail: null as MuseumDetail | null,

    // 展览信息
    exhibitions: [],
    
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
    const museumId = options.id || '1'
    
    console.log('博物馆详情页参数:', { options, museumId })
    
    this.setData({
      museumId: museumId
    })
    
    this.loadMuseumDetail()
  },

  onShow() {
    // 页面显示时重新加载数据
  },

  onPullDownRefresh() {
    // 下拉刷新时重新加载数据
    this.loadMuseumDetail().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载博物馆详情
    async loadMuseumDetail() {
      const museumId = parseInt(this.data.museumId)
      if (!museumId) {
        this.setData({ 
          error: '博物馆ID无效',
          loading: false 
        })
        return
      }

      console.log('加载博物馆详情:', museumId)
      this.setData({ loading: true, error: null })

      try {
        const museum = await museumService.getMuseumDetail(museumId) as any
        if (!museum) {
          throw new Error('博物馆信息不存在')
        }

        // 转换数据格式
        const museumDetail: MuseumDetail = {
          id: museum.id,
          name: museum.name,
          address: museum.address,
          description: museum.description || '暂无介绍',
          images: museum.imageUrls && museum.imageUrls.length > 0 ? museum.imageUrls : ['/images/bg.png'],
          tags: museum.tags?.map((tag: any) => tag.name) || [],
          isFavorited: false, // 将在下面异步获取真实收藏状态
          longitude: museum.longitude,
          latitude: museum.latitude,
          status: museum.status,
          level: museum.level,
          type: museum.type,
          openTime: museum.openTime || '09:00-17:00',
          ticketPrice: museum.freeAdmission === 1 ? '免费' : (museum.ticketPrice ? `¥${museum.ticketPrice}` : '票价详询'),
          rating: museum.rating || 0, // 从后端获取评分，如果没有则为0
          reviewCount: museum.reviewCount || 0, // 从后端获取评价数
          
          // 新增统计数据字段
          collectionCount: museum.collectionCount || 0,
          visitorCount: museum.visitorCount || 0,
          exhibitions: museum.exhibitions || 0,
          educationActivities: museum.educationActivities || 0,
          preciousItems: museum.preciousItems || 0,
          capacity: museum.capacity || 0,
          freeAdmission: museum.freeAdmission,
          ticketDescription: museum.ticketDescription,
          phone: museum.phone,
          website: museum.website,
          code: museum.code,
          cityName: museum.cityName,
          provinceName: museum.provinceName,
          isOpen: this.checkIsOpen(museum.openTime || '09:00-17:00') // 根据开放时间判断
        }

        this.setData({ 
          museumDetail,
          loading: false 
        })

        // 异步获取收藏状态
        this.loadFavoriteStatus(museum.id)

      } catch (error) {
        console.error('加载博物馆详情失败:', error)
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


    // 图片预览
    onImagePreview(e: WechatMiniprogram.BaseEvent) {
      if (!this.data.museumDetail) return
      
      const url = e.currentTarget.dataset.url
      wx.previewImage({
        urls: this.data.museumDetail.images,
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
      if (!this.data.museumDetail) return

      // 检查登录状态
      if (!authService.isLoggedIn()) {
        wx.showModal({
          title: '需要登录',
          content: '收藏功能需要登录后使用，是否前往登录？',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              // 构建当前页面URL作为回调
              const currentUrl = `/pages/museum/detail?id=${this.data.museumId}`
              wx.navigateTo({
                url: `/pages/login/login?redirect=${encodeURIComponent(currentUrl)}`
              })
            }
          }
        })
        return
      }

      // 已登录，直接执行收藏操作
      this.performFavoriteAction()
    },

    // 执行收藏操作的具体逻辑
    async performFavoriteAction() {
      if (!this.data.museumDetail) return

      const museumId = this.data.museumDetail.id
      const isFavorited = this.data.museumDetail.isFavorited

      try {
        wx.showLoading({
          title: isFavorited ? '取消收藏中...' : '收藏中...'
        })

        // 调用收藏/取消收藏API
        let success = false
        if (isFavorited) {
          success = await favoriteService.unfavoriteMuseum(museumId)
        } else {
          success = await favoriteService.favoriteMuseum(museumId)
        }

        wx.hideLoading()

        if (success) {
          // 更新本地状态
          this.setData({
            'museumDetail.isFavorited': !isFavorited
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
        console.error('收藏操作失败:', error)
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'error'
        })
      }
    },

    // 立即打卡
    async onCheckin() {
      if (!this.data.museumDetail) return

      // 检查登录状态
      if (!authService.isLoggedIn()) {
        wx.showModal({
          title: '需要登录',
          content: '请先登录后再进行打卡',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              // 跳转到登录页面，带上回调参数
              const redirectUrl = `/pages/checkin-action/checkin-action?id=${this.data.museumDetail!.id}&fresh=true`
              wx.navigateTo({
                url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
              })
            }
          }
        })
        return
      }

      // 跳转到打卡页面，添加 fresh=true 参数表示这是新的打卡，不加载暂存内容
      wx.navigateTo({
        url: `/pages/checkin-action/checkin-action?id=${this.data.museumDetail.id}&fresh=true`
      })
    },

    // 导航前往
    onNavigation() {
      if (!this.data.museumDetail) return

      const { latitude, longitude, name, address } = this.data.museumDetail

      if (!latitude || !longitude) {
        wx.showToast({
          title: '暂无位置信息',
          icon: 'error'
        })
        return
      }

      wx.openLocation({
        latitude,
        longitude,
        name,
        address,
        scale: 15,
        fail: (error) => {
          console.error('打开地图失败:', error)
          wx.showToast({
            title: '打开地图失败',
            icon: 'error'
          })
        }
      })
    },

  // 检查博物馆是否开放
  checkIsOpen(openTime: string): boolean {
    if (!openTime || openTime === '全天开放') {
      return true
    }
    
    try {
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinute = now.getMinutes()
      const currentTime = currentHour * 60 + currentMinute // 转换为分钟
      
      // 解析开放时间，格式如 "09:00-17:00"
      const timeRange = openTime.split('-')
      if (timeRange.length !== 2) {
        return true // 格式不正确时默认开放
      }
      
      const [startTime, endTime] = timeRange
      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      
      const openMinutes = startHour * 60 + (startMinute || 0)
      const closeMinutes = endHour * 60 + (endMinute || 0)
      
      return currentTime >= openMinutes && currentTime <= closeMinutes
    } catch (error) {
      console.error('解析开放时间失败:', error)
      return true // 解析失败时默认开放
    }
  },

  // 异步获取收藏状态
  async loadFavoriteStatus(museumId: number) {
    if (!authService.isLoggedIn()) {
      return // 未登录时不获取收藏状态
    }

    try {
      const isFavorited = await favoriteService.checkMuseumFavorite(museumId)
      this.setData({
        'museumDetail.isFavorited': isFavorited
      })
    } catch (error) {
      console.error('获取收藏状态失败:', error)
      // 获取失败时保持默认状态
    }
  },

  // 电话咨询
  onPhone() {
    const museumDetail = this.data.museumDetail
    const phoneNumber = museumDetail?.phone
    
    if (!phoneNumber) {
      wx.showToast({
        title: '该博物馆暂未提供联系电话',
        icon: 'none'
      })
      return
    }

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
    const museumDetail = this.data.museumDetail
    const website = museumDetail?.website
    
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

    // 展览点击
    onExhibitionTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('展览点击:', id)
      
      if (!id) {
        wx.showToast({
          title: '展览ID无效',
          icon: 'error'
        })
        return
      }
      
      wx.navigateTo({
        url: `/pages/exhibition/detail?id=${id}`,
        fail: (error) => {
          console.error('跳转展览详情失败:', error)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'error'
          })
        }
      })
    },


    // 页面分享
    onShareAppMessage() {
      const museumDetail = this.data.museumDetail
      if (!museumDetail) {
        return {
          title: '博物馆详情',
          path: `/pages/museum/detail?id=${this.data.museumId}`
        }
      }
      
      return {
        title: museumDetail.name,
        path: `/pages/museum/detail?id=${this.data.museumId}`,
        imageUrl: museumDetail.images[0]
      }
    }
})
