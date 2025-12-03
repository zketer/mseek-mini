/**
 * 微信小程序网络请求工具
 * 使用原生 wx.request API
 * 
 * @author lynn
 * @since 2024-01-01
 */

import { ENV_CONFIG } from '../config/env'

// 请求配置接口
interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  params?: any
  headers?: Record<string, string>
}

// 响应接口
interface ApiResponse<T = any> {
  data: T
  statusCode: number
  header: Record<string, string>
}

// 创建请求实例
class HttpClient {
  private baseURL: string
  private timeout: number

  constructor() {
    this.baseURL = ENV_CONFIG.apiBaseUrl
    this.timeout = ENV_CONFIG.timeout
  }

  // 将参数转换为查询字符串
  private buildQueryString(params: Record<string, any>): string {
    if (!params) return ''
    const query = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&')
    return query ? `?${query}` : ''
  }

  // 获取访问令牌
  private getAccessToken(): string | null {
    try {
      return wx.getStorageSync('access_token') || null
    } catch (error) {
      return null
    }
  }

  // 通用请求方法
  private async request<T>(config: RequestConfig): Promise<ApiResponse<T>> {
    const queryString = config.method === 'GET' ? this.buildQueryString(config.params) : ''
    const fullUrl = config.url.startsWith('http') 
      ? `${config.url}${queryString}` 
      : `${this.baseURL}${config.url}${queryString}`
    
    // 自动添加认证token
    const accessToken = this.getAccessToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers
    }
    
    // 如果有token且不是登录相关接口，自动添加Authorization header
    // 注意：logout接口虽然包含'login'但需要token认证，所以特殊处理
    if (accessToken && !config.url.includes('/oauth2/') && 
        (!config.url.includes('/login') || config.url.includes('/logout'))) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    
    console.log(`[Request] ${config.method || 'GET'} ${fullUrl}`, config.data || config.params)
    console.log(`[Request Config]`, {
      originalUrl: config.url,
      method: config.method,
      baseURL: this.baseURL,
      queryString,
      fullUrl
    })

    return new Promise((resolve, reject) => {
      wx.request({
        url: fullUrl,
        method: (config.method || 'GET') as any,
        data: config.data,
        header: headers,
        timeout: this.timeout,
        success: (res) => {
          console.log(`[Response] ${config.method || 'GET'} ${fullUrl}`, {
            statusCode: res.statusCode,
            data: res.data
          })

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({
              data: res.data as T,
              statusCode: res.statusCode,
              header: res.header
            })
          } else {
            const errorMsg = (res.data && (res.data as any).message) || `HTTP ${res.statusCode} 错误`
            console.error('[Request Error]', errorMsg)
            reject({
              message: errorMsg,
              statusCode: res.statusCode,
              data: res.data
            })
          }
        },
        fail: (err) => {
          console.error('[Request Fail]', err)
          reject(new Error(err.errMsg || '网络请求失败'))
        }
      })
    })
  }

  // GET 请求
  async get<T>(url: string, params?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'GET', params, headers })
  }

  // POST 请求
  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', data, headers })
  }

  // POST 请求（使用查询参数）
  async postWithParams<T>(url: string, params?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'POST', params, headers })
  }

  // PUT 请求
  async put<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'PUT', data, headers })
  }

  // DELETE 请求
  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>({ url, method: 'DELETE', headers })
  }
}

// 导出实例
export default new HttpClient()
