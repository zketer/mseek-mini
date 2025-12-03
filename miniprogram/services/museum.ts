/**
 * 博物馆相关API - 最简洁的实现方式
 * 直接使用axios调用后端接口
 * 
 * @author lynn
 * @since 2024-01-01
 */

import httpClient from '../utils/http'
import { authService } from './auth'

// 类型定义
export interface Banner {
  id: number
  title: string
  imageUrl: string
  linkType?: string
  linkValue?: string
  status: number
}

export interface Announcement {
  id: number
  title: string
  content: string
  type: string
  status: number
}

// 分类信息接口
export interface CategoryInfo {
  id: number
  name: string
  code: string
}

// 标签信息接口
export interface TagInfo {
  id: number
  name: string
  code: string
  color?: string
}

export interface Category {
  id: number
  name: string
  code: string
  description?: string
  sortOrder?: number
  status: number
}

export interface Museum {
  id: number
  name: string
  address: string
  longitude?: number
  latitude?: number
  description?: string
  ticketPrice?: number
  freeAdmission?: number
  status: number
  level?: number
  type?: string
  categories?: CategoryInfo[]
  tags?: TagInfo[]
  // 图片相关字段
  imageUrls?: string[]
  imageFileIds?: number[]
  // 新增字段
  openTime?: string
  collectionCount?: number
  visitorCount?: number
  exhibitions?: number
  educationActivities?: number
  preciousItems?: number
  capacity?: number
  ticketDescription?: string
  phone?: string
  website?: string
  code?: string
  cityName?: string
  provinceName?: string
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
}

export interface LocationInfo {
  latitude: number
  longitude: number
  cityName?: string
  cityCode?: string
  formattedAddress?: string
  province?: string
  district?: string
}

export interface NearbyMuseumsResponse {
  location: LocationInfo
  museums: PageResult<Museum>
}

export interface Exhibition {
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
  status: number
  isPermanent: number
  createAt: string
  // 图片相关字段
  imageUrls?: string[]
  imageFileIds?: number[]
}

// 收藏统计信息
export interface FavoriteStats {
  museumCount: number
  exhibitionCount: number
  totalCount: number
}

// 轮播图相关API
export const bannerService = {
  // 获取活跃的轮播图
  async getActiveBanners(limit: number = 5): Promise<Banner[]> {
    const response = await httpClient.get<ApiResponse<Banner[]>>('/api/v1/museums/miniapp/banners', { limit })
    return response.data.data || []
  },

  // 记录轮播图点击
  async recordClick(id: number): Promise<void> {
    await httpClient.post(`/api/v1/museums/miniapp/banners/${id}/click`)
  }
}

// 公告相关API
export const announcementService = {
  // 获取活跃的公告
  async getActiveAnnouncements(limit: number = 3): Promise<Announcement[]> {
    const response = await httpClient.get<ApiResponse<Announcement[]>>('/api/v1/museums/miniapp/announcements', { limit })
    return response.data.data || []
  }
}

