/**
 * Overview 模块统一的数字格式化工具。
 *
 * 规则（中英文逻辑一致：超过下一档基数 1 就升级单位，保留小数点后两位）：
 * - 中文: 万 (1e4)、亿 (1e8)、万亿 (1e12)
 * - 英文: K (1e3)、M (1e6)、B (1e9)、T (1e12)
 *
 * 应用范围：InfoBar、地图 tooltip、排行榜数值与变化量。
 */

/** 截断到 2 位小数（不四舍五入），避免 toFixed 的进位带来的视觉跳档（如 9999.999 → 10K）。 */
function truncate2(num: number): string {
  const truncated = Math.trunc(num * 100) / 100
  // 始终保留两位小数（即便末位为 0）以满足"保留小数点后两位"的明确要求
  return truncated.toFixed(2)
}

/**
 * 将数字格式化为带本地化单位的字符串。
 * - 0 与非有限数视为 0。
 * - 负数保留符号，绝对值参与单位判断。
 */
export function formatCompactNumber(num: number, isZh: boolean): string {
  if (!Number.isFinite(num)) return '0'
  const sign = num < 0 ? '-' : ''
  const abs = Math.abs(num)

  if (isZh) {
    if (abs >= 1e12) return `${sign}${truncate2(abs / 1e12)}万亿`
    if (abs >= 1e8) return `${sign}${truncate2(abs / 1e8)}亿`
    if (abs >= 1e4) return `${sign}${truncate2(abs / 1e4)}万`
    return new Intl.NumberFormat('zh-CN').format(num)
  }

  if (abs >= 1e12) return `${sign}${truncate2(abs / 1e12)}T`
  if (abs >= 1e9) return `${sign}${truncate2(abs / 1e9)}B`
  if (abs >= 1e6) return `${sign}${truncate2(abs / 1e6)}M`
  if (abs >= 1e3) return `${sign}${truncate2(abs / 1e3)}K`
  return new Intl.NumberFormat('en-US').format(num)
}

/** 变化量格式化：包含正负号（0 输出 '0'）。 */
export function formatCompactChange(num: number, isZh: boolean): string {
  if (!Number.isFinite(num) || num === 0) return '0'
  const formatted = formatCompactNumber(Math.abs(num), isZh)
  return num > 0 ? `+${formatted}` : `-${formatted}`
}
