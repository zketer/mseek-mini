// exhibitions/list.ts

interface Exhibition {
  id: number;
  title: string;
  museumId: number;
  museumName: string;
  image?: string;
  startTime: string;
  endTime: string;
  status: number; // 0-已结束，1-进行中，2-未开始
  statusText: string;
  isPermanent: number; // 0-临时展览，1-常设展览
  price: number;
  description?: string;
}

interface ApiExhibition extends Exhibition {
  // 后端可能返回的额外字段
  startDate?: string
  endDate?: string
  coverImage?: string
}

Page({
  data: {
    // 展览列表
    exhibitions: [] as Exhibition[],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,
    
    // 搜索和筛选
    searchKeyword: '',
    activeStatus: null as number | null, // null-全部, 0-已结束, 1-进行中, 2-未开始
  },

  onLoad() {
    console.log('展览列表页面加载')
    this.loadExhibitionList(true)
  },

  onPullDownRefresh() {
    console.log('下拉刷新')
    this.loadExhibitionList(true)
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    console.log('上拉加载更多')
    if (!this.data.loading && this.data.hasMore) {
      this.loadExhibitionList(false)
    }
  },

  // 加载展览列表
  async loadExhibitionList(reset: boolean = false) {
    if (this.data.loading) return
    
    this.setData({ loading: true })

    try {
      const currentPage = reset ? 1 : this.data.page
      
      // 构建请求参数
      const requestParams: any = {
        page: currentPage,
        pageSize: this.data.pageSize
      }

      // 添加搜索关键词
      if (this.data.searchKeyword) {
        requestParams.title = this.data.searchKeyword
      }

      // 添加状态筛选
      if (this.data.activeStatus !== null) {
        requestParams.status = this.data.activeStatus
      }

      console.log('请求参数:', requestParams)

      // 调用接口
      const { exhibitionService } = require('../../services/museum')
      const response = await exhibitionService.getAllExhibitions(requestParams)

      // 处理展览数据
      const newExhibitions = response.records.map((item: ApiExhibition) => ({
        ...item,
        statusText: this.getStatusText(item.status),
        startTime: this.formatDate(item.startDate || item.startTime),
        endTime: this.formatDate(item.endDate || item.endTime),
        image: item.coverImage || item.image
      }))

      // 更新数据
      if (reset) {
        this.setData({
          exhibitions: newExhibitions,
          total: response.total,
          page: 1,
          hasMore: newExhibitions.length < response.total,
          loading: false
        })
      } else {
        this.setData({
          exhibitions: [...this.data.exhibitions, ...newExhibitions],
          page: currentPage + 1,
          hasMore: this.data.exhibitions.length + newExhibitions.length < response.total,
          loading: false
        })
      }

      console.log('展览列表加载完成:', {
        总数: response.total,
        当前页: currentPage,
        本次加载: newExhibitions.length,
        累计加载: this.data.exhibitions.length
      })

    } catch (error) {
      console.error('展览列表加载失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  // 获取状态文本
  getStatusText(status: number): string {
    switch (status) {
      case 0: return '已结束'
      case 1: return '进行中'  
      case 2: return '即将开始'
      default: return '未知'
    }
  },

  // 格式化日期
  formatDate(dateStr: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 搜索输入
  onSearchInput(e: WechatMiniprogram.Input) {
    const value = e.detail.value
    this.setData({ searchKeyword: value })
  },

  // 搜索确认
  onSearchConfirm() {
    console.log('搜索确认:', this.data.searchKeyword)
    this.loadExhibitionList(true)
  },

  // 清除搜索
  onSearchClear() {
    this.setData({ searchKeyword: '' })
    this.loadExhibitionList(true)
  },

  // 状态筛选
  onStatusTap(e: WechatMiniprogram.BaseEvent) {
    const status = e.currentTarget.dataset.status
    const activeStatus = status === '' ? null : parseInt(status)
    
    console.log('状态筛选:', activeStatus)
    this.setData({ activeStatus })
    this.loadExhibitionList(true)
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

})
