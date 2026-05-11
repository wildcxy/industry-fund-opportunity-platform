"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ManualStrategyAssumptionPanel } from "@/components/manual-strategy-assumption-panel";
import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { isDemoMode } from "@/lib/data-mode";
import { generateWatchlistStrategyState, generateWatchlistStrategyStateMap, GenerateWatchlistStrategyStateInput } from "@/lib/strategy";
import {
  buildWatchlistItems,
  manualAssumptionTargetKeys,
  manualAssumptionToStrategyRef,
  mergeWatchlistStrategyStates,
  readPortfolioPositions,
  readManualStrategyAssumptionsForTarget,
  readManualStrategyAssumptions,
  readWatchlistStrategyStateMap,
  readWatchlistIds,
  readWatchlistItems,
  removeWatchlistStrategyState,
  STORAGE_KEYS,
  writeWatchlistStrategyState,
  writeWatchlistStrategyStateMap,
  writeJsonArray
} from "@/lib/storage";
import { funds } from "@/mock/data";
import {
  FundListItem,
  PortfolioPosition,
  SystemStrategyConclusionResult,
  SystemStrategyConclusion,
  WatchlistItem,
  WatchlistStrategyMissingEvidence,
  WatchlistStrategyStage
} from "@/types";

type SortMode = "latest" | "name";

type StrategySection = {
  stage: WatchlistStrategyStage;
  title: string;
  description: string;
};

const STRATEGY_SECTIONS: StrategySection[] = [
  {
    stage: "watching",
    title: "普通观察",
    description: "继续跟踪基金与主题证据，暂不进入分批计划判断。"
  },
  {
    stage: "scoring",
    title: "评分中",
    description: "正在补充策略评分、证据完整度和风险校验。"
  },
  {
    stage: "buy_plan_draft",
    title: "计划草稿",
    description: "仅表示可进入分批计划草稿复核，不代表系统会执行任何操作。"
  },
  {
    stage: "paused",
    title: "暂停观察",
    description: "风险或证据条件暂不支持继续推进计划。"
  },
  {
    stage: "removed",
    title: "移出池",
    description: "策略优先级下降或条件失效，仅保留必要复盘线索。"
  }
];

const STAGE_LABELS: Record<WatchlistStrategyStage, string> = {
  watching: "普通观察",
  scoring: "评分中",
  buy_plan_draft: "计划草稿",
  paused: "暂停观察",
  removed: "移出池"
};

const RISK_LABELS = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
} as const;

const EVENT_IMPACT_LABELS = {
  long_term_support: "长期支撑",
  risk_or_invalidation: "风险/失效",
  short_term_noise: "短期扰动",
  mixed: "多空混合",
  insufficient_evidence: "证据不足"
} as const;

const EVENT_SOURCE_LABELS = {
  authorized_api: "授权 API",
  manual_import: "手动导入",
  internal_tag: "内部标签",
  mock: "Mock 样例"
} as const;

const EVENT_FRESHNESS_LABELS = {
  fresh: "新近",
  watch: "观察",
  stale: "过期"
} as const;

const SYSTEM_CONCLUSION_LABELS: Record<SystemStrategyConclusionResult, string> = {
  system_plan_draft_ready: "系统草稿条件满足",
  system_watch_continue: "系统继续观察",
  system_risk_blocked: "系统风险阻断",
  system_need_more_evidence: "系统证据不足"
};

const MISSING_EVIDENCE_LABELS: Record<WatchlistStrategyMissingEvidence["code"], string> = {
  fetch_failed: "同步失败",
  source_unavailable: "来源暂缺",
  stale_data: "数据过期",
  manual_needed: "需要手动补充",
  not_applicable: "不适用"
};

