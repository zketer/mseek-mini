// login/login.ts
// 登录页面

import { authService } from '../../services/auth'

Page({
  data: {
    loading: false,
    loginType: 'wechat', // 登录方式：wechat | account
    showPassword: false, // 是否显示密码
    redirectUrl: '', // 登录成功后的回调地址
    formData: {
      username: '',
      password: ''
    }
  },

  onLoad(options: { redirect?: string }) {
    console.log('登录页面加载', options)
    
    // 保存回调地址
    if (options.redirect) {
      this.setData({
        redirectUrl: decodeURIComponent(options.redirect)
      })
      console.log('设置登录成功回调地址:', this.data.redirectUrl)
    }
    
    // 检查是否已经登录
    if (authService.isLoggedIn()) {
      this.navigateToTarget()
      return
    }
  },

  /**
   * 微信授权登录
   */
  async onWechatLogin() {
    if (this.data.loading) return

    this.setData({ loading: true })

    try {
      // 获取微信登录code
      const loginRes = await wx.login()
      if (!loginRes.code) {
        throw new Error('获取微信登录凭证失败')
      }

      console.log('获取微信登录凭证成功，开始登录')

      // 调用后端登录接口（不传递用户信息，后端会创建默认用户信息）
      await authService.wechatMiniProgramLogin(loginRes.code)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 登录成功后跳转
      setTimeout(() => {
        this.navigateToTarget()
      }, 1500)

    } catch (error: any) {
      console.error('微信登录失败:', error)
      
      let errorMsg = '登录失败'
      if (error.message) {
        if (error.message.includes('网络')) {
          errorMsg = '网络连接失败'
        } else if (error.message.includes('服务器')) {
          errorMsg = '服务器异常'
        } else {
          errorMsg = error.message
        }
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 登录成功后跳转
   */
  navigateToTarget() {
    // 优先使用回调地址，但要避免循环重定向到登录页
    if (this.data.redirectUrl && !this.data.redirectUrl.includes('/login')) {
      console.log('登录成功，跳转到回调地址:', this.data.redirectUrl)
      wx.redirectTo({
        url: this.data.redirectUrl,
        fail: () => {
          // 如果redirectTo失败（可能是tabBar页面），尝试switchTab
          wx.switchTab({
            url: this.data.redirectUrl,
            fail: () => {
              // 都失败则跳转首页
              wx.switchTab({
                url: '/pages/index/index'
              })
            }
          })
        }
      })
      return
    }
    
    const pages = getCurrentPages()
    
    if (pages.length > 1) {
      // 有来源页面，返回上一页
      wx.navigateBack()
    } else {
      // 没有来源页面，跳转到首页
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  },

  /**
   * 跳过登录（如果支持游客模式）
   */
  onSkipLogin() {
    this.navigateToTarget()
  },


  /**
   * 登录方式切换
   */
  onLoginTypeChange(e: WechatMiniprogram.BaseEvent) {
    const type = e.currentTarget.dataset.type
    console.log('切换登录方式:', type)
    this.setData({ 
      loginType: type,
      formData: {
        username: '',
        password: ''
      }
    })
  },

  /**
   * 用户名输入
   */
  onUsernameInput(e: WechatMiniprogram.Input) {
    this.setData({
      'formData.username': e.detail.value.trim()
    })
  },

  /**
   * 密码输入
   */
  onPasswordInput(e: WechatMiniprogram.Input) {
    this.setData({
      'formData.password': e.detail.value
    })
  },

  /**
   * 切换密码显示
   */
  onTogglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    })
  },

  /**
   * 账号密码登录
   */
  async onAccountLogin() {
    if (this.data.loading) return

    const { username, password } = this.data.formData
    
    // 表单验证
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'error'
      })
      return
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'error'
      })
      return
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'error'
      })
      return
    }

    this.setData({ loading: true })

    try {
      console.log('开始账号密码登录:', username)

      // 调用后端登录接口
      await authService.accountLogin(username, password)
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 登录成功后跳转
      setTimeout(() => {
        this.navigateToTarget()
      }, 1500)

    } catch (error: any) {
      console.error('账号密码登录失败:', error)
      
      let errorMsg = '登录失败'
      if (error.message) {
        if (error.message.includes('用户名或密码错误')) {
          errorMsg = '用户名或密码错误'
        } else if (error.message.includes('账号被锁定')) {
          errorMsg = '账号被锁定，请联系客服'
        } else if (error.message.includes('网络')) {
          errorMsg = '网络连接失败'
        } else {
          errorMsg = error.message
        }
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'error',
        duration: 2000
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 忘记密码
   */
  onForgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系客服或通过邮箱重置密码功能找回密码',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  /**
   * 注册账号
   */
  onRegister() {
    wx.showToast({
      title: '注册功能开发中，敬请期待！',
      icon: 'none',
      duration: 2000
    })
  },

  /**
   * 隐私政策点击
   */
  onPrivacyTap() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    })
  }
})
