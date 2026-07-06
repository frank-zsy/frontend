import type { EChartsOption } from 'echarts'
import type { EChartsType } from 'echarts/core'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { TrendItem } from '../types'
import { echarts } from './trendChartEcharts'

interface TrendChartProps {
  trend: TrendItem | null
  loading: boolean
  isZh: boolean
  /** 紧凑模式：隐藏垂直刻度并最大化绘图区，适用于多图并排小窗口 */
  compact?: boolean
}

function readThemeColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function withAlpha(color: string, alpha: number): string {
  // 仅处理 #RRGGBB / #RGB 形式；CSS var 已被 readThemeColor 解析为具体颜色值
  const hex = color.trim()
  if (hex.startsWith('#')) {
    let r: number
    let g: number
    let b: number
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16)
      g = parseInt(hex[2] + hex[2], 16)
      b = parseInt(hex[3] + hex[3], 16)
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16)
      g = parseInt(hex.slice(3, 5), 16)
      b = parseInt(hex.slice(5, 7), 16)
    } else {
      return color
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

/** Format Y-axis value into compact abbreviated form (K/M/B) */
function formatAxisValue(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!isFinite(num)) return '0'
  const abs = Math.abs(num)
  if (abs >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  if (abs >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(num))
}

function buildOption(trend: TrendItem, seriesName: string, compact: boolean): EChartsOption {
  const primary = readThemeColor('--chart-1', '#22C55E')
  const muted = readThemeColor('--muted-foreground', '#64748B')
  const border = readThemeColor('--border', '#475569')
  const card = readThemeColor('--card', '#1E293B')
  const foreground = readThemeColor('--foreground', '#E2E8F0')

  const grid = compact
    ? { left: 4, right: 8, top: 8, bottom: 4, containLabel: true }
    : { left: 36, right: 16, top: 24, bottom: 28, containLabel: true }

  return {
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 600,
    animationDurationUpdate: 400,
    animationEasing: 'cubicOut',
    animationEasingUpdate: 'cubicOut',
    grid,
    tooltip: {
      trigger: 'axis',
      backgroundColor: card,
      borderColor: border,
      borderWidth: 1,
      textStyle: { color: foreground, fontSize: 12 },
      // 紧凑卡片高度仅 120px 且外层 overflow-hidden，将 tooltip 渲染到 body 避免被父容器裁剪
      appendTo: 'body',
      confine: false,
    },
    xAxis: {
      type: 'category',
      data: trend.labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: withAlpha(border, 0.6) } },
      axisTick: { show: false },
      axisLabel: { color: muted, fontSize: compact ? 10 : 11 },
    },
    yAxis: {
      type: 'value',
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        show: true,
        color: muted,
        fontSize: compact ? 9 : 11,
        formatter: (value: number | string) => formatAxisValue(value),
      },
      splitLine: {
        show: true,
        lineStyle: { color: withAlpha(border, 0.3), type: 'dashed' },
      },
    },
    series: [
      {
        name: seriesName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: trend.values,
        lineStyle: { color: primary, width: 2 },
        itemStyle: { color: primary },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(primary, 0.32) },
              { offset: 1, color: withAlpha(primary, 0) },
            ],
          },
        },
        emphasis: { focus: 'series' },
      },
    ],
  }
}

function isValidTrend(trend: TrendItem | null): trend is TrendItem {
  return (
    !!trend &&
    Array.isArray(trend.labels) &&
    Array.isArray(trend.values) &&
    trend.labels.length > 0
  )
}

export function TrendChart({ trend, loading, isZh, compact = false }: TrendChartProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const trendRef = useRef<TrendItem | null>(trend)
  const seriesNameRef = useRef<string>('')
  const compactRef = useRef<boolean>(compact)

  const seriesName = isValidTrend(trend) ? (isZh ? trend.title_zh : trend.title) : ''

  // 同步最新数据到 ref，便于主题观察者读取
  trendRef.current = trend
  seriesNameRef.current = seriesName
  compactRef.current = compact

  // 初始化 chart 实例 + resize + theme observer，仅依赖容器
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const instance = echarts.init(container)
    chartRef.current = instance

    const handleResize = () => instance.resize()
    window.addEventListener('resize', handleResize)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => instance.resize())
      resizeObserver.observe(container)
    }

    // 监听 <html> class 切换（深浅主题），重读 CSS 变量并重绘
    const themeObserver = new MutationObserver(() => {
      const current = trendRef.current
      if (!isValidTrend(current)) return
      instance.setOption(buildOption(current, seriesNameRef.current, compactRef.current), true)
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
      themeObserver.disconnect()
      instance.dispose()
      chartRef.current = null
    }
  }, [])

  // 数据/标签变化时刷新图表
  useEffect(() => {
    const instance = chartRef.current
    if (!instance) return
    if (!isValidTrend(trend)) {
      instance.clear()
      return
    }
    instance.setOption(buildOption(trend, seriesName, compact), true)
  }, [trend, seriesName, compact])

  const isEmpty = !loading && !isValidTrend(trend)
  const headingText = isValidTrend(trend) ? (isZh ? trend.title_zh : trend.title) : ''

  return (
    <div className={`dark-card flex h-full flex-col rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
      <div className={`flex shrink-0 items-center justify-between ${compact ? 'mb-1' : 'mb-2'}`}>
        <h3 className={`truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`} title={headingText}>
          {headingText}
        </h3>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('insight.overview.loading')}</p>
          </div>
        )}

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('insight.overview.noData')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
