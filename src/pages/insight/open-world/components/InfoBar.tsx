import { useTranslation } from 'react-i18next'
import { formatCompactNumber } from '../format'
import type { OverviewSummary } from '../types'

interface InfoBarProps {
  summary: OverviewSummary | null
}

export function InfoBar({ summary }: InfoBarProps) {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language.startsWith('zh')

  if (!summary) return null

  // 仅在远端下发对应字段时展示，避免出现 "NaN" 或 "0"
  const stats = [
    ...(typeof summary.totalRecords === 'number'
      ? [{ label: t('insight.overview.infoBar.totalRecords'), value: formatCompactNumber(summary.totalRecords, isZh) }]
      : []),
    { label: t('insight.overview.infoBar.totalRepos'), value: formatCompactNumber(summary.totalRepos, isZh) },
    { label: t('insight.overview.infoBar.totalDevelopers'), value: formatCompactNumber(summary.totalDevelopers, isZh) },
    ...(typeof summary.totalCountries === 'number'
      ? [{ label: t('insight.overview.infoBar.totalCountries'), value: formatCompactNumber(summary.totalCountries, isZh) }]
      : []),
    { label: t('insight.overview.infoBar.updatedAt'), value: summary.updatedAt },
  ]

  return (
    <div className="dark-card rounded-lg px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 数据来源 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('insight.overview.infoBar.dataSource')}:</span>
          <a
            href="https://open-digger.cn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <img
              src="https://oss.open-digger.cn/logos/communities/xlab/open_digger.png"
              alt="OpenDigger"
              className="h-4 w-4 object-contain"
            />
            {summary.dataSource}
          </a>
        </div>

        {/* 统计数据 */}
        <div className="flex flex-wrap items-center gap-6">
          {stats.map(({ label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">{label}:</span>
              <span className="text-sm font-semibold text-primary">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
