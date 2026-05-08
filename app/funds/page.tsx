import Link from "next/link";

import { FundDiscoveryClient } from "@/features/funds/fund-discovery-client";
import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { getFundListView, toFundDiscoveryQueryState } from "@/lib/adapters/fund";

export default async function FundsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const activeTheme = typeof params.theme === "string" ? params.theme : undefined;
  const allFunds = await getFundListView();
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") {
      urlParams.set(key, value);
    }
  });

  const queryState = toFundDiscoveryQueryState(urlParams, activeTheme);

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <p className="eyebrow">Fund Discovery</p>
        <h1 className="mt-2 text-4xl font-semibold">基金发现与筛选</h1>
        <p className="mt-4 max-w-3xl leading-8 text-ink/70">
          支持从行业详情页带入主题筛选，也支持按基金名称或代码搜索真实基金，添加到本机采集池后触发 AKShare 盘后数据拉取。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-mist px-4 py-2 text-sm font-semibold text-ink">
            当前主题：{activeTheme ?? "全部行业"}
          </span>
          <Link href="/compare" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
            查看对比池
          </Link>
        </div>
      </section>

      <section className="panel p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-mist/70 p-4">
            <p className="text-sm text-ink/55">候选池范围</p>
            <p className="mt-2 text-2xl font-semibold">{allFunds.length} 只基金</p>
          </div>
          <div className="rounded-2xl bg-mist/70 p-4">
            <p className="text-sm text-ink/55">当前默认筛选</p>
            <p className="mt-2 text-lg font-semibold">{activeTheme ?? "全部行业"}</p>
          </div>
          <div className="rounded-2xl bg-mist/70 p-4">
            <p className="text-sm text-ink/55">页面目标</p>
            <p className="mt-2 text-sm leading-7 text-ink/68">围绕行业主题和用户自选基金构建候选池，并支持进一步对比与观察。</p>
          </div>
        </div>
      </section>

      <FundDiscoveryClient funds={allFunds} queryState={queryState} />

      <RiskDisclaimer compact />
    </div>
  );
}
