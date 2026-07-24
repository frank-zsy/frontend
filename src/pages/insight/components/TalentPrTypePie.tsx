import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import type { EChartsType } from 'echarts/core';
import type { PrTypeItem } from '../types/talent';

type Props = {
  prTypes: PrTypeItem[];
};

type EChartsModule = typeof import('./talentProfileEcharts');

let echartsLoader: Promise<EChartsModule> | null = null;

function loadECharts() {
  if (!echartsLoader) {
    echartsLoader = import('./talentProfileEcharts');
  }
  return echartsLoader;
}

const PR_TYPE_COLORS: Record<string, string> = {
  Feature: '#3b82f6',
  Fix: '#ef4444',
  Refactor: '#10b981',
  Docs: '#8b5cf6',
  Chore: '#6b7280',
  Other: '#f97316',
};

export function TalentPrTypePie({ prTypes }: Props) {
  const { t } = useTranslation();
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType | null>(null);

  // Treat all-zero counts the same as an empty array so the pie is not blank.
  const hasData =
    Array.isArray(prTypes) &&
    prTypes.length > 0 &&
    prTypes.some((item) => (item.count ?? 0) > 0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!hasData) return;

    let cancelled = false;
    let chart: EChartsType | null = null;
    let onResize: (() => void) | null = null;

    loadECharts().then(({ echarts }) => {
      if (cancelled) return;

      chart = echarts.init(container);
      chartRef.current = chart;
      onResize = () => chart?.resize();
      window.addEventListener('resize', onResize);

      const isDark = resolvedTheme === 'dark';
      const textColor = isDark ? '#e2e8f0' : '#334155';
      const tooltipBg = isDark ? '#1e293b' : '#ffffff';
      const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

      const data = prTypes.map((item) => ({
        name: item.type,
        value: item.count,
        itemStyle: { color: PR_TYPE_COLORS[item.type] || PR_TYPE_COLORS.Other },
      }));

      chart.setOption({
        tooltip: {
          trigger: 'item',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: textColor, fontSize: 12 },
          formatter: (params: unknown) => {
            const p = params as { name?: string; value?: number; percent?: number };
            return `${p.name}: ${p.value} (${p.percent?.toFixed(1)}%)`;
          },
        },
        legend: {
          bottom: 0,
          textStyle: { color: textColor, fontSize: 12 },
        },
        series: [
          {
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 4, borderColor: 'transparent', borderWidth: 2 },
            label: { show: false },
            emphasis: {
              label: { show: true, fontSize: 13, fontWeight: 'bold', color: textColor },
            },
            data,
          },
        ],
      });
    });

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      if (chart) {
        chart.dispose();
        chartRef.current = null;
      }
    };
  }, [prTypes, resolvedTheme, t, hasData]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: 300 }}
      >
        {t('insight.talentPrTypeEmpty')}
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: 300 }} />;
}
