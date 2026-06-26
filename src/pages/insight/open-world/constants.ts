import type { DatasetKey, GeoScope } from './types'

export const OVERVIEW_DATA_BASE_URL = 'https://selfoss.open-digger.cn/openshare/overview/'

export const DATASETS: DatasetKey[] = ['developers', 'contribution', 'influence']

export const DEFAULT_DATASET: DatasetKey = 'developers'
export const DEFAULT_GEO_SCOPE: GeoScope = 'world'

/** 当前支持的下钻国家代码（alpha2） */
export const DRILL_DOWN_COUNTRIES: string[] = ['CN', 'US']

/**
 * 下钻国家的本地化名称与 GeoJSON 文件名映射。
 * GeoJSON 路径为 /geo/<geoFile>，与 frontend/public/geo 下静态资源对齐。
 */
export const COUNTRY_META: Record<string, { zh: string; en: string; geoFile: string }> = {
  CN: { zh: '中国', en: 'China', geoFile: 'CN.json' },
  US: { zh: '美国', en: 'United States', geoFile: 'US.json' },
}

/**
 * 世界地图在未悬浮时默认显示名称的国家白名单。
 * key 必须严格匹配 /geo/world.json 中的 properties.name（英文原名），
 * value 提供中英文展示名，用于按当前语言渲染地图标签。
 */
export const ALWAYS_LABEL_COUNTRIES: Record<string, { zh: string; en: string }> = {
  China: { zh: '中国', en: 'China' },
  'United States': { zh: '美国', en: 'United States' },
  Canada: { zh: '加拿大', en: 'Canada' },
  Brazil: { zh: '巴西', en: 'Brazil' },
  Russia: { zh: '俄罗斯', en: 'Russia' },
  Australia: { zh: '澳大利亚', en: 'Australia' },
  Germany: { zh: '德国', en: 'Germany' },
  Egypt: { zh: '埃及', en: 'Egypt' },
  'South Africa': { zh: '南非', en: 'South Africa' },
  India: { zh: '印度', en: 'India' },
  Algeria: { zh: '阿尔及利亚', en: 'Algeria' },
  Nigeria: { zh: '尼日利亚', en: 'Nigeria' },
  Indonesia: { zh: '印度尼西亚', en: 'Indonesia' },
  Turkey: { zh: '土耳其', en: 'Turkey' },
  Kenya: { zh: '肯尼亚', en: 'Kenya' },
}

/**
 * 下钻地图在未悬浮时默认显示名称的省/州白名单。
 * 按 geoScope 索引，key 必须严格匹配对应 GeoJSON 中的 properties.name：
 * - CN: /geo/CN.json 使用省份简称（如“北京”“内蒙古”）
 * - US: /geo/US.json 使用州名英文原名（如“California”）
 */
export const ALWAYS_LABEL_SUBDIVISIONS: Record<string, Record<string, { zh: string; en: string }>> = {
  CN: {
    '北京': { zh: '北京', en: 'Beijing' },
    '上海': { zh: '上海', en: 'Shanghai' },
    '浙江': { zh: '浙江', en: 'Zhejiang' },
    '广东': { zh: '广东', en: 'Guangdong' },
    '四川': { zh: '四川', en: 'Sichuan' },
    '陕西': { zh: '陕西', en: 'Shaanxi' },
    '湖北': { zh: '湖北', en: 'Hubei' },
    '台湾': { zh: '台湾', en: 'Taiwan' },
    '江苏': { zh: '江苏', en: 'Jiangsu' },
  },
  US: {
    California: { zh: '加利福尼亚州', en: 'California' },
    'New York': { zh: '纽约州', en: 'New York' },
    Washington: { zh: '华盛顿州', en: 'Washington' },
    Texas: { zh: '德克萨斯州', en: 'Texas' },
    Colorado: { zh: '科罗拉多州', en: 'Colorado' },
    Illinois: { zh: '伊利诺伊州', en: 'Illinois' },
    Pennsylvania: { zh: '宾夕法尼亚州', en: 'Pennsylvania' },
    Alaska: { zh: '阿拉斯加州', en: 'Alaska' },
  },
}
