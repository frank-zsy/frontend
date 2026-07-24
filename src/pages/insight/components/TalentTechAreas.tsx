import type { TechAreaContribution } from '../types/talent';

type Props = {
  areas: TechAreaContribution[];
};

export function TalentTechAreas({ areas }: Props) {
  const sorted = [...areas].sort((a, b) => b.o - a.o);
  const total = sorted.reduce((sum, item) => sum + item.o, 0);

  return (
    <div className="space-y-3">
      {sorted.map((area) => {
        const percent = total > 0 ? (area.o / total) * 100 : 0;
        return (
          <div key={area.name} className="flex items-center gap-3">
            <span className="w-28 flex-shrink-0 truncate text-sm text-foreground">
              {area.name}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-16 flex-shrink-0 text-right text-sm font-medium tabular-nums text-muted-foreground">
              {area.o.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
