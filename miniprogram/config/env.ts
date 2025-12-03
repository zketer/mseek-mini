/**
 * 环境配置文件
 * 根据不同环境配置不同的API地址和参数
 * 
 * @author lynn
 * @since 2024-01-01
 */

// 环境类型
export type EnvType = 'development' | 'production' | 'test'

// 配置接口
interface EnvConfig {
  apiBaseUrl: string
  timeout: number
  debug: boolean
  name: string
}

// 开发环境配置
const developmentConfig: EnvConfig = {
  apiBaseUrl: 'http://localhost:8000',
  timeout: 10000,
  debug: true,
  name: '开发环境'
}

// 测试环境配置
const testConfig: EnvConfig = {
  apiBaseUrl: 'http://localhost:8000',
  timeout: 15000,
  debug: true,
  name: '测试环境'
}

// 生产环境配置
const productionConfig: EnvConfig = {
  apiBaseUrl: 'http://localhost:8000',
  timeout: 15000,
  debug: false,
  name: '生产环境'
}

// 获取当前环境
const getCurrentEnv = (): EnvType => {
  // 可以通过编译时变量、本地存储等方式确定环境
  // 开发阶段默认使用开发环境
  const env = wx.getStorageSync('current_env') || 'development'
  return env as EnvType
}

// 获取环境配置
const getEnvConfig = (env?: EnvType): EnvConfig => {
  const currentEnv = env || getCurrentEnv()
  
  switch (currentEnv) {
    case 'development':
      return developmentConfig
    case 'test':
      return testConfig
    case 'production':
      return productionConfig
    default:
      return developmentConfig
  }
}

// 当前环境配置
export const ENV_CONFIG = getEnvConfig()

// 导出配置方法
export {
  getCurrentEnv,
  getEnvConfig,
  type EnvConfig
}

// 环境切换方法（仅开发阶段使用）
export const switchEnv = (env: EnvType) => {
  wx.setStorageSync('current_env', env)
  wx.showModal({
    title: '环境切换',
    content: `已切换到${getEnvConfig(env).name}，请重启小程序生效`,
    showCancel: false
  })
}

// 打印当前环境信息
console.log(`[Environment] 当前环境: ${ENV_CONFIG.name}`)
console.log(`[Environment] API地址: ${ENV_CONFIG.apiBaseUrl}`)
console.log(`[Environment] 调试模式: ${ENV_CONFIG.debug ? '开启' : '关闭'}`)
