import httpClient from '../utils/http'

// 通用API响应格式
interface ApiResponse<T = any> {
  data: T
  message: string
  code: number
  success: boolean
}

// 用户信息接口
export interface UserInfo {
  userId: number
  username: string
  nickname: string
  email?: string
  phone?: string
  avatar?: string
  gender?: number // 0-未知，1-男，2-女
  status: number  // 0-禁用，1-启用
  lastLoginTime?: string
  roles?: string[]
  permissions?: string[]
}

// 登录响应接口
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  userInfo: UserInfo
}

// 微信登录用户信息
export interface WechatUserInfo {
  nickName: string
  avatarUrl: string
  gender: number // 0-未知，1-男性，2-女性
  country?: string // 国家
  province?: string // 省份
  city?: string // 城市
  language?: string // 语言
}

// 认证存储键名
const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  TOKEN_EXPIRES_AT: 'token_expires_at'
}

// 认证服务
export const authService = {
  /**
   * 账号密码登录
   */
  async accountLogin(username: string, password: string): Promise<LoginResponse> {
    try {
      const response = await httpClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', {
        username,
        password
      })
      
      // 保存登录信息到本地存储
      if (response.data.data) {
        this.saveAuthInfo(response.data.data)
        return response.data.data
      }
      
      throw new Error('登录响应数据异常')
    } catch (error) {
      console.error('账号密码登录失败:', error)
      throw error
    }
  },

  /**
   * 微信小程序登录
   */
  async wechatMiniProgramLogin(code: string, userInfo?: WechatUserInfo): Promise<LoginResponse> {
    try {
      const requestData: any = { code }
      
      // 只有在有用户信息时才传递（兼容旧版本）
      if (userInfo) {
        requestData.userInfo = JSON.stringify(userInfo)
      }
      
      const response = await httpClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/oauth2/wechat/miniprogram', requestData)
      
      // 保存登录信息到本地存储
      if (response.data.data) {
        this.saveAuthInfo(response.data.data)
        return response.data.data
      }
      
      throw new Error('登录响应数据异常')
    } catch (error) {
      console.error('微信小程序登录失败:', error)
      throw error
    }
  },

  /**
   * 刷新访问令牌
   */
  async refreshToken(): Promise<LoginResponse> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('没有刷新令牌')
    }

    try {
      // 使用query parameter而不是JSON body
      const response = await httpClient.post<ApiResponse<LoginResponse>>(
        `/api/v1/auth/refresh?refreshToken=${encodeURIComponent(refreshToken)}`, 
        {}
      )
      
      if (response.data.data) {
        this.saveAuthInfo(response.data.data)
        return response.data.data
      }
      
      throw new Error('刷新令牌响应数据异常')
    } catch (error) {
      console.error('刷新令牌失败:', error)
      // 刷新失败，清除本地认证信息
      this.clearAuthInfo()
      throw error
    }
  },

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      const accessToken = this.getAccessToken()
      if (accessToken) {
        console.log('开始退出登录，token:', accessToken.substring(0, 20) + '...')
        await httpClient.post('/api/v1/auth/logout', {})
        console.log('退出登录API调用成功')
      } else {
        console.log('没有访问令牌，直接清除本地数据')
      }
    } catch (error) {
      console.error('登出请求失败:', error)
      // 检查错误类型，如果是方法不支持的错误，可能是微信开发工具的问题
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message || ''
        if (errorMessage.includes('GET') && errorMessage.includes('不支持')) {
          console.warn('检测到GET请求错误，可能是微信开发工具的调试问题，忽略此错误')
        }
      }
      // 即使API调用失败，也继续清除本地数据
    } finally {
      // 无论请求是否成功，都清除本地认证信息
      this.clearAuthInfo()
    }
  },

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    const accessToken = this.getAccessToken()
    const expiresAt = this.getTokenExpiresAt()
    
    if (!accessToken || !expiresAt) {
      return false
    }
    
    // 检查令牌是否过期（提前5分钟）
    const now = Date.now()
    const expireTime = parseInt(expiresAt)
    return now < (expireTime - 5 * 60 * 1000)
  },

  /**
   * 获取当前用户信息
   */
  getCurrentUser(): UserInfo | null {
    try {
      const userInfoStr = wx.getStorageSync(AUTH_STORAGE_KEYS.USER_INFO)
      return userInfoStr ? JSON.parse(userInfoStr) : null
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  },

  /**
   * 获取当前用户ID
   */
  getCurrentUserId(): number | null {
    const userInfo = this.getCurrentUser()
    return userInfo?.userId || null
  },

  /**
   * 获取访问令牌
   */
  getAccessToken(): string | null {
    try {
      return wx.getStorageSync(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || null
    } catch (error) {
      console.error('获取访问令牌失败:', error)
      return null
    }
  },

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    try {
      return wx.getStorageSync(AUTH_STORAGE_KEYS.REFRESH_TOKEN) || null
    } catch (error) {
      console.error('获取刷新令牌失败:', error)
      return null
    }
  },

  /**
   * 获取令牌过期时间
   */
  getTokenExpiresAt(): string | null {
    try {
      return wx.getStorageSync(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT) || null
    } catch (error) {
      console.error('获取令牌过期时间失败:', error)
      return null
    }
  },

  /**
   * 保存认证信息
   */
  saveAuthInfo(loginResponse: LoginResponse): void {
    try {
      wx.setStorageSync(AUTH_STORAGE_KEYS.ACCESS_TOKEN, loginResponse.accessToken)
      wx.setStorageSync(AUTH_STORAGE_KEYS.REFRESH_TOKEN, loginResponse.refreshToken)
      wx.setStorageSync(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(loginResponse.userInfo))
      
      // 计算过期时间戳
      const expiresAt = Date.now() + (loginResponse.expiresIn * 1000)
      wx.setStorageSync(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt.toString())
      
      console.log('认证信息保存成功')
    } catch (error) {
      console.error('保存认证信息失败:', error)
      throw error
    }
  },

  /**
   * 清除认证信息
   */
  clearAuthInfo(): void {
    try {
      wx.removeStorageSync(AUTH_STORAGE_KEYS.ACCESS_TOKEN)
      wx.removeStorageSync(AUTH_STORAGE_KEYS.REFRESH_TOKEN)
      wx.removeStorageSync(AUTH_STORAGE_KEYS.USER_INFO)
      wx.removeStorageSync(AUTH_STORAGE_KEYS.TOKEN_EXPIRES_AT)
      console.log('认证信息清除成功')
    } catch (error) {
      console.error('清除认证信息失败:', error)
    }
  },

  /**
   * 检查并自动刷新令牌
   */
  async ensureValidToken(): Promise<boolean> {
    if (this.isLoggedIn()) {
      return true
    }

    // 尝试刷新令牌
    try {
      await this.refreshToken()
      return true
    } catch (error) {
      console.error('自动刷新令牌失败:', error)
      return false
    }
  },

  /**
   * 需要登录的API调用包装器
   */
  async withAuth<T>(apiCall: () => Promise<T>): Promise<T> {
    // 确保有效令牌
    const hasValidToken = await this.ensureValidToken()
    if (!hasValidToken) {
      throw new Error('用户未登录或令牌已过期')
    }

    try {
      return await apiCall()
    } catch (error: any) {
      // 如果返回401，说明令牌无效，尝试刷新
      if (error.statusCode === 401 || (error.data && error.data.code === 401)) {
        try {
          await this.refreshToken()
          return await apiCall()
        } catch (refreshError) {
          console.error('令牌刷新失败，需要重新登录:', refreshError)
          this.clearAuthInfo()
          throw new Error('登录已过期，请重新登录')
        }
      }
      throw error
    }
  }
}
