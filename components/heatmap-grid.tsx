import Link from "next/link";

import { IndustryOpportunityCard } from "@/types";

export function HeatmapGrid({ items }: { items: IndustryOpportunityCard[] }) {
  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Heatmap</p>
          <h2 className="mt-2 text-2xl font-semibold">行业机会热力图</h2>
        </div>
        <p className="text-sm text-ink/55">横向看趋势与资金，纵向看估值与风险的平衡状态</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.industryId}
            href={`/industries/${item.industryId}`}
            className="rounded-3xl border border-ink/10 bg-gradient-to-br from-white to-mist/80 p-5 transition hover:border-pine/35 hover:shadow-panel"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{item.industryName}</p>
                <p className="mt-2 text-sm text-ink/65">{item.label}</p>
              </div>
              <div className="rounded-2xl bg-pine px-3 py-2 text-sm font-semibold text-white">
                {item.opportunityScore}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink/55">
                  <span>趋势强度</span>
                  <span>{item.trendScore}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-pine" style={{ width: `${item.trendScore}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink/55">
                  <span>资金热度</span>
                  <span>{item.capitalScore}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-mint" style={{ width: `${item.capitalScore}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink/55">
                  <span>估值性价比</span>
                  <span>{item.valuationScore}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${item.valuationScore}%` }} />
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-ink/68">{item.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
