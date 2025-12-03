// achievements.ts
// 成就徽章页面

import { checkPageAuth } from '../../utils/auth-guard'
import { achievementService, Achievement } from '../../services/museum'

interface AchievementCategory {
  id: string
  name: string
  count: number
  unlockedCount: number
}

Page({
  data: {
    // 加载状态
    loading: false,
    error: null as string | null,

    // 成就分类
    categories: [
      { id: 'all', name: '全部', count: 0, unlockedCount: 0 },
      { id: 'checkin', name: '打卡成就', count: 0, unlockedCount: 0 },
      { id: 'explore', name: '探索成就', count: 0, unlockedCount: 0 },
      { id: 'social', name: '社交成就', count: 0, unlockedCount: 0 },
      { id: 'special', name: '特殊成就', count: 0, unlockedCount: 0 }
    ] as AchievementCategory[],

    // 当前选中的分类
    selectedCategory: 'all',

    // 成就列表 - 从后端获取
    achievements: [] as Achievement[],

    // 默认成就数据（后端API未实现时的备用数据）
    defaultAchievements: [
      // 打卡成就系列
      {
        id: 'register',
        name: '文博新人',
        description: '欢迎加入文博探索的世界！',
        icon: '🎉',
        category: 'checkin',
        requirement: '完成用户注册',
        progress: 1,
        target: 1,
        unlocked: true,
        unlockedDate: '2024-01-01',
        rarity: 'common'
      },
      {
        id: 'first_checkin',
        name: '初来乍到',
        description: '完成第一次博物馆打卡',
        icon: '🏛️',
        category: 'checkin',
        requirement: '打卡1个博物馆',
        progress: 1,
        target: 1,
        unlocked: true,
        unlockedDate: '2024-01-02',
        rarity: 'common'
      },
      {
        id: 'checkin_5',
        name: '文化探索者',
        description: '已探索5个不同的博物馆',
        icon: '🔍',
        category: 'checkin',
        requirement: '打卡5个博物馆',
        progress: 3,
        target: 5,
        unlocked: false,
        rarity: 'common'
      },
      {
        id: 'checkin_10',
        name: '博物馆达人',
        description: '已成为真正的博物馆爱好者',
        icon: '⭐',
        category: 'checkin',
        requirement: '打卡10个博物馆',
        progress: 3,
        target: 10,
        unlocked: false,
        rarity: 'rare'
      },
      {
        id: 'checkin_25',
        name: '文化收藏家',
        description: '对文化艺术有着深度的理解',
        icon: '💎',
        category: 'checkin',
        requirement: '打卡25个博物馆',
        progress: 3,
        target: 25,
        unlocked: false,
        rarity: 'epic'
      },
      {
        id: 'checkin_50',
        name: '文博大师',
        description: '文博领域的资深专家',
        icon: '👑',
        category: 'checkin',
        requirement: '打卡50个博物馆',
        progress: 3,
        target: 50,
        unlocked: false,
        rarity: 'legendary'
      },
      {
        id: 'checkin_100',
        name: '文化传承者',
        description: '致力于文化传承的使者',
        icon: '🏆',
        category: 'checkin',
        requirement: '打卡100个博物馆',
        progress: 3,
        target: 100,
        unlocked: false,
        rarity: 'legendary'
      },

      // 探索成就系列
      {
        id: 'city_explorer',
        name: '城市探索家',
        description: '在不同城市中探索文化瑰宝',
        icon: '🌆',
        category: 'explore',
        requirement: '在5个不同城市打卡',
        progress: 2,
        target: 5,
        unlocked: false,
        rarity: 'rare'
      },
      {
        id: 'province_master',
        name: '省域文化通',
        description: '跨越省域的文化之旅',
        icon: '🗺️',
        category: 'explore',
        requirement: '在3个不同省份打卡',
        progress: 1,
        target: 3,
        unlocked: false,
        rarity: 'epic'
      },
      {
        id: 'weekend_warrior',
        name: '周末文化人',
        description: '充实的周末文化生活',
        icon: '📅',
        category: 'explore',
        requirement: '连续4个周末打卡',
        progress: 1,
        target: 4,
        unlocked: false,
        rarity: 'rare'
      },

      // 社交成就系列
      {
        id: 'sharer',
        name: '文化传播者',
        description: '乐于分享美好的文化体验',
        icon: '📤',
        category: 'social',
        requirement: '分享5次展览或博物馆',
        progress: 0,
        target: 5,
        unlocked: false,
        rarity: 'common'
      },
      {
        id: 'reviewer',
        name: '点评达人',
        description: '为其他文化爱好者提供指导',
        icon: '✍️',
        category: 'social',
        requirement: '发表10条点评',
        progress: 0,
        target: 10,
        unlocked: false,
        rarity: 'rare'
      },

      // 特殊成就系列
      {
        id: 'early_bird',
        name: '早起的鸟儿',
        description: '在博物馆开门第一小时打卡',
        icon: '🌅',
        category: 'special',
        requirement: '上午9点前打卡',
        progress: 0,
        target: 1,
        unlocked: false,
        rarity: 'rare'
      },
      {
        id: 'night_owl',
        name: '夜晚文化人',
        description: '在博物馆闭馆前最后一小时打卡',
        icon: '🌙',
        category: 'special',
        requirement: '闭馆前1小时打卡',
        progress: 0,
        target: 1,
        unlocked: false,
        rarity: 'rare'
      },
      {
        id: 'holiday_enthusiast',
        name: '节日文化使者',
        description: '在传统节日期间探索文化',
        icon: '🎊',
        category: 'special',
        requirement: '节假日打卡5次',
        progress: 0,
        target: 5,
        unlocked: false,
        rarity: 'epic'
      },
      {
        id: 'complete_collector',
        name: '完美收藏家',
        description: '文博探索的究极成就',
        icon: '🌟',
        category: 'special',
        requirement: '解锁所有其他成就',
        progress: 2,
        target: 15,
        unlocked: false,
        rarity: 'legendary'
      }
    ] as Achievement[],

    // 统计信息
    totalAchievements: 0,
    unlockedAchievements: 0,
    completionRate: 0
  },

  async onLoad() {
    console.log('成就徽章页面加载')
    
    // 检查登录状态
    const isAuthorized = await checkPageAuth('成就徽章')
    if (!isAuthorized) {
      return
    }
    
    // 加载成就数据
    await this.loadAchievements()
  },

  // 加载成就数据
  async loadAchievements() {
    this.setData({ loading: true, error: null })
    
    try {
      console.log('开始加载用户成就数据')
      
      // 尝试从后端获取成就数据
      const achievements = await achievementService.getUserAchievements()
      
      if (achievements && achievements.length > 0) {
        console.log('成功获取后端成就数据:', achievements.length, '个成就')
        this.setData({ achievements })
      } else {
        console.log('后端暂无成就数据，使用默认数据')
        this.setData({ achievements: this.data.defaultAchievements })
      }
      
      // 计算统计信息
      this.calculateStats()
      
      this.setData({ loading: false })
      
    } catch (error: any) {
      console.error('加载成就数据失败:', error)
      
      // 如果后端API未实现，使用默认数据
      if (error.statusCode === 404 || error.message?.includes('not found')) {
        console.log('后端成就API未实现，使用默认数据')
        this.setData({ 
          achievements: this.data.defaultAchievements,
          loading: false,
          error: null
        })
        this.calculateStats()
      } else {
        // 其他错误
        this.setData({ 
          loading: false,
          error: '加载成就数据失败，请稍后重试'
        })
        
        // 显示错误提示，但仍使用默认数据
        wx.showToast({
          title: '网络异常，显示本地数据',
          icon: 'none',
          duration: 2000
        })
        
        setTimeout(() => {
          this.setData({ 
            achievements: this.data.defaultAchievements,
            error: null
          })
          this.calculateStats()
        }, 1000)
      }
    }
  },

  // 计算统计信息
  calculateStats() {
    const achievements = this.data.achievements
    const totalCount = achievements.length
    const unlockedCount = achievements.filter(item => item.unlocked).length
    const completionRate = Math.round((unlockedCount / totalCount) * 100)

    // 计算各分类统计
    const categories = this.data.categories.map(cat => {
      if (cat.id === 'all') {
        return { ...cat, count: totalCount, unlockedCount }
      }
      
      const categoryAchievements = achievements.filter(item => item.category === cat.id)
      const categoryUnlocked = categoryAchievements.filter(item => item.unlocked).length
      
      return { 
        ...cat, 
        count: categoryAchievements.length, 
        unlockedCount: categoryUnlocked 
      }
    })

    this.setData({
      categories,
      totalAchievements: totalCount,
      unlockedAchievements: unlockedCount,
      completionRate
    })
  },

  // 切换分类
  onCategoryTap(e: WechatMiniprogram.BaseEvent) {
    const categoryId = e.currentTarget.dataset.id
    this.setData({ selectedCategory: categoryId })
  },

  // 获取过滤后的成就列表
  getFilteredAchievements(): Achievement[] {
    const { achievements, selectedCategory } = this.data
    
    if (selectedCategory === 'all') {
      return achievements
    }
    
    return achievements.filter(item => item.category === selectedCategory)
  },

  // 成就详情
  onAchievementTap(e: WechatMiniprogram.BaseEvent) {
    const achievementId = e.currentTarget.dataset.id
    const achievement = this.data.achievements.find(item => item.id === achievementId)
    
    if (!achievement) return

    const progressText = achievement.unlocked 
      ? `🎉 已解锁\n解锁时间：${achievement.unlockedDate}`
      : `进度：${achievement.progress}/${achievement.target}\n${achievement.requirement}`

    wx.showModal({
      title: `${achievement.icon} ${achievement.name}`,
      content: `${achievement.description}\n\n${progressText}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },


  // 分享成就
  onShareAchievement(e: WechatMiniprogram.BaseEvent) {
    const achievementId = e.currentTarget.dataset.id
    const achievement = this.data.achievements.find(item => item.id === achievementId)
    
    if (!achievement || !achievement.unlocked) {
      wx.showToast({
        title: '只能分享已解锁的成就',
        icon: 'none'
      })
      return
    }

    return {
      title: `我在文博探索获得了"${achievement.name}"成就！`,
      path: `/pages/achievements/achievements?share=${achievement.id}`,
      imageUrl: '/images/achievement-share.png'
    }
  },

  // 页面分享
  onShareAppMessage() {
    const { unlockedAchievements } = this.data
    return {
      title: `我在文博探索已解锁${unlockedAchievements}个成就！`,
      path: '/pages/achievements/achievements'
    }
  },

  // 下拉刷新处理
  async onPullDownRefresh() {
    console.log('下拉刷新成就数据')
    
    try {
      // 重新加载成就数据
      await this.loadAchievements()
      
      // 检查并解锁新成就
      const newAchievements = await achievementService.checkAndUnlockAchievements()
      if (newAchievements.length > 0) {
        wx.showModal({
          title: '🎉 恭喜！',
          content: `您获得了${newAchievements.length}个新成就！`,
          showCancel: false,
          confirmText: '查看成就'
        })
        // 重新加载数据显示新解锁的成就
        await this.loadAchievements()
      }
      
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('刷新成就数据失败:', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'error'
      })
    } finally {
      // 停止下拉刷新动画
      wx.stopPullDownRefresh()
    }
  },

  // 检查新成就
  async checkNewAchievements() {
    try {
      const newAchievements = await achievementService.checkAndUnlockAchievements()
      if (newAchievements.length > 0) {
        // 显示新成就通知
        for (const achievement of newAchievements) {
          wx.showModal({
            title: `🎉 获得新成就！`,
            content: `${achievement.icon} ${achievement.name}\n${achievement.description}`,
            showCancel: false,
            confirmText: '太棒了！'
          })
        }
        // 重新加载数据
        await this.loadAchievements()
      }
    } catch (error) {
      console.error('检查新成就失败:', error)
    }
  }
})
