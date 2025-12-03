// discovery.ts
// 发现页面 - 全国博物馆列表

import { museumService, ApiMuseum, CategoryInfo, TagInfo, Category } from '../../services/museum'

interface Museum extends ApiMuseum {
  tags: TagInfo[]
  distance?: string
}

Component({
  data: {
    // 搜索和筛选
    searchKeyword: '',
    activeCategory: 0, // 当前选中的分类ID，0表示全部
    sortBy: 'hot', // 排序方式: hot, rating, distance
    sortText: '人气最高',

    // 分类列表
    categories: [] as Category[],

    // 分页数据
    museums: [] as Museum[],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true,

    // 搜索防抖定时器
    searchTimer: null as any,

    // 筛选弹窗相关
    showFilterModal: false,
    filterCategory: 0,
    filterSort: 'hot'
  },

  lifetimes: {
    attached() {
      this.loadCategories()
      this.loadMuseumList(true)
    }
  },

  methods: {
    // 加载分类列表
    async loadCategories(): Promise<void> {
      try {
        console.log('开始加载分类列表...')
        const categories = await museumService.getCategories()
        console.log('分类列表加载完成:', categories)
        this.setData({ categories })
        console.log('页面数据已更新，当前分类数量:', categories.length)
      } catch (error) {
        console.error('分类列表加载失败:', error)
        wx.showToast({
          title: '分类加载失败',
          icon: 'error'
        })
      }
    },

    // 加载博物馆列表
    async loadMuseumList(reset: boolean = false): Promise<void> {
      if (this.data.loading) return

      this.setData({ loading: true })

      try {
        const currentPage = reset ? 1 : this.data.page
        const categoryId = this.data.activeCategory === 0 ? null : this.data.activeCategory
        const response = await museumService.getMuseumPage({
          page: currentPage,
          pageSize: this.data.pageSize,
          keyword: this.data.searchKeyword || undefined,
          categoryId: categoryId,
          sortBy: this.data.sortBy
        })

        // 生成显示标签
        const museums = response.records.map(museum => ({
          ...museum,
          tags: this.generateDisplayTags(museum)
        }))

        this.setData({
          museums: reset ? museums : [...this.data.museums, ...museums],
          total: response.total,
          page: currentPage + 1,
          hasMore: museums.length === this.data.pageSize,
          loading: false
        })

        console.log('博物馆列表加载完成:', {
          total: response.total,
          current: museums.length,
          hasMore: museums.length === this.data.pageSize
        })

      } catch (error) {
        console.error('博物馆列表加载失败:', error)
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
        'ART': '#fef1f0',           // 艺术类 - 红色
        'NATURE': '#f6ffed',        // 自然类 - 绿色
      }
      return colorMap[categoryCode] || '#fafafa'
    },

    // 搜索输入
    onSearchInput(e: WechatMiniprogram.Input) {
      const keyword = e.detail.value.trim()
      this.setData({ searchKeyword: keyword })

      // 防抖搜索
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer)
      }

      this.data.searchTimer = setTimeout(() => {
        this.loadMuseumList(true)
      }, 500)
    },

    // 搜索确认
    onSearchConfirm() {
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer)
      }
      this.loadMuseumList(true)
    },

    // 分类点击
    onCategoryTap(e: WechatMiniprogram.BaseEvent) {
      const categoryId = parseInt(e.currentTarget.dataset.category) || 0
      this.setData({ activeCategory: categoryId })
      this.loadMuseumList(true)
    },

    // 筛选按钮点击
    onFilterTap() {
      this.setData({
        showFilterModal: true,
        filterCategory: this.data.activeCategory,
        filterSort: this.data.sortBy
      })
    },

    // 筛选弹窗关闭
    onFilterModalClose() {
      this.setData({ showFilterModal: false })
    },

    // 阻止筛选内容区域点击冒泡
    onFilterContentTap() {
      // 阻止冒泡，避免点击内容区域关闭弹窗
    },

    // 筛选分类点击
    onFilterCategoryTap(e: WechatMiniprogram.BaseEvent) {
      const categoryId = parseInt(e.currentTarget.dataset.category) || 0
      this.setData({ filterCategory: categoryId })
    },

    // 筛选排序点击
    onFilterSortTap(e: WechatMiniprogram.BaseEvent) {
      const sortBy = e.currentTarget.dataset.sort
      this.setData({ 
        filterSort: sortBy
      })
    },

    // 筛选重置
    onFilterReset() {
      this.setData({
        filterCategory: 0,
        filterSort: 'hot'
      })
    },

    // 筛选确定
    onFilterConfirm() {
      const sortTextMap: Record<string, string> = {
        'hot': '人气最高',
        'collection': '藏品最多'
      }
      
      this.setData({
        activeCategory: this.data.filterCategory,
        sortBy: this.data.filterSort,
        sortText: sortTextMap[this.data.filterSort] || '人气最高',
        showFilterModal: false
      })
      
      this.loadMuseumList(true)
    },

    // 博物馆点击
    onMuseumTap(e: WechatMiniprogram.BaseEvent) {
      const id = e.currentTarget.dataset.id
      console.log('博物馆点击:', id)
      
      wx.navigateTo({
        url: `/pages/museum/detail?id=${id}`
      })
    },

    // 触底加载更多
    onReachBottom() {
      if (this.data.hasMore && !this.data.loading) {
        this.loadMuseumList(false)
      }
    },

    // 刷新
    onRefresh() {
      this.setData({
        page: 1,
        hasMore: true,
        museums: []
      })
      this.loadMuseumList(true)
    },

    // 下拉刷新
    onPullDownRefresh() {
      this.onRefresh()
      setTimeout(() => {
        wx.stopPullDownRefresh()
      }, 1000)
    },

    // 页面分享
    onShareAppMessage() {
      return {
        title: '发现精彩博物馆',
        path: '/pages/discovery/discovery',
        imageUrl: '/images/bg.png'
      }
    }
  }
})
