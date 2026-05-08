import { ChartPoint } from "@/types";

export function TrendBars({ title, data }: { title: string; data: ChartPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <div className="panel p-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Trend Signal</p>
          <h3 className="mt-2 text-lg font-semibold">{title}</h3>
        </div>
        <p className="text-sm text-ink/55">样例趋势图占位</p>
      </div>
      <div className="mt-6 flex h-48 items-end gap-4">
        {data.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-full w-full items-end">
              <div
                className="w-full rounded-t-2xl bg-gradient-to-t from-pine to-mint"
                style={{ height: `${(point.value / max) * 100}%` }}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{point.value}</p>
              <p className="text-xs text-ink/55">{point.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