// 博物馆相关API
export const museumService = {
  // 获取博物馆详情
  async getMuseumDetail(id: number): Promise<Museum | null> {
    const response = await httpClient.get<ApiResponse<Museum>>(`/api/v1/museums/miniapp/museums/${id}`)
    return response.data.data || null
  },

  // 分页获取热门博物馆列表
  async getHotMuseums(params: {
    page?: number
    pageSize?: number
    name?: string
  }): Promise<PageResult<Museum>> {
    const response = await httpClient.get<ApiResponse<PageResult<Museum>>>('/api/v1/museums/miniapp/museums/hot', {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      name: params.name
    })
    return response.data.data || { records: [], total: 0, current: 1, size: 10 }
  },

  // 获取博物馆列表（分页）
  async getMuseumPage(params: {
    page?: number
    pageSize?: number
    keyword?: string
    categoryId?: number | null
    cityCode?: string
    sortBy?: string
  }): Promise<PageResult<Museum>> {
    const requestParams: any = {
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      sortBy: params.sortBy || 'default'
    }
    
    // 只有非空值才添加到请求参数中
    if (params.keyword) {
      requestParams.keyword = params.keyword
    }
    if (params.categoryId !== null && params.categoryId !== undefined) {
      requestParams.categoryId = params.categoryId
    }
    if (params.cityCode) {
      requestParams.cityCode = params.cityCode
    }

    const response = await httpClient.get<ApiResponse<PageResult<Museum>>>('/api/v1/museums/miniapp/museums', requestParams)
    return response.data.data || { records: [], total: 0, current: 1, size: 10 }
  },

  // 获取分类列表
  async getCategories(): Promise<Category[]> {
    const response = await httpClient.get<ApiResponse<Category[]>>('/api/v1/museums/miniapp/museums/categories')
    return response.data.data || []
  },

  // 获取附近博物馆
  async getNearbyMuseums(params: {
    latitude: number
    longitude: number
    radius?: number
    page?: number
    pageSize?: number
    name?: string
    cityCode?: string
    cityName?: string
  }): Promise<NearbyMuseumsResponse> {
    const requestParams: any = {
      latitude: params.latitude,
      longitude: params.longitude,
      page: params.page || 1,
      pageSize: params.pageSize || 10
    }
    
    if (params.radius) {
      requestParams.radius = params.radius
    }
    
    if (params.name) {
      requestParams.name = params.name
    }
    
    if (params.cityCode) {
      requestParams.cityCode = params.cityCode
    }
    
    if (params.cityName) {
      requestParams.cityName = params.cityName
    }

    const response = await httpClient.get<ApiResponse<NearbyMuseumsResponse>>('/api/v1/museums/miniapp/museums/nearby', requestParams)
    return response.data.data || { 
      location: { latitude: params.latitude, longitude: params.longitude, cityName: '未知城市' },
      museums: { records: [], total: 0, current: 1, size: 10 }
    }
  },

  // 根据经纬度获取城市信息
  async getCityByLocation(latitude: number, longitude: number): Promise<string> {
    const response = await httpClient.get<ApiResponse<string>>('/api/v1/museums/miniapp/museums/location/city', {
      latitude,
      longitude
    })
    return response.data.data || '未知城市'
  }
}

// 展览相关API
export const exhibitionService = {
  // 分页查询展览列表
  async getExhibitionPage(params: {
    page?: number
    pageSize?: number
    museumId?: number
    title?: string
    status?: number
    isPermanent?: number
  }): Promise<PageResult<Exhibition>> {
    const requestParams: any = {
      page: params.page || 1,
      pageSize: params.pageSize || 10
    }
    
    if (params.museumId) {
      requestParams.museumId = params.museumId
    }
    
    if (params.title) {
      requestParams.title = params.title
    }
    
    if (params.status !== undefined) {
      requestParams.status = params.status
    }
    
    if (params.isPermanent !== undefined) {
      requestParams.isPermanent = params.isPermanent
    }

    const response = await httpClient.get<ApiResponse<PageResult<Exhibition>>>('/api/v1/museums/miniapp/exhibitions/latest', requestParams)
    return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
  },

  // 分页获取最新展览列表
  async getLatestExhibitions(params: {
    page?: number
    pageSize?: number
    museumId?: number
    title?: string
    status?: number
    isPermanent?: number
  }): Promise<PageResult<Exhibition>> {
    const requestParams: any = {
      page: params.page || 1,
      pageSize: params.pageSize || 10
    }
    
    // 添加过滤参数
    if (params.museumId !== undefined) {
      requestParams.museumId = params.museumId
    }
    
    if (params.title !== undefined && params.title !== '') {
      requestParams.title = params.title
    }
    
    if (params.status !== undefined) {
      requestParams.status = params.status
    }
    
    if (params.isPermanent !== undefined) {
      requestParams.isPermanent = params.isPermanent
    }

    const response = await httpClient.get<ApiResponse<PageResult<Exhibition>>>('/api/v1/museums/miniapp/exhibitions/latest', requestParams)
    return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
  },

  // 分页获取所有展览列表（支持过滤）
  async getAllExhibitions(params: {
    page?: number
    pageSize?: number
    museumId?: number
    title?: string
    status?: number
    isPermanent?: number
  }): Promise<PageResult<Exhibition>> {
    const requestParams: any = {
      page: params.page || 1,
      pageSize: params.pageSize || 10
    }
    
    // 添加过滤参数
    if (params.museumId !== undefined) {
      requestParams.museumId = params.museumId
    }
    
    if (params.title !== undefined && params.title !== '') {
      requestParams.title = params.title
    }
    
    if (params.status !== undefined) {
      requestParams.status = params.status
    }
    
    if (params.isPermanent !== undefined) {
      requestParams.isPermanent = params.isPermanent
    }

    const response = await httpClient.get<ApiResponse<PageResult<Exhibition>>>('/api/v1/museums/miniapp/exhibitions/all', requestParams)
    return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
  },

  // 获取展览详情
  async getExhibitionDetail(id: number): Promise<Exhibition | null> {
    const response = await httpClient.get<ApiResponse<Exhibition>>(`/api/v1/museums/miniapp/exhibitions/${id}`)
    return response.data.data || null
  }
}

