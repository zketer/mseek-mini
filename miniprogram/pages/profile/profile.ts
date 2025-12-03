// profile.ts
// 我的页面

import { authService } from '../../services/auth'
import { checkinService, favoriteService } from '../../services/museum'
import { performLogout } from '../../utils/auth-guard'

interface UserInfo {
  id: string
  nickname: string
  avatar: string
  level: number
  levelTitle: string
  isLogin: boolean
}

interface UserStats {
  checkins: number
  points: number
  favorites: number
  rank: number
}

interface Achievement {
  id: number
  name: string
  icon: string
  unlocked: boolean
}

Component({
  data: {
    // 用户信息
    userInfo: {
      id: '12345',
      nickname: '博物馆爱好者',
      avatar: '/images/head.png',
      level: 3,
      levelTitle: '文化探索者',
      isLogin: false
    } as UserInfo,

    // 用户统计
    userStats: {
      checkins: 0,
      points: 0,      // 积分功能暂未实现
      favorites: 0,
      rank: 0         // 排名功能暂未实现
    } as UserStats,

    // 成就列表
    achievements: [
      { id: 1, name: '初来乍到', icon: '/images/Icon1.png', unlocked: true },
      { id: 2, name: '博物馆达人', icon: '/images/Icon2.png', unlocked: true },
      { id: 3, name: '文化传播者', icon: '/images/Icon3.png', unlocked: false }
    ] as Achievement[]
  },

  lifetimes: {
    attached() {
      this.loadUserData()
    }
  },

  pageLifetimes: {
    show() {
      // 页面显示时刷新登录状态
      this.checkLoginStatus()
    }
  },

  methods: {
    // 加载用户数据
    loadUserData() {
      console.log('用户页面数据加载完成')
      this.checkLoginStatus()
    },

    // 检查登录状态
    checkLoginStatus() {
      const isLoggedIn = authService.isLoggedIn()
      const currentUser = authService.getCurrentUser()
      
      if (isLoggedIn && currentUser) {
        // 已登录，更新用户信息
        this.setData({
          'userInfo.id': currentUser.userId.toString(),
          'userInfo.nickname': currentUser.nickname || '博物馆爱好者',
          'userInfo.avatar': currentUser.avatar || '/images/head.png',
          'userInfo.isLogin': true
        })
        
        // 加载用户统计数据
        this.loadUserStats()
      } else {
        // 未登录，显示默认状态
        this.setData({
          'userInfo.isLogin': false,
          'userInfo.nickname': '点击登录',
          'userInfo.avatar': '/images/head.png'
        })
        
        // 加载统计数据（未登录时会重置为0）
        this.loadUserStats()
      }
    },

    // 加载用户统计数据
    async loadUserStats() {
      if (!authService.isLoggedIn()) {
        // 未登录状态，重置为0
        this.setData({
          userStats: {
            checkins: 0,
            points: 0,
            favorites: 0,
            rank: 0
          }
        })
        return
      }
      
      try {
        console.log('🔄 开始加载用户统计数据...')
        
        // 并行获取打卡统计和收藏统计
        const [checkinStats, favoriteStats] = await Promise.all([
          checkinService.getCheckinStats(),
          favoriteService.getUserFavoriteStats()
        ])
        
        console.log('📊 打卡统计数据:', checkinStats)
        console.log('❤️ 收藏统计数据:', favoriteStats)
        
        // 更新统计数据显示
        this.setData({
          userStats: {
            checkins: checkinStats.totalCheckins || 0,
            points: 0,    // 积分功能暂未实现，显示0
            favorites: favoriteStats.totalCount || 0,
            rank: 0       // 排名功能暂未实现，显示0
          }
        })
        
        console.log('✅ 用户统计数据加载成功')
      } catch (error) {
        console.error('❌ 加载用户统计数据失败:', error)
        // 失败时显示默认值，保持页面正常显示
        this.setData({
          userStats: {
            checkins: 0,
            points: 0,
            favorites: 0,
            rank: 0
          }
        })
      }
    },

    // 头像点击
    async onAvatarTap() {
      // 检查登录状态
      if (!authService.isLoggedIn()) {
        wx.navigateTo({
          url: '/pages/login/login'
        })
        return
      }

      // 已登录用户，显示操作选项
      wx.showActionSheet({
        itemList: ['更换头像', '退出登录'],
        success: async (res) => {
          if (res.tapIndex === 0) {
            // 更换头像
            wx.chooseImage({
              count: 1,
              sizeType: ['compressed'],
              sourceType: ['album', 'camera'],
              success: async (res) => {
                console.log('选择头像:', res.tempFilePaths[0])
                await this.uploadAvatar(res.tempFilePaths[0])
              }
            })
          } else if (res.tapIndex === 1) {
            // 退出登录
            await performLogout({
              onSuccess: () => {
                // 更新页面状态
                this.setData({
                  'userInfo.isLogin': false,
                  'userInfo.nickname': '点击登录',
                  'userInfo.avatar': '/images/head.png',
                  'userInfo.id': '',
                  userStats: {
                    checkins: 0,
                    points: 0,
                    favorites: 0,
                    rank: 0
                  }
                })
              }
            })
          }
        }
      })
    },

    // 上传头像
    async uploadAvatar(tempFilePath: string) {
      try {
        wx.showLoading({
          title: '上传中...'
        })

        // 获取当前用户信息
        const currentUser = authService.getCurrentUser()
        if (!currentUser || !currentUser.id) {
          wx.showToast({
            title: '用户信息异常',
            icon: 'error'
          })
          return
        }

        // 将图片转换为Base64
        const base64Data = await this.fileToBase64(tempFilePath)

        // 调用后端头像上传接口
        const response = await httpClient.post<ApiResponse<string>>(
          `/api/v1/system/users/${currentUser.id}/avatar/base64`,
          { avatar: base64Data }
        )

        if (response.code === 200) {
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          })

          // 更新本地用户信息
          const updatedUser = {
            ...currentUser,
            avatar: response.data
          }
          authService.setCurrentUser(updatedUser)

          // 更新页面显示
          this.setData({
            'userInfo.avatar': response.data
          })

          console.log('头像上传成功:', response.data)
        } else {
          wx.showToast({
            title: response.message || '头像上传失败',
            icon: 'error'
          })
        }
      } catch (error: any) {
        console.error('头像上传失败:', error)
        wx.showToast({
          title: '头像上传失败',
          icon: 'error'
        })
      } finally {
        wx.hideLoading()
      }
    },

    // 将文件转换为Base64
    fileToBase64(filePath: string): Promise<string> {
      return new Promise((resolve, reject) => {
        // 获取文件信息，判断文件大小
        wx.getFileSystemManager().getFileInfo({
          filePath: filePath,
          success: (fileInfo) => {
            // 检查文件大小（限制为2MB）
            if (fileInfo.size > 2 * 1024 * 1024) {
              reject(new Error('图片大小不能超过2MB'))
              return
            }

            // 读取文件为Base64
            wx.getFileSystemManager().readFile({
              filePath: filePath,
              encoding: 'base64',
              success: (res) => {
                // 获取文件扩展名来确定MIME类型
                const extension = filePath.split('.').pop()?.toLowerCase() || 'jpeg'
                let mimeType = 'image/jpeg'

                switch (extension) {
                  case 'png':
                    mimeType = 'image/png'
                    break
                  case 'gif':
                    mimeType = 'image/gif'
                    break
                  case 'webp':
                    mimeType = 'image/webp'
                    break
                  case 'bmp':
                    mimeType = 'image/bmp'
                    break
                  default:
                    mimeType = 'image/jpeg'
                }

                // 返回完整的data:image格式
                const base64Data = `data:${mimeType};base64,${res.data}`
                resolve(base64Data)
              },
              fail: (error) => {
                console.error('读取文件失败:', error)
                reject(new Error('读取文件失败'))
              }
            })
          },
          fail: (error) => {
            console.error('获取文件信息失败:', error)
            reject(new Error('获取文件信息失败'))
          }
        })
      })
    },

    // 昵称编辑
    onNameEdit() {
      this.showUnimplementedFeature('昵称编辑')
    },

    // 统计数据点击
    async onStatsTap(e: WechatMiniprogram.BaseEvent) {
      const type = e.currentTarget.dataset.type
      console.log('统计点击:', type)
      
      switch (type) {
        case 'checkins':
          // 打卡历史需要登录，登录成功后自动跳转
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '打卡历史功能需要登录后使用，是否前往登录？',
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
        case 'points':
          this.showUnimplementedFeature('积分系统')
          break
        case 'favorites':
          // 我的收藏需要登录，登录成功后自动跳转
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
        case 'rank':
          this.showUnimplementedFeature('排行榜系统')
          break
      }
    },

    // 菜单点击
    async onMenuTap(e: WechatMiniprogram.BaseEvent) {
      const type = e.currentTarget.dataset.type
      console.log('菜单点击:', type)
      
      switch (type) {
        case 'history':
          // 打卡历史需要登录，登录成功后自动跳转
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '打卡历史功能需要登录后使用，是否前往登录？',
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
          // 我的收藏需要登录，登录成功后自动跳转
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
          
        case 'achievements':
          // 成就徽章需要登录，登录成功后自动跳转
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
          
        case 'points':
          this.showUnimplementedFeature('积分商城')
          break
          
        case 'invite':
          this.showUnimplementedFeature('邀请好友')
          break
          
        case 'settings':
          // 设置页面需要登录
          if (!authService.isLoggedIn()) {
            wx.showModal({
              title: '需要登录',
              content: '设置功能需要登录后使用，是否前往登录？',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.navigateTo({
                    url: `/pages/login/login?redirect=${encodeURIComponent('/pages/settings/settings')}`
                  })
                }
              }
            })
          } else {
            wx.navigateTo({
              url: '/pages/settings/settings'
            })
          }
          break
          
        case 'feedback':
          // 反馈建议不需要登录
          wx.navigateTo({
            url: '/pages/feedback/feedback'
          })
          break
          
        case 'about':
          // 关于我们不需要登录
          wx.navigateTo({
            url: '/pages/about/about'
          })
          break
          
        default:
          this.showUnimplementedFeature('该功能')
      }
    },

    // 快捷操作
    async onQuickAction(e: WechatMiniprogram.BaseEvent) {
      const type = e.currentTarget.dataset.type
      console.log('快捷操作:', type)
      
      if (type === 'login') {
        if (this.data.userInfo.isLogin) {
          // 退出登录
          await performLogout({
            onSuccess: () => {
              // 更新页面状态
              this.setData({
                'userInfo.isLogin': false,
                'userInfo.nickname': '点击登录',
                'userInfo.avatar': '/images/head.png',
                'userInfo.id': '',
                userStats: {
                  checkins: 0,
                  points: 0,
                  favorites: 0,
                  rank: 0
                }
              })
            }
          })
        } else {
          // 跳转到登录页面
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    },


    // 未实现功能提示
    showUnimplementedFeature(featureName: string) {
      wx.showToast({
        title: `${featureName}功能正在开发中，敬请期待！`,
        icon: 'none',
        duration: 2000
      })
    },

    // 下拉刷新
    async onPullDownRefresh() {
      try {
        console.log('🔄 下拉刷新用户数据...')
        this.checkLoginStatus()
        await this.loadUserStats()
        
        wx.stopPullDownRefresh()
        wx.showToast({
          title: '刷新完成',
          icon: 'success',
          duration: 1000
        })
        console.log('✅ 下拉刷新完成')
      } catch (error) {
        console.error('❌ 下拉刷新失败:', error)
        wx.stopPullDownRefresh()
        wx.showToast({
          title: '刷新失败',
          icon: 'error',
          duration: 1000
        })
      }
    },

    // 页面分享
    onShareAppMessage() {
      return {
        title: '一起来博物馆打卡吧',
        path: '/pages/index/index',
        imageUrl: '/images/bg.png'
      }
    }
  }
})
