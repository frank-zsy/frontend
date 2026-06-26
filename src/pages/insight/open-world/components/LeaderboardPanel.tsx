import type { Leaderboard, LeaderboardRow } from '../types'
import { LeaderboardTable } from './LeaderboardTable'

interface LeaderboardPanelProps {
  leaderboards: Leaderboard[]
  isZh: boolean
  loading: boolean
  /** 仅作用于含 code 的行，由外层据此驱动地图下钻 */
  onRowClick?: (row: LeaderboardRow) => void
}

/**
 * 1 榜直接渲染；2 榜上下堆叠（各占一半高度），不再使用 Tab 切换。
 * 多榜时通过 flex 等分高度，内部仍由 LeaderboardTable 自身滚动。
 */
export function LeaderboardPanel({ leaderboards, isZh, loading, onRowClick }: LeaderboardPanelProps) {
  if (!leaderboards || leaderboards.length === 0) {
    return (
      <div className="dark-card flex h-full items-center justify-center rounded-lg p-3">
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    )
  }

  if (leaderboards.length === 1) {
    return (
      <LeaderboardTable
        leaderboard={leaderboards[0]}
        isZh={isZh}
        loading={loading}
        onRowClick={onRowClick}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {leaderboards.map((b, idx) => (
        <div key={`${b.title}-${idx}`} className="min-h-0 flex-1">
          <LeaderboardTable
            leaderboard={b}
            isZh={isZh}
            loading={loading}
            onRowClick={onRowClick}
          />
        </div>
      ))}
    </div>
  )
}