// 反馈建议相关API
export const feedbackService = {
  // 提交反馈建议
  async submitFeedback(feedbackData: {
    to: string
    subject: string
    type: string
    typeName: string
    content: string
    contact?: string
    timestamp: string
    userAgent: string
  }): Promise<string> {
    const response = await httpClient.post<ApiResponse<string>>('/api/v1/museums/feedback/submit', feedbackData)
    return response.data.data || '提交成功'
  }
}

// 收藏相关API
export const favoriteService = {
  /**
   * 收藏博物馆
   */
  async favoriteMuseum(museumId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.post<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/museum/${museumId}`, {}, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 取消收藏博物馆
   */
  async unfavoriteMuseum(museumId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.delete<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/museum/${museumId}`, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 收藏展览
   */
  async favoriteExhibition(exhibitionId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.post<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/exhibition/${exhibitionId}`, {}, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 取消收藏展览
   */
  async unfavoriteExhibition(exhibitionId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.delete<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/exhibition/${exhibitionId}`, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 获取用户收藏的博物馆列表
   */
  async getUserFavoriteMuseums(params: {
    page?: number
    pageSize?: number
    keyword?: string
    visitStatus?: boolean | null
    sortBy?: string
  }): Promise<PageResult<Museum>> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const requestParams: any = {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        sortBy: params.sortBy || 'time'
      }
      
      if (params.keyword) {
        requestParams.keyword = params.keyword
      }
      
      if (params.visitStatus !== null && params.visitStatus !== undefined) {
        requestParams.visitStatus = params.visitStatus
      }

      const response = await httpClient.get<ApiResponse<PageResult<Museum>>>('/api/v1/museums/miniapp/favorites/museums', requestParams, { userId: userId.toString() })
      return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
    })
  },

  /**
   * 获取用户收藏的展览列表
   */
  async getUserFavoriteExhibitions(params: {
    page?: number
    pageSize?: number
    keyword?: string
    status?: number | null
    sortBy?: string
  }): Promise<PageResult<Exhibition>> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const requestParams: any = {
        page: params.page || 1,
        pageSize: params.pageSize || 10,
        sortBy: params.sortBy || 'time'
      }
      
      if (params.keyword) {
        requestParams.keyword = params.keyword
      }
      
      if (params.status !== null && params.status !== undefined) {
        requestParams.status = params.status
      }

      const response = await httpClient.get<ApiResponse<PageResult<Exhibition>>>('/api/v1/museums/miniapp/favorites/exhibitions', requestParams, { userId: userId.toString() })
      return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
    })
  },

  /**
   * 检查是否收藏博物馆
   */
  async checkMuseumFavorite(museumId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/check/museum/${museumId}`, {}, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 检查是否收藏展览
   */
  async checkExhibitionFavorite(exhibitionId: number): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<boolean>>(`/api/v1/museums/miniapp/favorites/check/exhibition/${exhibitionId}`, {}, { userId: userId.toString() })
      return response.data.data || false
    })
  },

  /**
   * 获取用户收藏统计
   */
  async getUserFavoriteStats(): Promise<FavoriteStats> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<FavoriteStats>>('/api/v1/museums/miniapp/favorites/stats', {}, { userId: userId.toString() })
      return response.data.data || { museumCount: 0, exhibitionCount: 0, totalCount: 0 }
    })
  }
}

// 打卡相关接口
export interface CheckinRecord {
  id?: number
  museumId: number
  museumName: string
  userId?: number
  photos: string[]
  feeling?: string
  rating?: number
  mood?: string
  weather?: string
  companions?: string[]
  tags?: string[]
  location?: {
    longitude: number
    latitude: number
    address?: string
  }
  checkinTime?: string
  isDraft: boolean  // 新增字段：标识是立即打卡还是暂存
  draftId?: string  // 暂存ID（用于更新暂存记录）
}

export interface CheckinResponse {
  id: number
  checkinTime: string
  success: boolean
  message?: string
}

export interface CheckinStats {
  totalCheckins: number
  thisMonthCheckins: number
  visitedMuseums: number
  totalPhotos: number
}

// 成就相关接口
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  requirement: string
  progress: number
  target: number
  unlocked: boolean
  unlockedDate?: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface AchievementStats {
  totalAchievements: number
  unlockedAchievements: number
  completionRate: number
  categories: {
    id: string
    name: string
    count: number
    unlockedCount: number
  }[]
}

// 打卡相关API
export const checkinService = {
  /**
   * 提交打卡（包括立即打卡和暂存）
   */
  async submitCheckin(checkinData: CheckinRecord): Promise<CheckinResponse> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const requestData = {
        ...checkinData,
        userId
      }
      
      const response = await httpClient.post<ApiResponse<CheckinResponse>>(
        '/api/v1/museums/miniapp/checkin/submit', 
        requestData, 
        { userId: userId.toString() }
      )
      return response.data.data || { id: 0, checkinTime: '', success: false }
    })
  },

  /**
   * 获取用户打卡记录列表
   */
  async getUserCheckinRecords(params: {
    page?: number
    pageSize?: number
    museumId?: number
    startDate?: string
    endDate?: string
    isDraft?: boolean
    keyword?: string  // 搜索关键词（博物馆名称、省市）
    filterType?: string  // 筛选类型：all | thisMonth | thisYear
  }): Promise<PageResult<CheckinRecord>> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const requestParams: any = {
        page: params.page || 1,
        pageSize: params.pageSize || 10
      }
      
      if (params.museumId) {
        requestParams.museumId = params.museumId
      }
      
      if (params.startDate) {
        requestParams.startDate = params.startDate
      }
      
      if (params.endDate) {
        requestParams.endDate = params.endDate
      }
      
      if (params.isDraft !== undefined) {
        requestParams.isDraft = params.isDraft
      }

      // 添加搜索关键词
      if (params.keyword && params.keyword.trim()) {
        requestParams.keyword = params.keyword.trim()
      }

      // 添加筛选类型
      if (params.filterType && params.filterType !== 'all') {
        requestParams.filterType = params.filterType
      }

      console.log('打卡记录查询参数:', requestParams)

      const response = await httpClient.get<ApiResponse<PageResult<CheckinRecord>>>(
        '/api/v1/museums/miniapp/checkin/records', 
        requestParams, 
        { userId: userId.toString() }
      )
      return response.data.data || { records: [], total: 0, current: 1, size: requestParams.pageSize }
    })
  },

  /**
   * 获取打卡详情
   */
  async getCheckinDetail(checkinId: number): Promise<CheckinRecord | null> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<CheckinRecord>>(
        `/api/v1/museums/miniapp/checkin/${checkinId}`, 
        {}, 
        { userId: userId.toString() }
      )
      return response.data.data || null
    })
  },

  /**
   * 删除暂存记录
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.delete<ApiResponse<boolean>>(
        `/api/v1/museums/miniapp/checkin/draft/${draftId}`, 
        { userId: userId.toString() }
      )
      return response.data.data || false
    })
  },

  /**
   * 获取用户打卡统计
   */
  async getCheckinStats(): Promise<CheckinStats> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<CheckinStats>>(
        '/api/v1/museums/miniapp/checkin/stats', 
        {}, 
        { userId: userId.toString() }
      )
      return response.data.data || {
        totalCheckins: 0,
        thisMonthCheckins: 0,
        visitedMuseums: 0,
        totalPhotos: 0
      }
    })
  },

  /**
   * 将暂存转为正式打卡
   */
  async convertDraftToCheckin(draftId: string): Promise<CheckinResponse> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.post<ApiResponse<CheckinResponse>>(
        `/api/v1/museums/miniapp/checkin/draft/${draftId}/convert`, 
        {}, 
        { userId: userId.toString() }
      )
      return response.data.data || { id: 0, checkinTime: '', success: false }
    })
  },

  /**
   * 删除打卡记录（非暂存）
   */
  async deleteCheckinRecord(checkinId: string): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.delete<ApiResponse<boolean>>(
        `/api/v1/museums/miniapp/checkin/${checkinId}`, 
        { userId: userId.toString() }
      )
      return response.data.data || false
    })
  },

  /**
   * 获取省份打卡统计（足迹地图）
   */
  async getProvinceStats(): Promise<any> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<any>>(
        '/api/v1/museums/miniapp/checkin/stats/provinces',
        {},
        { userId: userId.toString() }
      )
      return response.data.data || { provinces: [], overall: {} }
    })
  },

  /**
   * 获取省份博物馆详情
   */
  async getProvinceMuseumDetail(provinceCode: string): Promise<any> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<any>>(
        `/api/v1/museums/miniapp/checkin/provinces/${provinceCode}/museums`,
        {},
        { userId: userId.toString() }
      )
      return response.data.data || { provinceCode, provinceName: '未知省份', totalMuseums: 0, visitedMuseums: 0, museums: [] }
    })
  }
}

// 成就相关API
export const achievementService = {
  // 获取用户成就列表
  async getUserAchievements(): Promise<Achievement[]> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<Achievement[]>>('/api/v1/museums/miniapp/achievements', {}, { userId: userId.toString() })
      return response.data.data || []
    })
  },

  // 获取成就统计信息
  async getAchievementStats(): Promise<AchievementStats> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.get<ApiResponse<AchievementStats>>('/api/v1/museums/miniapp/achievements/stats', {}, { userId: userId.toString() })
      return response.data.data || {
        totalAchievements: 0,
        unlockedAchievements: 0,
        completionRate: 0,
        categories: []
      }
    })
  },

  // 检查并解锁成就
  async checkAndUnlockAchievements(): Promise<Achievement[]> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.post<ApiResponse<Achievement[]>>('/api/v1/museums/miniapp/achievements/check', {}, { userId: userId.toString() })
      return response.data.data || []
    })
  },

  // 分享成就
  async shareAchievement(achievementId: string): Promise<boolean> {
    return authService.withAuth(async () => {
      const userId = authService.getCurrentUserId()
      if (!userId) throw new Error('用户未登录')
      
      const response = await httpClient.post<ApiResponse<boolean>>('/api/v1/museums/miniapp/achievements/share', {
        achievementId
      }, { userId: userId.toString() })
      return response.data.data || false
    })
  }
}
