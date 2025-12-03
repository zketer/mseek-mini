# 登录验证守卫使用说明

## 概述

`auth-guard.ts` 提供了统一的登录验证机制，支持自动跳转到登录页面，登录成功后自动返回原页面。

## 主要功能

1. **统一登录验证**：提供多种验证方式，适用于不同场景
2. **自动页面跳转**：未登录时自动跳转到登录页
3. **智能返回机制**：登录成功后自动返回原页面
4. **灵活配置**：支持自定义提示文案和行为

## 使用方式

### 1. 页面级验证

适用于整个页面都需要登录才能访问的场景：

```typescript
import { checkPageAuth } from '../../utils/auth-guard'

Page({
  async onLoad() {
    // 检查页面访问权限
    const isAuthorized = await checkPageAuth('个人中心')
    if (!isAuthorized) {
      return // 未登录会自动跳转到登录页
    }
    
    // 继续页面初始化逻辑
    this.loadUserData()
  }
})
```

### 2. 功能级验证

适用于页面内某个功能需要登录的场景：

```typescript
import { authGuards } from '../../utils/auth-guard'

Page({
  methods: {
    async onFavoriteTap() {
      // 检查收藏功能权限
      if (await authGuards.favorites()) {
        // 已登录，执行收藏逻辑
        this.addToFavorites()
      }
      // 未登录会自动显示登录提示
    }
  }
})
```

### 3. 自定义验证

需要自定义提示文案或行为时：

```typescript
import { requireAuth } from '../../utils/auth-guard'

Page({
  methods: {
    async onVipFeature() {
      const isLoggedIn = await requireAuth({
        title: 'VIP功能',
        content: '此功能需要登录后才能使用，立即登录享受VIP服务？',
        confirmText: '立即登录',
        showCancel: true,
        onCancel: () => {
          console.log('用户取消登录')
        }
      })
      
      if (isLoggedIn) {
        // 执行VIP功能
        this.openVipFeature()
      }
    }
  }
})
```

### 4. 静默验证

不显示提示弹窗，直接跳转：

```typescript
import { requireAuthSilent } from '../../utils/auth-guard'

Page({
  methods: {
    async onQuickLogin() {
      // 静默检查，未登录直接跳转
      await requireAuthSilent()
    }
  }
})
```

### 5. 方法装饰器

包装需要登录的方法：

```typescript
import { withAuth } from '../../utils/auth-guard'

Page({
  methods: {
    // 使用装饰器包装方法
    addToFavorites: withAuth(function() {
      // 只有登录后才会执行这里的逻辑
      console.log('添加到收藏')
    }, {
      title: '收藏功能',
      content: '请先登录后再收藏'
    })
  }
})
```

## 预配置守卫

为常用功能提供了预配置的守卫：

```typescript
import { authGuards } from '../../utils/auth-guard'

// 成就徽章
await authGuards.achievements()

// 我的打卡
await authGuards.checkin()

// 我的收藏
await authGuards.favorites()

// 个人中心
await authGuards.profile()

// 积分商城
await authGuards.points()

// 社交广场
await authGuards.social()

// 设置页面
await authGuards.settings()
```

## 登录成功后的处理

登录页面会自动调用 `handleLoginSuccess()` 处理跳转逻辑：

```typescript
import { handleLoginSuccess } from '../../utils/auth-guard'

Page({
  async onLoginSuccess() {
    // 登录成功后自动跳转回原页面
    handleLoginSuccess()
  }
})
```

## 退出登录处理

提供统一的退出登录功能：

### 1. 基本退出

```typescript
import { performLogout } from '../../utils/auth-guard'

Page({
  async onLogout() {
    // 使用默认配置退出登录
    await performLogout()
  }
})
```

### 2. 自定义退出

```typescript
import { performLogout } from '../../utils/auth-guard'

Page({
  async onLogout() {
    await performLogout({
      confirmTitle: '确认退出',
      confirmContent: '退出后将清除所有本地数据，确定要退出吗？',
      redirectToHome: false, // 不自动跳转到首页
      onSuccess: () => {
        console.log('退出成功')
        // 更新页面状态
        this.updateUserStatus()
      },
      onError: (error) => {
        console.error('退出失败:', error)
      }
    })
  }
})
```

### 3. 静默退出

```typescript
import { performLogout } from '../../utils/auth-guard'

Page({
  async onSilentLogout() {
    // 不显示确认弹窗，直接退出
    await performLogout({
      showConfirm: false
    })
  }
})
```

## 工作原理

1. **保存原页面路径**：验证失败时自动保存当前页面的完整路径（包括参数）
2. **跳转到登录页**：显示提示或直接跳转到 `/pages/login/login`
3. **登录成功处理**：登录成功后读取保存的路径，智能判断跳转方式：
   - TabBar页面：使用 `wx.switchTab`
   - 普通页面：使用 `wx.navigateTo`
   - 无保存路径：跳转到首页

## 注意事项

1. **异步调用**：所有验证方法都是异步的，需要使用 `await`
2. **返回值**：验证方法返回 `boolean`，`true` 表示已登录，`false` 表示未登录
3. **页面栈**：系统会自动处理页面栈，避免重复跳转
4. **存储清理**：登录成功后会自动清除保存的重定向路径

## 扩展使用

如需添加新的预配置守卫，可在 `authGuards` 对象中添加：

```typescript
export const authGuards = {
  // 现有守卫...
  
  // 新增守卫
  newFeature: () => requireAuthForFeature('新功能'),
}
```
