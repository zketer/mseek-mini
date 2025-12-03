// index.ts
// 博物馆小程序首页 - 使用真实后端API数据
// 
// 🚧 待对接后端接口清单：
// 1. 搜索功能 - 搜索博物馆、展览
// 2. 博物馆图片 - 博物馆封面图片
// 3. 博物馆评分 - 用户评分数据
// 4. 距离计算 - 根据用户位置计算距离
// 5. 同城博物馆 - 基于城市范围的博物馆展示
// 6. 打卡功能 - 博物馆打卡记录
// 7. 积分商城 - 积分兑换功能
//
// 导入简洁的API服务和类型
import {
  bannerService, 
  announcementService, 
  museumService,
  exhibitionService,
  type Banner as ApiBanner,
  type Museum as ApiMuseum,
  type TagInfo
} from '../../services/museum'
import { authService } from '../../services/auth'

// 页面数据接口定义
interface Banner {
  id: number
  title: string
  subtitle: string
  image: string
  link?: string
}

interface Announcement {
  id: number
  content: string
  type: 'info' | 'warning' | 'success' | 'error'
}

interface QuickEntry {
  id: number
  name: string
  icon: string
  type: string
}

interface Museum {
  id: number
  name: string
  location: string
  image: string
  rating: number
  distance: string
  isHot: boolean
  ticketPrice?: string
  tags?: TagInfo[] // 添加标签字段
}

interface Exhibition {
  id: number
  title: string
  museum: string
  image: string
  startDate: string
  endDate: string
  status: '进行中' | '即将开始' | '已结束'
}

