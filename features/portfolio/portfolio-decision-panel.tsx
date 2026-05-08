"use client";

import { useEffect, useState } from "react";

import { STORAGE_KEYS } from "@/lib/storage";
import { PortfolioDecisionAssistView, PortfolioPosition } from "@/types";

type ApiState = "idle" | "loading" | "ready" | "error";

function readLocalPositions(): PortfolioPosition[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.portfolio);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} 元`;
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPlainNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(0);
}

function severityClass(severity: string) {
  if (severity === "high") return "border-rose-200 bg-rose-50 text-rose-800";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function decisionLevelClass(level?: string) {
  if (level === "趋势破坏") return "bg-rose-100 text-rose-800";
  if (level === "阶段转弱") return "bg-amber-100 text-amber-800";
  if (level === "短期波动") return "bg-orange-100 text-orange-800";
  if (level === "趋势仍有支撑") return "bg-emerald-100 text-emerald-800";
  return "bg-white text-pine";
}

function buildStrategyActions(view: PortfolioDecisionAssistView | null) {
  const valuation = view?.valuation;
  const diagnosis = view?.diagnosis;
  const candidates = view?.candidates ?? [];
  const enhancedRatio = valuation?.quality?.enhancedRatio ?? 0;
  const topTheme = diagnosis?.decisionThemeExposure?.[0] ?? diagnosis?.themeExposure?.[0];
  const largest = diagnosis?.largestPosition;
  const qdiiRatio = diagnosis?.qdiiRatio ?? 0;

  return [
    {
      title: "1. 先确认数据质量",
      status: enhancedRatio >= 80 ? "真实净值已匹配" : "先刷新真实净值",
      summary:
        enhancedRatio >= 80
          ? `真实净值覆盖约 ${formatPercent(enhancedRatio)}，可以继续看趋势、回撤、波动和替代基金。`
          : `真实净值覆盖约 ${formatPercent(enhancedRatio)}，建议先同步持仓并刷新基金快照，再判断是否需要调整。`
    },
    {
      title: "2. 看决策主题集中度",
      status: topTheme && topTheme.ratio >= 50 ? "集中度偏高" : "暂未过度集中",
      summary:
        topTheme && topTheme.ratio >= 50
          ? `${topTheme.theme} 占比约 ${formatPercent(topTheme.ratio)}，如果是美股/QDII底仓看趋势是否变坏；如果是半导体、CPO、AI等弹性主题，要额外看回撤和波动。`
          : topTheme
            ? `第一大主题为 ${topTheme.theme}，占比约 ${formatPercent(topTheme.ratio)}，暂未触发高集中度阈值。`
            : "暂无主题结构数据，请先生成策略。"
    },
    {
      title: "3. 看单只与海外暴露",
      status: largest && largest.ratio >= 25 ? "单只占比偏高" : qdiiRatio >= 40 ? "QDII 占比偏高" : "持续观察",
      summary:
        largest && largest.ratio >= 25
          ? `${largest.fundName} 占比约 ${formatPercent(largest.ratio)}，如果因申购限额无法继续买入，可以保留观察，但要设置趋势转弱和回撤阈值。`
          : qdiiRatio >= 40
            ? `QDII/海外相关占比约 ${formatPercent(qdiiRatio)}，偏长期持有时重点看海外趋势、汇率和估值，不被单日净值延迟误导。`
            : "当前未触发单只占比或 QDII 高暴露阈值，更新持仓后可重新生成策略。"
    },
    {
      title: "4. 看证据等级再行动",
      status: candidates.length ? `${candidates.length} 只候选` : "候选待生成",
      summary: candidates.length
        ? "先看决策等级和证据缺口，再用候选基金比较费率、回撤、波动、规模和持有成本。"
        : "策略需要基金、行业和持仓证据共同支持；证据缺口大时只做观察，不做强判断。"
    }
  ];
}

export function PortfolioDecisionPanel() {
  const [view, setView] = useState<PortfolioDecisionAssistView | null>(null);
  const [state, setState] = useState<ApiState>("idle");
  const [message, setMessage] = useState("");

  async function loadDecisionAssist() {
    setState("loading");
    try {
      const response = await fetch("/api/portfolio/decision-assist", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "组合策略读取失败");
      setView(payload);
      setState("ready");
      setMessage(payload.valuation ? "已读取最近一次持仓策略。" : "还没有策略结果，请先同步并生成。");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "组合策略读取失败");
    }
  }

  async function syncAndRefresh() {
    const positions = readLocalPositions();
    if (!positions.length) {
      setMessage("当前本地还没有持仓，请先在下方导入截图或手动录入。");
      return;
    }

    setState("loading");
    try {
      const saveResponse = await fetch("/api/portfolio/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions })
      });
      const savePayload = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(savePayload.message ?? "持仓同步失败");

      const refreshResponse = await fetch("/api/portfolio/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const refreshPayload = await refreshResponse.json();
      if (!refreshResponse.ok) throw new Error(refreshPayload.message ?? refreshPayload.detail ?? "持仓策略生成失败");

      setView(refreshPayload.decisionAssist);
      setState("ready");
      setMessage(`已同步 ${savePayload.savedCount ?? positions.length} 条持仓，并生成最新持仓调整策略。`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "持仓策略生成失败");
    }
  }

  useEffect(() => {
    void loadDecisionAssist();
  }, []);

  const valuation = view?.valuation;
  const diagnosis = view?.diagnosis;
  const tips = view?.tips ?? [];
  const candidates = view?.candidates ?? [];
  const longHoldReview = diagnosis?.longHoldReview ?? [];
  const highBetaReview = diagnosis?.highBetaReview ?? [];
  const trendWatchList = diagnosis?.trendWatchList ?? [];
  const industryEvidence = diagnosis?.industryEvidence ?? [];
  const methodology = diagnosis?.decisionMethodology;

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">Decision Assist</p>
          <h2 className="mt-2 text-2xl font-semibold">组合体检与持仓调整策略</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/65">
            点击右侧按钮后，系统会同步当前持仓到数据库，并基于最新盘后净值生成组合诊断、风险提示、候选观察基金和持仓调整策略。它不是交易指令，而是帮你决定下一步该重点复盘什么。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={syncAndRefresh} disabled={state === "loading"} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {state === "loading" ? "生成中..." : "生成持仓调整策略"}
          </button>
          <button type="button" onClick={loadDecisionAssist} disabled={state === "loading"} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold disabled:opacity-60">
            读取最近策略
          </button>
        </div>
      </div>

      {message ? <p className={`mt-4 text-sm ${state === "error" ? "text-rose-700" : "text-ink/60"}`}>{message}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <DecisionStat label="总持仓市值" value={formatMoney(valuation?.totalMarketValue)} />
        <DecisionStat label="昨日盈亏" value={formatMoney(valuation?.totalDayProfit)} tone={(valuation?.totalDayProfit ?? 0) >= 0 ? "positive" : "negative"} />
        <DecisionStat label="累计盈亏" value={formatMoney(valuation?.totalHoldingProfit)} tone={(valuation?.totalHoldingProfit ?? 0) >= 0 ? "positive" : "negative"} />
        <DecisionStat label="真实净值匹配" value={`${valuation?.enhancedCount ?? 0}/${valuation?.holdingCount ?? 0}`} />
      </div>
      <p className="mt-3 rounded-xl bg-mist/60 p-3 text-xs leading-6 text-ink/58">
        “真实净值匹配”表示系统已经把截图里的基金匹配到基金代码，并拉取到盘后净值/昨日涨跌。不是让你补钱，也不是补仓；如果低于 100%，说明还有基金只停留在截图金额，策略可信度会下降。
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl bg-mist/60 p-5">
          <p className="text-sm font-semibold">组合结构</p>
          <div className="mt-4 space-y-3">
            {(diagnosis?.decisionThemeExposure ?? diagnosis?.themeExposure ?? []).slice(0, 5).map((item) => (
              <div key={item.theme}>
                <div className="flex items-center justify-between text-sm">
                  <span>{item.theme}</span>
                  <span className="font-semibold">{formatPercent(item.ratio)}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white">
                  <div className="h-2 rounded-full bg-pine" style={{ width: `${Math.min(item.ratio, 100)}%` }} />
                </div>
              </div>
            ))}
            {!diagnosis?.themeExposure?.length ? <p className="text-sm text-ink/55">暂无结构诊断，请先同步持仓并生成策略。</p> : null}
          </div>
          <p className="mt-4 text-xs leading-6 text-ink/55">
            QDII/海外占比：{formatPercent(diagnosis?.qdiiRatio)}；最大单只占比：{formatPercent(diagnosis?.largestPosition?.ratio)}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
          <p className="text-sm font-semibold">决策辅助提示</p>
          <div className="mt-4 space-y-3">
            {tips.map((tip) => (
              <div key={tip.tipId} className={`rounded-xl border p-4 ${severityClass(tip.severity)}`}>
                <p className="font-semibold">{tip.title}</p>
                <p className="mt-2 text-sm leading-6">{tip.summary}</p>
              </div>
            ))}
            {!tips.length ? <p className="text-sm text-ink/55">暂无提示。生成策略后会显示数据质量、集中度、短期热度和风险复盘信息。</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-ink p-5 text-white">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Strategy</p>
            <h3 className="mt-2 text-2xl font-semibold">持仓调整策略建议</h3>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-white/68">
            策略触发方式：先更新/导入持仓截图，再点击“生成持仓调整策略”。下面是可执行的复盘顺序，不是买卖指令。
          </p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {buildStrategyActions(view).map((action) => (
            <div key={action.title} className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10">
              <p className="text-sm font-semibold text-white">{action.title}</p>
              <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">{action.status}</p>
              <p className="mt-3 text-sm leading-6 text-white/70">{action.summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-ink/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold">策略口径说明</p>
            <p className="mt-2 text-sm leading-6 text-ink/62">
              {methodology?.summary ?? "本策略优先作为复盘辅助，不用单日涨跌直接判断趋势破坏。"}
            </p>
          </div>
          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
            {methodology?.version ?? "portfolio-decision-v2"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {Object.entries(methodology?.levels ?? {}).map(([level, summary]) => (
            <div key={level} className="rounded-xl bg-mist/55 p-4">
              <p className="font-semibold">{level}</p>
              <p className="mt-2 text-xs leading-5 text-ink/58">{summary}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <StrategyReviewBlock
          title="长期持有资产复盘"
          subtitle="美股、QDII、海外成长等更适合看中期趋势是否变坏。"
          emptyText="暂无明显长期持有资产，或还没有匹配到 QDII/海外基金。"
          items={longHoldReview}
        />
        <StrategyReviewBlock
          title="高波动主题控仓复盘"
          subtitle="半导体、CPO、AI、北证、有色等更适合设置波动和减仓阈值。"
          emptyText="暂无高波动主题识别结果。"
          items={highBetaReview}
        />
      </div>

      {trendWatchList.length ? (
        <div className="mt-6 rounded-2xl bg-rose-50 p-5 ring-1 ring-rose-100">
          <p className="text-sm font-semibold text-rose-800">趋势转弱观察清单</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {trendWatchList.slice(0, 6).map((item) => (
              <StrategyReviewCard key={`${item.fundCode}-${item.fundName}`} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      {industryEvidence.length ? (
        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-ink/10">
          <p className="text-sm font-semibold">行业/主题证据</p>
          <p className="mt-2 text-xs leading-5 text-ink/55">
            这里只展示当前策略真正用到的行业证据。行业证据缺失时，系统会降低置信度，避免只靠短期涨跌做强判断。
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {industryEvidence.map((item) => (
              <div key={item.industryId ?? item.industryName} className="rounded-xl bg-mist/55 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.industryName ?? item.industryId}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-pine">{item.label ?? item.evidenceStatus}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-2 py-1">趋势 {formatPlainNumber(item.trendScore)}</span>
                  <span className="rounded-full bg-white px-2 py-1">资金 {formatPlainNumber(item.capitalScore)}</span>
                  <span className="rounded-full bg-white px-2 py-1">估值 {formatPlainNumber(item.valuationScore)}</span>
                  <span className="rounded-full bg-white px-2 py-1">20日 {formatPercent(item.performance20d)}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-ink/58">{item.summary ?? "行业证据已接入，但摘要待补充。"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-ink/10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">候选观察基金</p>
          <span className="text-xs text-ink/50">同主题对照，不等于买入建议</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((candidate) => (
            <div key={candidate.candidateId} className="rounded-xl bg-mist/50 p-4">
              <p className="font-semibold">{candidate.fundName}</p>
              <p className="mt-1 text-xs text-ink/55">{candidate.fundCode} / {candidate.metrics.theme ?? "未标注主题"}</p>
              <p className="mt-3 text-sm leading-6 text-ink/65">{candidate.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-2 py-1">昨日 {formatPercent(candidate.metrics.return1d)}</span>
                <span className="rounded-full bg-white px-2 py-1">近 3 月 {formatPercent(candidate.metrics.return3m)}</span>
                <span className="rounded-full bg-white px-2 py-1">回撤 {formatPercent(candidate.metrics.maxDrawdown)}</span>
              </div>
            </div>
          ))}
          {!candidates.length ? <p className="text-sm text-ink/55">暂无候选基金。持仓基金匹配到真实主题后，系统会从同主题中挑出对照观察对象。</p> : null}
        </div>
      </div>

      <p className="mt-4 text-xs leading-6 text-ink/50">
        {view?.disclaimer ?? "本模块仅用于个人持仓复盘、候选观察和风险提示，不构成买入、卖出或收益承诺。"}
      </p>
    </section>
  );
}

function StrategyReviewBlock({
  title,
  subtitle,
  emptyText,
  items
}: {
  title: string;
  subtitle: string;
  emptyText: string;
  items: NonNullable<PortfolioDecisionAssistView["diagnosis"]>["longHoldReview"];
}) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-xs leading-5 text-ink/55">{subtitle}</p>
      <div className="mt-4 space-y-3">
        {items?.length ? items.slice(0, 5).map((item) => <StrategyReviewCard key={`${item.fundCode}-${item.fundName}`} item={item} />) : <p className="text-sm text-ink/55">{emptyText}</p>}
      </div>
    </div>
  );
}

function StrategyReviewCard({ item }: { item: NonNullable<NonNullable<PortfolioDecisionAssistView["diagnosis"]>["longHoldReview"]>[number] }) {
  const level = item.decisionLevel ?? item.trendLabel ?? "继续观察";

  return (
    <div className="rounded-xl bg-mist/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{item.fundName}</p>
          <p className="mt-1 text-xs text-ink/50">
            {item.fundCode ?? "未匹配代码"} / {item.decisionTheme ?? item.theme ?? "未识别主题"}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${decisionLevelClass(level)}`}>{level}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-white px-2 py-1">仓位 {formatPercent(item.positionRatio)}</span>
        <span className="rounded-full bg-white px-2 py-1">昨日 {formatPercent(item.return1d)}</span>
        <span className="rounded-full bg-white px-2 py-1">近 1 月 {formatPercent(item.return1m)}</span>
        <span className="rounded-full bg-white px-2 py-1">近 3 月 {formatPercent(item.return3m)}</span>
        <span className="rounded-full bg-white px-2 py-1">回撤 {formatPercent(item.maxDrawdown)}</span>
        <span className="rounded-full bg-white px-2 py-1">波动 {formatPercent(item.volatility)}</span>
        <span className="rounded-full bg-white px-2 py-1">置信度 {item.confidence ?? "--"}</span>
        <span className="rounded-full bg-white px-2 py-1">评分 {formatPlainNumber(item.decisionScore)}</span>
        <span className="rounded-full bg-white px-2 py-1">买入观察 {formatPlainNumber(item.buyWatchScore)}</span>
      </div>
      {item.operationSignal ? (
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-ink/8">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${decisionLevelClass(item.decisionLevel)}`}>
              {item.operationSignal}
            </span>
            <span className="text-xs text-ink/50">强度：{item.signalStrength ?? "--"}</span>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink/62">{item.operationReason}</p>
        </div>
      ) : null}
      {item.assetIntent ? <p className="mt-3 text-xs leading-5 text-ink/55">{item.assetIntent}</p> : null}
      {item.evidenceSummary?.length ? (
        <div className="mt-3 space-y-1">
          {item.evidenceSummary.slice(0, 3).map((evidence) => (
            <p key={evidence} className="rounded-lg bg-white/70 px-3 py-2 text-xs leading-5 text-ink/65">
              {evidence}
            </p>
          ))}
        </div>
      ) : null}
      {item.missingEvidence?.length ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          证据缺口：{item.missingEvidence.slice(0, 3).join("、")}。缺口越多，结论越偏观察，不做强判断。
        </p>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-ink/65">{item.action}</p>
    </div>
  );
}

function DecisionStat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-ink/10">
      <p className="text-sm text-ink/55">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "positive" ? "text-pine" : tone === "negative" ? "text-rose-700" : ""}`}>
        {value}
      </p>
    </div>
  );
}
