/**
 * 登录验证守卫工具
 * 统一处理登录验证、跳转和返回逻辑
 * 
 * @author lynn
 * @since 2024-01-01
 */

import { authService } from '../services/auth'

// 登录守卫选项
interface AuthGuardOptions {
  // 提示标题
  title?: string
  // 提示内容
  content?: string
  // 确认按钮文字
  confirmText?: string
  // 是否显示取消按钮
  showCancel?: boolean
  // 取消回调
  onCancel?: () => void
  // 是否静默检查（不显示弹窗，直接跳转）
  silent?: boolean
  // 登录成功后要跳转的目标页面路径
  targetPath?: string
  // 登录成功后的回调函数（用于执行操作而不是跳转页面）
  onSuccess?: () => void
  // 操作类型：'navigate' | 'action'
  type?: 'navigate' | 'action'
}

// 默认配置
const DEFAULT_OPTIONS: AuthGuardOptions = {
  title: '提示',
  content: '请先登录后再使用此功能',
  confirmText: '去登录',
  showCancel: true,
  silent: false
}

/**
 * 登录验证守卫
 * @param options 配置选项
 * @returns Promise<boolean> 是否已登录
 */
export const requireAuth = async (options: AuthGuardOptions = {}): Promise<boolean> => {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // 检查登录状态
  if (authService.isLoggedIn()) {
    // 如果已登录且有目标路径，直接跳转
    if (config.targetPath) {
      console.log('用户已登录，直接跳转到:', config.targetPath)
      wx.navigateTo({
        url: config.targetPath,
        fail: (error) => {
          console.error('跳转失败:', error)
          wx.showToast({
            title: '页面跳转失败',
            icon: 'error'
          })
        }
      })
    }
    return true
  }

  // 统一处理目标路径
  let redirectPath = config.targetPath
  
  if (!redirectPath && config.type !== 'action') {
    // 如果没有指定目标路径且不是操作类型，则使用当前页面路径
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1]
      const route = currentPage.route
      const options = currentPage.options
      
      // 构建完整的页面路径
      redirectPath = `/${route}`
      if (options && Object.keys(options).length > 0) {
        const queryString = Object.keys(options)
          .map(key => `${key}=${options[key]}`)
          .join('&')
        redirectPath += `?${queryString}`
      }
    }
  }

  // 构建登录页面URL（包含redirect参数）
  let loginUrl = '/pages/login/login'
  if (redirectPath && config.type !== 'action') {
    loginUrl += `?redirect=${encodeURIComponent(redirectPath)}`
    console.log('构建登录URL:', loginUrl)
  }

  // 静默模式直接跳转
  if (config.silent) {
    wx.navigateTo({
      url: loginUrl,
      fail: (error) => {
        console.error('跳转登录页面失败:', error)
      }
    })
    return false
  }

  // 显示登录提示弹窗
  return new Promise((resolve) => {
    wx.showModal({
      title: config.title!,
      content: config.content!,
      showCancel: config.showCancel!,
      confirmText: config.confirmText!,
      success: (res) => {
        if (res.confirm) {
          // 用户确认，跳转到登录页
          wx.navigateTo({
            url: loginUrl,
            fail: (error) => {
              console.error('跳转登录页面失败:', error)
              wx.showToast({
                title: '跳转失败',
                icon: 'error'
              })
            }
          })
        } else if (res.cancel) {
          // 用户取消
          config.onCancel?.()
        }
        resolve(false)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

/**
 * 快速登录验证（静默模式）
 * 不显示弹窗，直接跳转到登录页
 */
export const requireAuthSilent = (): Promise<boolean> => {
  return requireAuth({ silent: true })
}

/**
 * 页面级登录验证
 * 适用于整个页面需要登录才能访问的场景
 * @param pageName 页面名称，用于提示
 */
export const requireAuthForPage = (pageName: string): Promise<boolean> => {
  return requireAuth({
    title: '访问受限',
    content: `${pageName}需要登录后才能访问`,
    confirmText: '立即登录',
    showCancel: false
  })
}

/**
 * 功能级登录验证 - 页面跳转类型
 * 适用于页面内某个功能需要登录的场景
 * @param featureName 功能名称，用于提示
 * @param targetPath 登录成功后跳转的目标页面路径
 */
export const requireAuthForFeature = (featureName: string, targetPath?: string): Promise<boolean> => {
  return requireAuth({
    title: '功能受限',
    content: `使用${featureName}功能需要先登录`,
    confirmText: '去登录',
    showCancel: true,
    targetPath,
    type: 'navigate'
  })
}

/**
 * 操作级登录验证 - 回调执行类型
 * 适用于需要登录后执行特定操作的场景（如收藏、点赞等）
 * @param actionName 操作名称，用于提示
 * @param onSuccess 登录成功后执行的操作
 */
export const requireAuthForAction = (actionName: string, onSuccess: () => void): Promise<boolean> => {
  return requireAuth({
    title: '需要登录',
    content: `${actionName}需要先登录`,
    confirmText: '去登录',
    showCancel: true,
    type: 'action',
    onSuccess
  })
}

// 这些函数已废弃，使用新的URL参数机制

/**
 * 检查页面是否需要登录访问
 * 可以在页面的onLoad中调用
 * @param pageName 页面名称
 * @returns 是否已登录
 */
export const checkPageAuth = async (pageName: string): Promise<boolean> => {
  const isLoggedIn = await requireAuthForPage(pageName)
  if (!isLoggedIn) {
    // 未登录，阻止页面继续加载
    return false
  }
  return true
}

/**
 * 登录验证装饰器
 * 用于包装需要登录的方法
 */
export const withAuth = <T extends (...args: any[]) => any>(
  fn: T,
  options: AuthGuardOptions = {}
): T => {
  return (async (...args: any[]) => {
    const isLoggedIn = await requireAuth(options)
    if (isLoggedIn) {
      return fn.apply(this, args)
    }
    // 未登录时返回空或默认值
    return null
  }) as T
}

/**
 * 统一的退出登录处理
 * @param options 退出登录选项
 */
export interface LogoutOptions {
  // 是否显示确认弹窗
  showConfirm?: boolean
  // 确认弹窗标题
  confirmTitle?: string
  // 确认弹窗内容
  confirmContent?: string
  // 退出成功后是否跳转到首页
  redirectToHome?: boolean
  // 成功回调
  onSuccess?: () => void
  // 失败回调
  onError?: (error: any) => void
}

export const performLogout = async (options: LogoutOptions = {}): Promise<boolean> => {
  const {
    showConfirm = true,
    confirmTitle = '确认退出',
    confirmContent = '确定要退出登录吗？退出后需要重新登录才能使用相关功能。',
    redirectToHome = true,
    onSuccess,
    onError
  } = options

  try {
    // 如果需要显示确认弹窗
    if (showConfirm) {
      const confirmed = await new Promise<boolean>((resolve) => {
        wx.showModal({
          title: confirmTitle,
          content: confirmContent,
          confirmText: '确定退出',
          cancelText: '取消',
          success: (res) => resolve(res.confirm),
          fail: () => resolve(false)
        })
      })

      if (!confirmed) {
        return false
      }
    }

    // 显示加载提示
    wx.showLoading({
      title: '退出中...',
      mask: true
    })

    // 调用退出登录API
    try {
      await authService.logout()
      console.log('退出登录API调用完成')
    } catch (logoutError) {
      console.warn('退出登录API调用失败，但继续执行本地清理:', logoutError)
      // 不抛出错误，继续执行后续逻辑
    }
    
    console.log('退出登录流程完成')

    // 隐藏加载提示
    wx.hideLoading()

    // 显示成功提示
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1000
    })

    // 调用成功回调
    onSuccess?.()

    // 如果需要跳转到首页，缩短延迟时间
    if (redirectToHome) {
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index',
          fail: (error) => {
            console.error('跳转首页失败:', error)
            // 如果switchTab失败，尝试使用navigateTo
            wx.reLaunch({
              url: '/pages/index/index',
              fail: (retryError) => {
                console.error('重新加载首页也失败:', retryError)
              }
            })
          }
        })
      }, 1000)
    }

    return true

  } catch (error) {
    console.error('退出登录失败:', error)
    
    // 确保隐藏loading
    wx.hideLoading()
    
    wx.showToast({
      title: '退出失败，请重试',
      icon: 'error',
      duration: 2000
    })

    // 调用失败回调
    onError?.(error)
    
    return false
  }
}

// 导出常用的预配置守卫
export const authGuards = {
  // 成就徽章
  achievements: () => requireAuthForFeature('成就徽章', '/pages/achievements/achievements'),
  
  // 我的打卡（跳转到打卡历史）
  checkin: () => requireAuthForFeature('我的打卡', '/pages/user/history'),
  
  // 打卡历史
  history: () => requireAuthForFeature('打卡历史', '/pages/user/history'),
  
  // 我的收藏
  favorites: () => requireAuthForFeature('我的收藏', '/pages/user/favorites'),
  
  // 个人中心
  profile: () => requireAuthForPage('个人中心'),
  
  // 积分商城
  points: () => requireAuthForFeature('积分商城', '/pages/points/mall'),
  
  // 积分详情
  pointsDetail: () => requireAuthForFeature('积分详情', '/pages/points/detail'),
  
  // 社交广场
  social: () => requireAuthForFeature('社交广场', '/pages/social/index'),
  
  // 设置页面
  settings: () => requireAuthForPage('设置')
}
