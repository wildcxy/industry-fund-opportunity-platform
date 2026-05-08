import Link from "next/link";

import { PortfolioClient } from "@/features/portfolio/portfolio-client";
import { PortfolioDecisionPanel } from "@/features/portfolio/portfolio-decision-panel";
import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { getFundListView } from "@/lib/adapters/fund";

export default async function PortfolioPage() {
  const funds = await getFundListView();

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <p className="eyebrow">My Portfolio</p>
        <h1 className="mt-2 text-4xl font-semibold">我的持仓与每日收益</h1>
        <p className="mt-4 max-w-3xl leading-8 text-ink/70">
          录入自己的基金持仓份额和成本净值后，系统会用已采集的最新净值估算当日收益、累计收益和数据缺口。当前版本只做本地持仓簿，不连接真实交易账户。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/funds" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
            去基金发现页添加基金
          </Link>
          <Link href="/compare" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold">
            查看基金对比
          </Link>
        </div>
      </section>

      <PortfolioClient funds={funds} />

      <PortfolioDecisionPanel />

      <RiskDisclaimer compact />
    </div>
  );
}