Component({
  data: {
    // 页面状态
    loading: true,
    refreshing: false,

    // 轮播图数据
    bannerList: [] as Banner[],

    // 公告数据
    announcements: [] as Announcement[],

    // 快速入口
    quickEntries: [
      {
        id: 1,
        name: '同城博物馆',
        icon: '/images/Icon1.png',
        type: 'nearby'
      },
      {
        id: 2,
        name: '成就徽章',
        icon: '/images/Icon2.png',
        type: 'achievements'
      },
      {
        id: 3,
        name: '我的打卡',
        icon: '/images/Icon3.png',
        type: 'checkin'
      },
      {
        id: 4,
        name: '我的收藏',
        icon: '/images/Icon4.png',
        type: 'favorites'
      },
      {
        id: 5,
        name: '更多功能',
        icon: '/images/Icon5.png',
        type: 'more'
      }
    ] as QuickEntry[],

    // 热门博物馆
    hotMuseums: [] as Museum[],

    // 最新展览数据
    exhibitions: [] as Exhibition[]
  },

  lifetimes: {
    attached() {
      this.loadPageData()
    }
  },

  methods: {
    // 加载页面数据
    async loadPageData() {
      console.log('开始加载首页数据...')
      this.setData({ loading: true })

      try {
        // 并行加载各种数据
        const [banners, announcements, museums, exhibitions] = await Promise.all([
          this.loadBanners(),
          this.loadAnnouncements(), 
          this.loadHotMuseums(),
          this.loadLatestExhibitions()
        ])

        console.log('首页数据加载完成', { banners, announcements, museums, exhibitions })
      } catch (error) {
        console.error('首页数据加载失败:', error)
        wx.showToast({
          title: '数据加载失败',
          icon: 'error'
        })
      } finally {
        this.setData({ loading: false, refreshing: false })
      }
    },

    // 加载轮播图数据
    async loadBanners(): Promise<Banner[]> {
      try {
        const apiBanners = await bannerService.getActiveBanners(5)
        const banners: Banner[] = apiBanners.map(banner => ({
          id: banner.id,
          title: banner.title || '博物馆推荐',
          subtitle: '发现文化之美', // 后端暂无副标题字段，使用固定文案
          image: banner.imageUrl || '/images/bg.png',
          link: this.buildBannerLink(banner)
        }))

        this.setData({ bannerList: banners })
        return banners
      } catch (error) {
        console.error('轮播图加载失败:', error)
        // 加载失败时保持空数组
        this.setData({ bannerList: [] })
        return []
      }
    },

    // 构建轮播图链接
    buildBannerLink(banner: ApiBanner): string {
      if (!banner.linkType || banner.linkType === 'none') {
        return ''
      }
      
      switch (banner.linkType) {
        case 'museum':
          return `/pages/museum/detail?id=${banner.linkValue}`
        case 'exhibition':
          return `/pages/exhibition/detail?id=${banner.linkValue}`
        case 'external':
          return banner.linkValue || ''
        default:
          return ''
      }
    },

    // 加载公告数据
    async loadAnnouncements(): Promise<Announcement[]> {
      try {
        const apiAnnouncements = await announcementService.getActiveAnnouncements(3)
        const announcements: Announcement[] = apiAnnouncements.map(announcement => ({
          id: announcement.id,
          content: announcement.content || announcement.title || '',
          type: this.mapAnnouncementType(announcement.type || 'GENERAL')
        }))

        this.setData({ announcements })
        return announcements
      } catch (error) {
        console.error('公告加载失败:', error)
        // 加载失败时保持空数组
        this.setData({ announcements: [] })
        return []
      }
    },

    // 映射公告类型
    mapAnnouncementType(type?: string): 'info' | 'warning' | 'success' | 'error' {
      switch (type) {
        case 'maintenance':
          return 'warning'
        case 'activity':
          return 'success'
        case 'urgent':
          return 'error'
        default:
          return 'info'
      }
    },

    // 加载热门博物馆数据
    async loadHotMuseums(): Promise<Museum[]> {
      try {
        const response = await museumService.getHotMuseums({
          page: 1,
          pageSize: 5 // 首页只显示6个热门博物馆
        })

        const museums: Museum[] = (response.records || []).map(museum => ({
          id: museum.id,
          name: museum.name || '未知博物馆',
          location: museum.address || '位置信息暂无',
          image: '/images/bg.png', // 🚧 待对接：博物馆图片接口
          rating: 4.5, // 🚧 待对接：博物馆评分接口
          distance: '距离未知', // 🚧 待对接：距离计算接口
          isHot: true,
          ticketPrice: this.formatTicketPrice(museum.ticketPrice, museum.freeAdmission),
          tags: this.generateDisplayTags(museum) // 生成显示标签
        }))

        this.setData({ hotMuseums: museums })
        return museums
      } catch (error) {
        console.error('热门博物馆加载失败:', error)
        // 加载失败时保持空数组
        this.setData({ hotMuseums: [] })
        return []
      }
    },

    // 格式化票价显示
    formatTicketPrice(price?: number, freeAdmission?: number): string {
      // 免费门票不显示价格，通过标签显示
      if (freeAdmission === 1) {
        return ''
      }
      if (!price || price === 0) {
        return '暂无信息'
      }
      return `¥${price}`
    },

    // 加载最新展览数据
    async loadLatestExhibitions(): Promise<Exhibition[]> {
      try {
        const response = await exhibitionService.getLatestExhibitions({
          page: 1,
          pageSize: 5 // 首页只显示5个最新展览
        })

        const exhibitions: Exhibition[] = (response.records || []).map(exhibition => ({
          id: exhibition.id,
          title: exhibition.title || '未知展览',
          museum: exhibition.museumName || '未知博物馆',
          image: exhibition.coverImage || '/images/bg.png',
          startDate: this.formatDate(exhibition.startDate),
          endDate: this.formatDate(exhibition.endDate),
          status: this.getExhibitionStatus(exhibition.startDate, exhibition.endDate, exhibition.isPermanent)
        }))

        this.setData({ exhibitions })
        return exhibitions
      } catch (error) {
        console.error('最新展览加载失败:', error)
        // 加载失败时保持空数组
        this.setData({ exhibitions: [] })
        return []
      }
    },

    // 格式化日期显示
    formatDate(dateString: string): string {
      if (!dateString) return ''
      const date = new Date(dateString)
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    // 获取展览状态
    getExhibitionStatus(startDate: string, endDate: string, isPermanent: number): '进行中' | '即将开始' | '已结束' {
      if (isPermanent === 1) {
        return '进行中'
      }
      
      const now = new Date()
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (now < start) {
        return '即将开始'
      } else if (now > end) {
        return '已结束'
      } else {
        return '进行中'
      }
    },

    // 轮播图点击
    async onBannerTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      const link = e.currentTarget.dataset.link
      console.log('轮播图点击:', { id, link })

      // 记录点击统计
      try {
        await bannerService.recordClick(id)
      } catch (error) {
        console.error('轮播图点击统计失败:', error)
      }

      // 跳转到对应页面
      if (link) {
        wx.navigateTo({
          url: link,
          fail: () => {
            wx.showToast({
              title: '页面跳转失败',
              icon: 'error'
            })
          }
        })
      }
    },

    // 公告点击
    onNoticeTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('公告点击:', id)
      
      // 从公告列表中找到对应的公告
      const announcement = this.data.announcements.find(item => item.id === id)
      
      if (!announcement) {
        wx.showToast({
          title: '公告信息不存在',
          icon: 'error'
        })
        return
      }
      
      // 弹出公告详情
      wx.showModal({
        title: (announcement as any).title || '系统公告',
        content: announcement.content,
        showCancel: false,
        confirmText: '我知道了',
        confirmColor: '#ff8fa3'
      })
    },

    // 快速入口点击
    async onQuickEntryTap(e: WechatMiniprogram.BaseEvent) {
      const type = e.currentTarget.dataset.type
      console.log('快速入口点击:', type)
      
      switch (type) {
        case 'nearby':
          // 同城博物馆不需要登录
          wx.navigateTo({
            url: '/pages/museum/nearby'
          })
          break
          
        case 'achievements':
          // 成就徽章需要登录，登录成功后自动跳转到成就页面
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '成就徽章功能需要登录后使用，是否前往登录？',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({
                    url: `/pages/login/login?redirect=${encodeURIComponent('/pages/achievements/achievements')}`
                  })
                }
              }
            })
          } else {
            wx.navigateTo({
              url: '/pages/achievements/achievements'
            })
          }
          break
          
        case 'checkin':
          // 我的打卡需要登录，登录成功后自动跳转到打卡历史页面
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '我的打卡功能需要登录后使用，是否前往登录？',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({
                    url: `/pages/login/login?redirect=${encodeURIComponent('/pages/user/history')}`
                  })
                }
              }
            })
          } else {
            wx.navigateTo({
              url: '/pages/user/history'
            })
          }
          break
          
        case 'favorites':
          // 我的收藏需要登录，登录成功后自动跳转到收藏页面
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '我的收藏功能需要登录后使用，是否前往登录？',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({
                    url: `/pages/login/login?redirect=${encodeURIComponent('/pages/user/favorites')}`
                  })
                }
              }
            })
          } else {
            wx.navigateTo({
              url: '/pages/user/favorites'
            })
          }
          break
          
        case 'more':
          // 更多功能暂不需要登录
          wx.showToast({
            title: '更多功能正在开发中，敬请期待！',
            icon: 'none',
            duration: 2000
          })
          break
          
        default:
          wx.showToast({
            title: '功能开发中',
            icon: 'none'
          })
      }
    },

    // 博物馆卡片点击
    onMuseumTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('博物馆点击:', id)
      wx.navigateTo({
        url: `/pages/museum/detail?id=${id}`
      })
    },

    // 展览卡片点击
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

    // 查看更多热门博物馆
    onViewMoreMuseums() {
      console.log('查看更多热门博物馆')
      wx.navigateTo({
        url: '/pages/hot-museums/index',
        fail: () => {
          wx.showToast({
            title: '页面跳转失败',
            icon: 'error'
          })
        }
      })
    },

    // 查看更多展览
    onViewMoreExhibitions() {
      wx.navigateTo({
        url: '/pages/exhibitions/list'
      })
    },

    // 下拉刷新
    async onPullDownRefresh() {
      console.log('下拉刷新触发')
      this.setData({ refreshing: true })
      
      try {
        await this.loadPageData()
        wx.showToast({
          title: '刷新成功',
          icon: 'success',
          duration: 1000
        })
      } catch (error) {
        console.error('刷新失败:', error)
      } finally {
        wx.stopPullDownRefresh()
      }
    },

    // 页面分享
    onShareAppMessage() {
      return {
        title: '博物馆打卡 - 发现身边的文化宝藏',
        path: '/pages/index/index',
        imageUrl: '/images/bg.png'
      }
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
  }
})