function SystemConclusionPanel({ conclusion }: { conclusion?: SystemStrategyConclusion }) {
  if (!conclusion) return null;
  const blockingRules = conclusion.triggeredRules.filter((rule) => !rule.passed);

  return (
    <div className="mt-3 rounded-lg bg-white px-3 py-2 ring-1 ring-ink/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-mist px-2 py-1 font-semibold text-pine">System conclusion</span>
        <span>{SYSTEM_CONCLUSION_LABELS[conclusion.conclusionResult]}</span>
        <span>As of {conclusion.conclusionTime}</span>
      </div>
      <p className="mt-2 text-ink/62">{conclusion.recommendationReason}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <p className="rounded-lg bg-mist/60 px-3 py-2">Data quality: {conclusion.dataQuality}</p>
        <p className="rounded-lg bg-mist/60 px-3 py-2">Valuation: {conclusion.valuationStatus ?? "not linked"}</p>
        <p className="rounded-lg bg-mist/60 px-3 py-2">Estimated value: {conclusion.estimatedValue ?? "pending"}</p>
        <p className="rounded-lg bg-mist/60 px-3 py-2">Estimated profit: {conclusion.estimatedProfit ?? "pending"}</p>
      </div>
      {conclusion.relatedAiEvidenceIds.length ? <p className="mt-2 text-ink/55">AI evidence refs: {conclusion.relatedAiEvidenceIds.join(", ")}</p> : null}
      {conclusion.riskVetoes.length ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-800">Risk vetoes: {conclusion.riskVetoes.join("; ")}</p> : null}
      {blockingRules.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-800">
          {blockingRules.slice(0, 4).map((rule) => (
            <li key={rule.ruleId}>{rule.label}: {rule.message}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2 text-ink/55">Pause: {conclusion.pauseConditions[0] ?? "No extra pause condition."}</p>
      <p className="mt-1 text-ink/55">Invalidation: {conclusion.invalidationConditions[0] ?? "No extra invalidation condition."}</p>
      <p className="mt-2 text-ink/48">{conclusion.note}</p>
    </div>
  );
}

type WatchlistSummaryResponse = {
  snapshot?: {
    items?: Array<{
      itemType: "industry" | "fund";
      itemId: string;
      fundCode?: string | null;
      statusLabel: string;
      latestChange: string;
      updatedAt?: string;
    }>;
  };
};

function sortItems(items: WatchlistItem[], sortMode: SortMode) {
  if (sortMode === "name") {
    return [...items].sort((left, right) => left.displayName.localeCompare(right.displayName, "zh-CN"));
  }

  return [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function portfolioWatchIds(positions: PortfolioPosition[]) {
  return positions.flatMap((position) => {
    const ids = [position.positionId];
    if (position.fundCode) {
      ids.push(position.fundCode, `code-${position.fundCode}`, `user-${position.fundCode}`);
    }
    return ids;
  });
}

function watchlistItemKey(item: WatchlistItem) {
  const code = item.fundCode ?? item.itemId.match(/^(?:code|user)-(\d{6})$/)?.[1] ?? (/^\d{6}$/.test(item.itemId) ? item.itemId : null);
  return item.itemType === "fund" && code ? `fund:${code}` : `${item.itemType}:${item.itemId}`;
}

function watchlistAliases(item: WatchlistItem) {
  const aliases = new Set([item.itemId]);
  if (item.fundCode) {
    aliases.add(item.fundCode);
    aliases.add(`code-${item.fundCode}`);
    aliases.add(`user-${item.fundCode}`);
  }
  return aliases;
}

function fundCodeFromItem(item: WatchlistItem) {
  return item.fundCode ?? item.itemId.match(/^(?:code|user|fund:|top10-)?(\d{6})$/)?.[1] ?? (/^\d{6}$/.test(item.itemId) ? item.itemId : null);
}

function fallbackFundForItem(item: WatchlistItem): GenerateWatchlistStrategyStateInput["fund"] {
  const code = fundCodeFromItem(item);
  return {
    fundId: item.itemId,
    ...(code ? { fundCode: code } : {}),
    fundName: item.displayName,
    fundType: "主动基金",
    theme: "自选基金",
    dataCompleteness: "partial",
    missingMetrics: ["return1m", "return3m", "return6m", "maxDrawdown", "volatility", "aum", "feeRate"],
    metricUpdatedAt: item.updatedAt
  };
}

function findFundForItem(item: WatchlistItem): GenerateWatchlistStrategyStateInput["fund"] {
  if (!isDemoMode()) {
    return fallbackFundForItem(item);
  }

  const code = fundCodeFromItem(item);
  return funds.find((fund) => fund.fundId === item.itemId || fund.fundCode === code) ?? fallbackFundForItem(item);
}

function defaultPortfolioContext(): GenerateWatchlistStrategyStateInput["portfolioContext"] | undefined {
  if (!isDemoMode()) {
    return undefined;
  }

  return {
    themeExposurePercent: 9,
    fundExposurePercent: 0,
    qdiiExposurePercent: 4,
    maxThemeExposurePercent: 25,
    maxFundExposurePercent: 12,
    maxQdiiExposurePercent: 20
  };
}

function manualAssumptionIndex() {
  const index = new Map<string, NonNullable<ReturnType<typeof manualAssumptionToStrategyRef>>[]>();
  readManualStrategyAssumptions().forEach((assumption) => {
    const ref = manualAssumptionToStrategyRef(assumption);
    if (!ref) return;
    manualAssumptionTargetKeys(assumption).forEach((key) => {
      index.set(key, [...(index.get(key) ?? []), ref]);
    });
  });
  return index;
}

function manualAssumptionsForFund(fund: GenerateWatchlistStrategyStateInput["fund"], assumptionIndex?: ReturnType<typeof manualAssumptionIndex>) {
  const refsById = new Map<string, NonNullable<ReturnType<typeof manualAssumptionToStrategyRef>>>();
  if (assumptionIndex) {
    manualAssumptionTargetKeys({
      targetType: "fund",
      fundId: fund.fundId,
      fundCode: fund.fundCode
    }).forEach((key) => {
      assumptionIndex.get(key)?.forEach((assumption) => {
        refsById.set(assumption.assumptionId, assumption);
      });
    });
  } else {
    readManualStrategyAssumptionsForTarget({
      targetType: "fund",
      fundId: fund.fundId,
      fundCode: fund.fundCode
    })
      .map(manualAssumptionToStrategyRef)
      .filter((assumption): assumption is NonNullable<typeof assumption> => Boolean(assumption))
      .forEach((assumption) => {
        refsById.set(assumption.assumptionId, assumption);
      });
  }
  return Array.from(refsById.values());
}

function inputAsOfDate(item: WatchlistItem, fund: GenerateWatchlistStrategyStateInput["fund"]) {
  return fund.metricTradeDate ?? fund.metricUpdatedAt?.slice(0, 10) ?? item.updatedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
}

function buildStrategyInput(item: WatchlistItem, assumptionIndex?: ReturnType<typeof manualAssumptionIndex>): GenerateWatchlistStrategyStateInput | null {
  if (item.itemType !== "fund") return null;
  const fund = findFundForItem(item);
  return {
    fund,
    industryEventSummary: item.industryEventSummary,
    portfolioContext: defaultPortfolioContext(),
    manualAssumptions: manualAssumptionsForFund(fund, assumptionIndex),
    asOfDate: inputAsOfDate(item, fund)
  };
}

function dedupeWatchlistItems(items: WatchlistItem[]) {
  const unique = new Map<string, WatchlistItem>();
  items.forEach((item) => {
    const key = watchlistItemKey(item);
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  });
  return Array.from(unique.values());
}

function buildPortfolioFallbackItems(positions: PortfolioPosition[], existingKeys: Set<string>): WatchlistItem[] {
  return positions
    .filter((position) => {
      const key = position.fundCode ? `fund:${position.fundCode}` : `fund:${position.positionId}`;
      return !existingKeys.has(key);
    })
    .map<WatchlistItem>((position) => ({
      itemId: position.fundCode ? `user-${position.fundCode}` : position.positionId,
      itemType: "fund",
      displayName: position.fundName,
      statusLabel: position.fundCode ? "持仓观察" : "基金待匹配",
      latestChange: position.fundCode
        ? `${position.fundName} 已来自你的持仓，等待盘后快照补充昨日涨跌、净值和主题摘要。`
        : `${position.fundName} 已来自你的持仓截图，但基金代码仍待匹配。`,
      updatedAt: position.updatedAt ?? position.createdAt,
      fundCode: position.fundCode,
      entryLink: position.fundCode ? `/funds/${position.fundCode}` : "/portfolio"
    }));
}

function strategyStage(item: WatchlistItem): WatchlistStrategyStage {
  return item.strategyState?.stage ?? "watching";
}

function groupFundItems(items: WatchlistItem[]) {
  const itemsByStage = new Map<WatchlistStrategyStage, WatchlistItem[]>();
  items.forEach((item) => {
    const stage = strategyStage(item);
    itemsByStage.set(stage, [...(itemsByStage.get(stage) ?? []), item]);
  });
  return STRATEGY_SECTIONS.map((section) => ({
    ...section,
    items: itemsByStage.get(section.stage) ?? []
  }));
}

function StrategyStateSummary({ item }: { item: WatchlistItem }) {
  const state = item.strategyState;

  if (!state) {
    return (
      <div className="mt-3 rounded-xl bg-mist/60 px-4 py-3 text-xs leading-5 text-ink/58">
        暂未生成策略评分；当前仅作为普通观察项，不进入分批计划判断。
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-mist/60 px-4 py-3 text-xs leading-5 text-ink/65">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-pine">{STAGE_LABELS[state.stage]}</span>
        {typeof state.strategyScore === "number" ? <span className="rounded-full bg-white px-2 py-1">策略分 {state.strategyScore}</span> : null}
        {state.riskLevel ? <span className="rounded-full bg-white px-2 py-1">{RISK_LABELS[state.riskLevel]}</span> : null}
        {state.confidence ? <span className="rounded-full bg-white px-2 py-1">置信度 {state.confidence}</span> : null}
      </div>
      {state.reason ? <p className="mt-2">{state.reason}</p> : null}
      {state.nextAction ? <p className="mt-2 font-medium text-ink/75">下一步：{state.nextAction}</p> : null}
      {state.riskVetoes?.length ? <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-rose-800">风险 veto：{state.riskVetoes.join("；")}</p> : null}
      {state.systemConclusionResult ? (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 font-medium text-ink/70">系统结论：{SYSTEM_CONCLUSION_LABELS[state.systemConclusionResult]}</p>
      ) : null}
      <SystemConclusionPanel conclusion={state.systemConclusion} />
      {state.missingEvidence?.length ? (
        <div className="mt-3 space-y-2 rounded-lg bg-amber-50 px-3 py-3 text-amber-900">
          <p className="font-semibold">缺失证据</p>
          {state.missingEvidence.map((evidence) => (
            <div key={`${evidence.code}-${evidence.field}`} className="rounded-lg bg-white/70 px-3 py-2">
              <p className="font-medium">
                {MISSING_EVIDENCE_LABELS[evidence.code]} · {evidence.field}
              </p>
              <p className="mt-1">{evidence.message}</p>
              <p className="mt-1 text-amber-800">下一步：{evidence.suggestedAction}</p>
              {evidence.code === "manual_needed" ? (
                <Link href="/portfolio" className="mt-2 inline-flex text-xs font-semibold text-pine">
                  去持仓补充
                </Link>
              ) : null}
              {evidence.code === "source_unavailable" ? (
                <Link href="/funds" className="mt-2 inline-flex text-xs font-semibold text-pine">
                  去基金数据入口
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {state.manualAssumptionRefs?.length ? (
        <div className="mt-3 rounded-lg bg-white px-3 py-2 ring-1 ring-ink/10">
          <p className="font-semibold text-ink/70">用户假设引用</p>
          {state.manualAssumptionRefs.map((assumption) => (
            <p key={assumption.assumptionId} className="mt-1 text-ink/62">
              {assumption.thesisTitle ? `${assumption.thesisTitle}：` : ""}
              {assumption.hypothesis} 失效条件：{assumption.invalidationCondition}
            </p>
          ))}
        </div>
      ) : null}
      {state.backtestSummary ? (
        <div className="mt-3 rounded-lg bg-white px-3 py-2 ring-1 ring-ink/10">
          <p className="font-semibold text-ink/70">历史验证摘要</p>
          <p className="mt-1 text-ink/62">
            {state.backtestSummary.sampleStartDate} 至 {state.backtestSummary.sampleEndDate}，基准：{state.backtestSummary.benchmark}，最大回撤：
            {state.backtestSummary.maxDrawdownPercent ?? "待补充"}%。
          </p>
          <p className="mt-1 text-ink/55">
            Return: {state.backtestSummary.returnPercent ?? "pending"}%; benchmark: {state.backtestSummary.benchmarkReturnPercent ?? "pending"}%; volatility: {state.backtestSummary.volatilityPercent ?? "pending"}%; sample size: {state.backtestSummary.sampleSize ?? "pending"}; overfit risk: {state.backtestSummary.overfitRisk}.
          </p>
          <p className="mt-1 text-ink/55">Fee assumption: {state.backtestSummary.feeAssumption}</p>
          {state.backtestSummary.limitations.length ? (
            <ul className="mt-1 list-disc space-y-1 pl-4 text-ink/55">
              {state.backtestSummary.limitations.slice(0, 3).map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-1 text-ink/55">{state.backtestSummary.conclusion}</p>
        </div>
      ) : null}
      {state.nextReviewDate ? <p className="mt-2 text-ink/48">下次复盘：{state.nextReviewDate}</p> : null}
    </div>
  );
}

function IndustryEventSummary({ item }: { item: WatchlistItem }) {
  const summary = item.industryEventSummary;
  const meta = item.industryEventMeta;
  if (!summary) return null;

  return (
    <div className="mt-3 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-ink/62 ring-1 ring-ink/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-mist px-2 py-1 font-semibold text-pine">
          事件：{EVENT_IMPACT_LABELS[summary.impactDirection]}
        </span>
        <span>置信度 {summary.confidence}</span>
        <span>支撑 {summary.supportCount} / 风险 {summary.riskCount}</span>
        <span>截至 {summary.asOfDate}</span>
      </div>
      {meta ? (
        <div className="mt-2 flex flex-wrap gap-2 text-ink/55">
          <span>事件 {meta.eventCount} 条</span>
          {meta.latestPublishedAt ? <span>最新发布 {meta.latestPublishedAt}</span> : null}
          {meta.sourceTypes.length ? <span>来源 {meta.sourceTypes.map((type) => EVENT_SOURCE_LABELS[type]).join(" / ")}</span> : null}
          {meta.freshness.length ? <span>新鲜度 {meta.freshness.map((value) => EVENT_FRESHNESS_LABELS[value]).join(" / ")}</span> : null}
        </div>
      ) : null}
      {meta?.sourceDescription ? <p className="mt-2 text-ink/55">{meta.sourceDescription}</p> : null}
      <p className="mt-2">{summary.riskControlHint}</p>
      {summary.weakeningEvidence.length ? <p className="mt-1 text-rose-700">风险线索：{summary.weakeningEvidence[0]}</p> : null}
    </div>
  );
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [strategyRefreshMessage, setStrategyRefreshMessage] = useState("");
  const [isRefreshingFunds, setIsRefreshingFunds] = useState(false);
  const [isRefreshingStrategy, setIsRefreshingStrategy] = useState(false);
  const [refreshingStrategyItemId, setRefreshingStrategyItemId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      const portfolioPositions = readPortfolioPositions();
      const ids = Array.from(new Set([...readWatchlistIds(), ...portfolioWatchIds(portfolioPositions)]));
      if (!ids.length) {
        if (!cancelled) {
          setItems([]);
        }
        return;
      }

      try {
        const response = await fetch("/api/watchlist-summary", { cache: "no-store" });
        const payload = (await response.json()) as WatchlistSummaryResponse;
        const merged = mergeWatchlistStrategyStates(buildWatchlistItems(ids, payload.snapshot?.items ?? []));
        const existingKeys = new Set(merged.map(watchlistItemKey));
        const withPortfolioFallback = dedupeWatchlistItems([...merged, ...buildPortfolioFallbackItems(portfolioPositions, existingKeys)]);

        if (!cancelled) {
          setItems(withPortfolioFallback);
        }
      } catch {
        if (!cancelled) {
          const fallback = readWatchlistItems();
          const existingKeys = new Set(fallback.map(watchlistItemKey));
          setItems(dedupeWatchlistItems([...fallback, ...buildPortfolioFallbackItems(portfolioPositions, existingKeys)]));
        }
      }
    }

    loadItems();

    return () => {
      cancelled = true;
    };
  }, []);

  function removeItem(itemId: string) {
    const target = items.find((item) => item.itemId === itemId);
    const aliases = target ? watchlistAliases(target) : new Set([itemId]);
    const targetKey = target ? watchlistItemKey(target) : null;
    const nextIds = readWatchlistIds().filter((id) => !aliases.has(id));
    writeJsonArray(STORAGE_KEYS.watchlist, nextIds);
    if (target?.itemType === "fund") {
      removeWatchlistStrategyState(target);
    }
    setItems((current) => current.filter((item) => item.itemId !== itemId && (!targetKey || watchlistItemKey(item) !== targetKey)));
  }

  async function refreshWatchFunds() {
    const fundCodes = Array.from(
      new Set(
        items
          .filter((item) => item.itemType === "fund")
          .map((item) => item.fundCode ?? item.itemId.replace(/^user-/, "").replace(/^code-/, ""))
          .filter((code) => /^\d{6}$/.test(code))
      )
    );

    if (!fundCodes.length) {
      setRefreshMessage("当前观察基金里还没有可刷新代码；请先在持仓页执行“匹配并拉取真实数据”。");
      return;
    }

    setIsRefreshingFunds(true);
    setRefreshMessage(`正在刷新 ${fundCodes.length} 只观察基金的盘后快照...`);
    try {
      const response = await fetch("/api/funds/refresh-visible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fundCodes })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "观察基金刷新失败");
      }
      setRefreshMessage(`刷新完成：成功 ${payload.successCount} 只，失败 ${payload.failedCount} 只。刷新后点基金名称可进入详情复盘。`);
    } catch (error) {
      setRefreshMessage(error instanceof Error ? error.message : "观察基金刷新失败");
    } finally {
      setIsRefreshingFunds(false);
    }
  }

  function refreshStrategyStateForItems(targetItems: WatchlistItem[]) {
    const fundItemsToRefresh = targetItems.filter((item) => item.itemType === "fund");
    if (!fundItemsToRefresh.length) {
      setStrategyRefreshMessage("当前没有基金观察项可生成策略状态；行业观察只用于机会跟踪。");
      return;
    }

    const assumptions = manualAssumptionIndex();
    const inputs = fundItemsToRefresh.map((item) => buildStrategyInput(item, assumptions)).filter((input): input is GenerateWatchlistStrategyStateInput => Boolean(input));
    if (!inputs.length) {
      setStrategyRefreshMessage("当前基金观察项缺少可识别基金代码或名称，暂时只能保留普通观察。");
      return;
    }

    setIsRefreshingStrategy(true);
    try {
      const nextStateMap = {
        ...readWatchlistStrategyStateMap(),
        ...generateWatchlistStrategyStateMap(inputs)
      };
      writeWatchlistStrategyStateMap(nextStateMap);
      setItems((current) => mergeWatchlistStrategyStates(current, nextStateMap));

      const generatedStates = inputs.map((input) => nextStateMap[input.fund.fundId]).filter(Boolean);
      const activeCount = generatedStates.filter((state) => state.stage === "scoring" || state.stage === "buy_plan_draft" || state.stage === "paused").length;
      setStrategyRefreshMessage(
        activeCount > 0
          ? `已生成 ${generatedStates.length} 个基金策略状态，其中 ${activeCount} 个进入评分中、计划草稿或暂停观察。`
          : `已生成 ${generatedStates.length} 个基金策略状态，本轮没有基金满足评分中、计划草稿或暂停阈值，全部保持普通观察。`
      );
    } catch (error) {
      setStrategyRefreshMessage(error instanceof Error ? error.message : "策略状态生成失败。");
    } finally {
      setIsRefreshingStrategy(false);
      setRefreshingStrategyItemId(null);
    }
  }

  function refreshSingleStrategyState(item: WatchlistItem) {
    const input = buildStrategyInput(item, manualAssumptionIndex());
    if (!input) {
      setStrategyRefreshMessage("该观察项不是基金，不能进入分批计划策略状态。");
      return;
    }

    setIsRefreshingStrategy(true);
    setRefreshingStrategyItemId(item.itemId);
    try {
      const state = generateWatchlistStrategyState(input);
      writeWatchlistStrategyState(item.itemId, state, input.fund.fundCode);
      const nextStateMap = readWatchlistStrategyStateMap();
      setItems((current) => mergeWatchlistStrategyStates(current, nextStateMap));
      setStrategyRefreshMessage(`${item.displayName} 的策略状态已刷新为：${STAGE_LABELS[state.stage]}。`);
    } catch (error) {
      setStrategyRefreshMessage(error instanceof Error ? error.message : "单只基金策略状态生成失败。");
    } finally {
      setIsRefreshingStrategy(false);
      setRefreshingStrategyItemId(null);
    }
  }

  const { sortedItems, industryItems, fundItems, fundSections } = useMemo(() => {
    const nextSortedItems = sortItems(items, sortMode);
    const nextIndustryItems: WatchlistItem[] = [];
    const nextFundItems: WatchlistItem[] = [];
    nextSortedItems.forEach((item) => {
      if (item.itemType === "industry") {
        nextIndustryItems.push(item);
      } else {
        nextFundItems.push(item);
      }
    });

    return {
      sortedItems: nextSortedItems,
      industryItems: nextIndustryItems,
      fundItems: nextFundItems,
      fundSections: groupFundItems(nextFundItems).filter((section) => section.items.length > 0)
    };
  }, [items, sortMode]);
  const buyPlanDraftCount = fundSections.find((section) => section.stage === "buy_plan_draft")?.items.length ?? 0;
  const pausedCount = fundSections.find((section) => section.stage === "paused")?.items.length ?? 0;

  return (
    <div className="space-y-8">
      <section className="panel p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">My Watchlist</p>
            <h1 className="mt-2 text-4xl font-semibold">我的观察</h1>
            <p className="mt-4 max-w-3xl leading-8 text-ink/70">
              该页面承接首页、行业详情页和基金发现页的“加入观察”动作。当前版本使用浏览器本地持久化记录你的观察池，并结合后端盘后摘要补充最近变化。
            </p>
          </div>
          <label className="rounded-2xl bg-mist/70 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">排序方式</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none"
            >
              <option value="latest">按最近更新时间</option>
              <option value="name">按名称</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refreshStrategyStateForItems(items)}
              disabled={isRefreshingStrategy}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshingStrategy && !refreshingStrategyItemId ? "生成中..." : "生成/刷新策略状态"}
            </button>
            <button
              type="button"
              onClick={() => void refreshWatchFunds()}
              disabled={isRefreshingFunds}
              className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRefreshingFunds ? "刷新中..." : "刷新观察基金数据"}
            </button>
          </div>
        </div>
        {refreshMessage ? <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-ink/65 ring-1 ring-ink/10">{refreshMessage}</p> : null}
        {strategyRefreshMessage ? <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-ink/65 ring-1 ring-ink/10">{strategyRefreshMessage}</p> : null}
      </section>

      {sortedItems.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="text-lg font-semibold">你还没有加入观察项</p>
          <p className="mt-3 text-sm text-ink/65">可以从首页或基金页添加行业和基金，形成持续跟踪入口。</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              前往首页
            </Link>
            <Link href="/funds" className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold">
              前往基金发现
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-3">
            <div className="panel p-5">
              <p className="text-sm text-ink/55">观察中的行业</p>
              <p className="mt-3 text-4xl font-semibold">{industryItems.length}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-ink/55">观察中的基金</p>
              <p className="mt-3 text-4xl font-semibold">{fundItems.length}</p>
            </div>
            <div className="panel p-5">
              <p className="text-sm text-ink/55">计划草稿 / 暂停</p>
              <p className="mt-3 text-sm leading-7 text-ink/68">
                当前有 {buyPlanDraftCount} 个计划草稿、{pausedCount} 个暂停观察；所有计划只保留为系统草稿和用户手动记录，不会自动执行。
              </p>
            </div>
          </section>

          <section className="panel p-6">
            <p className="eyebrow">Next Focus</p>
            <h2 className="mt-2 text-2xl font-semibold">待跟踪机会提示</h2>
            <p className="mt-4 text-sm leading-7 text-ink/68">
              建议优先跟踪“机会增强”标签行业与近 20 日表现改善的基金，并结合基金对比页观察收益、波动、费率与持仓风格之间的平衡。
            </p>
          </section>

          <section className="space-y-6">
            <div>
              <p className="eyebrow">Industry Watch</p>
              <h2 className="mt-2 text-2xl font-semibold">行业观察</h2>
              <div className="mt-4 grid gap-4">
                {industryItems.map((item) => (
                  <article key={item.itemId} className="panel p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={item.entryLink} className="text-xl font-semibold hover:text-pine">
                            {item.displayName}
                          </Link>
                          <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
                            {item.statusLabel}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-ink/68">{item.latestChange}</p>
                        <IndustryEventSummary item={item} />
                        <p className="mt-2 text-xs text-ink/48">最近更新时间：{item.updatedAt}</p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link href={item.entryLink} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
                          查看详情
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(item.itemId)}
                          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold"
                        >
                          移除观察
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <p className="eyebrow">Fund Watch</p>
              <h2 className="mt-2 text-2xl font-semibold">基金策略观察</h2>
              <p className="mt-2 text-sm leading-7 text-ink/62">
                基金观察项按策略状态分组；行业观察只保留机会跟踪，不进入分批计划区。
              </p>
              <div className="mt-4 space-y-5">
                {fundSections.map((section) => (
                  <section key={section.stage} className="rounded-2xl bg-white p-5 ring-1 ring-ink/10">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{section.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-ink/58">{section.description}</p>
                      </div>
                      <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">{section.items.length} 项</span>
                    </div>
                    {section.items.length ? (
                      <div className="mt-4 grid gap-4">
                        {section.items.map((item) => (
                          <article key={item.itemId} className="rounded-2xl border border-ink/10 bg-white p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Link href={item.entryLink} className="text-xl font-semibold hover:text-pine">
                                    {item.displayName}
                                  </Link>
                                  <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">
                                    {item.statusLabel}
                                  </span>
                                </div>
                                <p className="mt-3 text-sm leading-7 text-ink/68">{item.latestChange}</p>
                                <IndustryEventSummary item={item} />
                                <p className="mt-2 text-xs text-ink/48">最近更新时间：{item.updatedAt}</p>
                                <StrategyStateSummary item={item} />
                                <ManualStrategyAssumptionPanel
                                  targetType="fund"
                                  fundId={item.itemId}
                                  fundCode={fundCodeFromItem(item) ?? undefined}
                                  fundName={item.displayName}
                                  compact
                                  onAssumptionsChange={() => {
                                    refreshSingleStrategyState(item);
                                  }}
                                />
                              </div>
                              <div className="flex flex-wrap gap-3">
                                <Link href={item.entryLink} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
                                  查看详情
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => refreshSingleStrategyState(item)}
                                  disabled={isRefreshingStrategy}
                                  className="rounded-full border border-pine/20 bg-pine/10 px-4 py-2 text-sm font-semibold text-pine disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {refreshingStrategyItemId === item.itemId ? "生成中..." : "刷新策略"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.itemId)}
                                  className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold"
                                >
                                  移除观察
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-mist/60 px-4 py-3 text-sm text-ink/50">当前基金观察项还没有策略评分状态；这里只展示普通观察，等策略评分写入后再出现评分中、计划草稿、暂停观察或移出池。</p>
                    )}
                  </section>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <RiskDisclaimer compact />
    </div>
  );
}
