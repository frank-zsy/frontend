import { useTranslation } from "react-i18next";
import { Wallet, Banknote, Gift, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Separator } from "@/app/components/ui/separator";
import { Badge } from "@/app/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";

export interface PointsBalanceData {
  total: number;
  cash: number;
  gift: number;
  gift_no_tag: number;
  by_tag: Record<string, number>;
  by_tag_names?: Record<string, string>;
}

interface PointsBalanceCardProps {
  balance: PointsBalanceData;
  className?: string;
}

export function PointsBalanceCard({
  balance,
  className,
}: PointsBalanceCardProps) {
  const { t } = useTranslation();
  const tagEntries = Object.entries(balance.by_tag ?? {});

  return (
    <div className={className ? `space-y-6 ${className}` : "space-y-6"}>
      {/* 总览卡片 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center size-12 rounded-full bg-primary/10">
              <Wallet className="size-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">{t('points.totalPoints')}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={t('points.cashPointsTooltip')}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <HelpCircle className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-sm text-pretty">
                    {t('points.cashPointsTooltip')}
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {balance.total.toLocaleString()}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 现金积分 */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-chart-2/25 bg-chart-2/10">
              <div className="flex items-center justify-center size-10 rounded-full bg-chart-2/15">
                <Banknote className="size-5 text-chart-2" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">{t('points.cashPoints')}</p>
                </div>
                <p className="text-xl font-semibold text-chart-2">
                  {balance.cash.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 礼物积分 */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-chart-4/25 bg-chart-4/10">
              <div className="flex items-center justify-center size-10 rounded-full bg-chart-4/15">
                <Gift className="size-5 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('points.giftPoints')}</p>
                <p className="text-xl font-semibold text-chart-4">
                  {balance.gift.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 礼物积分明细 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('points.giftPointsDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 无标签积分 */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t('points.noTag')}</Badge>
              </div>
              <span className="font-semibold">
                {balance.gift_no_tag.toLocaleString()}
              </span>
            </div>

            {/* 按标签分组 */}
            {tagEntries.map(([tag, amount]) => {
              const tagName = balance.by_tag_names?.[tag] ?? tag;
              const showSlug = tagName !== tag;
              return (
                <div
                  key={tag}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="truncate">
                      {tagName}
                      {showSlug && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {tag}
                        </span>
                      )}
                    </Badge>
                  </div>
                  <span className="font-semibold">{amount.toLocaleString()}</span>
                </div>
              );
            })}

            {tagEntries.length === 0 && balance.gift_no_tag === 0 && (
              <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                {t('points.noGiftPoints')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PointsBalanceCard;
