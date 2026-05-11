"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { findKnownFundAlias } from "@/lib/fund-aliases";
import {
  portfolioValuationKey,
  readJsonArray,
  readPortfolioValuationSnapshotMap,
  STORAGE_KEYS,
  writeJsonArray,
  writePortfolioValuationSnapshotMap
} from "@/lib/storage";
import { FundListItem, FundSearchResult, PortfolioPosition, PortfolioValuationSnapshot, PortfolioValuationStatus } from "@/types";

type DraftPosition = {
  fundCode: string;
  fundName: string;
  units: string;
  costNav: string;
  marketValue: string;
  holdingProfit: string;
  holdingReturn: string;
};

type SnapshotDraft = {
  fundName: string;
  marketValue: number | null;
  dayProfit: number | null;
  holdingProfit: number | null;
  holdingReturn: number | null;
  sourceImageName?: string;
  confidence?: "high" | "medium" | "low";
  warning?: string;
};

type PositionView = {
  position: PortfolioPosition;
  fund?: FundListItem;
  latestNav?: number | null;
  previousNav?: number | null;
  marketValue?: number | null;
  costValue?: number | null;
  dayProfit?: number | null;
  totalProfit?: number | null;
  dayReturn?: number | null;
  totalReturn?: number | null;
  valuationSnapshot?: PortfolioValuationSnapshot;
  dataMode: "nav" | "snapshot";
};

type RefreshVisibleResult = {
  fundCode?: string;
  status?: string;
  message?: string;
};

const PORTFOLIO_VALUATION_REFRESH_MS = 60_000;
const PORTFOLIO_VALUATION_FRESH_MS = 90_000;

const emptyDraft: DraftPosition = {
  fundCode: "",
  fundName: "",
  units: "",
  costNav: "",
  marketValue: "",
  holdingProfit: "",
  holdingReturn: ""
};

const alipayExampleRows: SnapshotDraft[] = [
  { fundName: "招商中证有色金属矿业主题ETF联接C", marketValue: 21781.36, dayProfit: 0, holdingProfit: -1322.64, holdingReturn: -5.72 },
  { fundName: "广发远见智选混合C", marketValue: 20335.75, dayProfit: 0, holdingProfit: 783.75, holdingReturn: 5.39 },
  { fundName: "南方北证50成份指数C", marketValue: 20125.76, dayProfit: 0, holdingProfit: -428.24, holdingReturn: -2.08 },
  { fundName: "华夏全球科技先锋混合(QDII)C", marketValue: 15141.28, dayProfit: 0, holdingProfit: 141.28, holdingReturn: 2.83 },
  { fundName: "东方阿尔法科技智选混合C", marketValue: 14832.61, dayProfit: 0, holdingProfit: 569.78, holdingReturn: 3.99 },
  { fundName: "建信新兴市场优选混合(QDII)C", marketValue: 180897.82, dayProfit: 0, holdingProfit: 41820.16, holdingReturn: 30.88 },
  { fundName: "嘉实全球产业升级股票(QDII)C", marketValue: 59319.08, dayProfit: 0, holdingProfit: 17143.65, holdingReturn: 40.84 },
  { fundName: "宏利高端装备股票C", marketValue: 44848.2, dayProfit: 0, holdingProfit: 46.75, holdingReturn: 0.1 },
  { fundName: "易方达全球成长精选混合(QDII)C", marketValue: 42629.07, dayProfit: 0, holdingProfit: 11965.88, holdingReturn: 39.15 },
  { fundName: "国富亚洲机会股票(QDII)C", marketValue: 41772.45, dayProfit: 0, holdingProfit: 5883.97, holdingReturn: 16.4 },
  { fundName: "广发半导体材料设备主题ETF联接C", marketValue: 40696.7, dayProfit: 0, holdingProfit: 1520.03, holdingReturn: 3.88 },
  { fundName: "银华海外数字经济量化选股混合C", marketValue: 35380.66, dayProfit: 0, holdingProfit: 3797.97, holdingReturn: 12.79 },
  { fundName: "信澳业绩驱动混合C", marketValue: 31783.98, dayProfit: 0, holdingProfit: 4788.63, holdingReturn: 21.77 },
  { fundName: "华宝创业板人工智能ETF联接C", marketValue: 31311.13, dayProfit: 0, holdingProfit: -354.87, holdingReturn: -1.33 }
];

function readPortfolioPositions(): PortfolioPosition[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.portfolio);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.fundName === "string") : [];
  } catch {
    return [];
  }
}

function writePortfolioPositions(positions: PortfolioPosition[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.portfolio, JSON.stringify(positions));
}

function mergePositionsByIdentity(positions: PortfolioPosition[]) {
  const merged = new Map<string, PortfolioPosition>();
  positions.forEach((position) => {
    const enriched = enrichPositionWithKnownAlias(position);
    const key = positionIdentityKey(enriched);
    merged.set(key, {
      ...enriched,
      positionId: enriched.fundCode ? `code-${enriched.fundCode}` : enriched.positionId
    });
  });
  return Array.from(merged.values()).sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt));
}

function positionIdentityKey(position: Pick<PortfolioPosition, "positionId" | "fundCode">) {
  return position.fundCode ? `code-${position.fundCode}` : position.positionId;
}

function validNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteNumberOrNull(value?: number | null) {
  return validNumber(value) ? value : null;
}

function enrichPositionWithKnownAlias(position: PortfolioPosition): PortfolioPosition {
  const alias = findKnownFundAlias(position.fundCode ?? position.fundName);
  if (!alias) return position;

  return {
    ...position,
    positionId: `code-${alias.code}`,
    fundCode: alias.code,
    fundName: alias.displayName,
    updatedAt: position.updatedAt ?? new Date().toISOString()
  };
}

async function syncPortfolioPositionsToBackend(positions: PortfolioPosition[]) {
  const response = await fetch("/api/portfolio/positions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ positions })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.detail ?? "持仓同步到数据库失败");
  }
  return payload as { ok?: boolean; savedCount?: number };
}

async function readPortfolioPositionsFromBackend() {
  const response = await fetch("/api/portfolio", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? payload.detail ?? "读取数据库持仓失败");
  }
  return Array.isArray(payload.positions) ? (payload.positions as PortfolioPosition[]) : [];
}

function normalizeMoney(raw: string) {
  return Number(raw.replace(/[,+\s]/g, ""));
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} 元`;
}

function formatPlainMoney(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(2)} 元`;
}

function formatNav(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(4);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function valuationStatusLabel(status?: PortfolioValuationStatus) {
  switch (status) {
    case "fresh":
      return "估值有效";
    case "refreshing":
      return "刷新中";
    case "stale":
      return "估值过期";
    case "failed":
      return "刷新失败";
    case "unavailable":
      return "暂无估值";
    case "delayed":
      return "延迟估值";
    default:
      return "待估值";
  }
}

function valuationStatusTone(status?: PortfolioValuationStatus) {
  switch (status) {
    case "fresh":
      return "text-pine";
    case "delayed":
      return "text-amber-700";
    case "refreshing":
      return "text-sky-700";
    case "stale":
    case "failed":
      return "text-rose-700";
    default:
      return "text-ink/55";
  }
}

function toNumber(value: string) {
  const next = normalizeMoney(value);
  return Number.isFinite(next) ? next : 0;
}

function slugifyName(name: string) {
  return name.replace(/\s+/g, "").slice(0, 48);
}

function parseSnapshotRows(raw: string): SnapshotDraft[] {
  return raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): SnapshotDraft | null => {
      const match = line.match(/^(.+?)\s+([0-9,]+\.\d{2})\s+([+-]?[0-9,]+\.\d{2})\s+([+-]?[0-9,]+\.\d{2})\s+([+-]?[0-9,]+\.\d{1,2})%?$/);
      if (!match) return null;
      return {
        fundName: match[1].trim(),
        marketValue: normalizeMoney(match[2]),
        dayProfit: normalizeMoney(match[3]),
        holdingProfit: normalizeMoney(match[4]),
        holdingReturn: normalizeMoney(match[5])
      };
    })
    .filter((item): item is SnapshotDraft => Boolean(item));
}

function formatDraftLine(item: SnapshotDraft) {
  const values = [
    item.fundName,
    item.marketValue?.toFixed(2) ?? "",
    item.dayProfit?.toFixed(2) ?? "",
    item.holdingProfit?.toFixed(2) ?? "",
    item.holdingReturn !== null && item.holdingReturn !== undefined ? `${item.holdingReturn.toFixed(2)}%` : ""
  ];
  return values.join(" ").trim();
}

function matchFundByName(funds: FundListItem[], name: string) {
  const alias = findKnownFundAlias(name);
  if (alias) {
    const byAliasCode = funds.find((fund) => fund.fundCode === alias.code);
    if (byAliasCode) return byAliasCode;
  }
  const normalized = name.replace(/\s+/g, "");
  return funds.find((fund) => normalized.includes(fund.fundName.replace(/\s+/g, "")) || fund.fundName.replace(/\s+/g, "").includes(normalized));
}

function isPortfolioGeneratedWatchId(id: string) {
  return /^user-\d{6}$/.test(id) || /^code-\d{6}$/.test(id);
}

function buildPortfolioValuationSnapshot(
  position: PortfolioPosition,
  fund: FundListItem | undefined,
  previous?: PortfolioValuationSnapshot,
  options: { refreshFailed?: boolean; errorMessage?: string } = {}
): PortfolioValuationSnapshot {
  const now = new Date().toISOString();
  const key = portfolioValuationKey(position);
  const previousAgeMs = previous ? Date.now() - new Date(previous.valuationUpdatedAt).getTime() : Number.POSITIVE_INFINITY;
  const previousFresh = Number.isFinite(previousAgeMs) && previousAgeMs <= PORTFOLIO_VALUATION_FRESH_MS;
  const latestNav = finiteNumberOrNull(fund?.latestNav);
  const isQdii = Boolean((fund?.fundType ?? position.fundName).toUpperCase().includes("QDII"));
  const units = finiteNumberOrNull(position.units);
  const costNav = finiteNumberOrNull(position.costNav);
  const holdingCostAmount = typeof units === "number" && typeof costNav === "number" ? units * costNav : previous?.holdingCostAmount ?? null;
  const manualValue = finiteNumberOrNull(position.marketValueSnapshot);
  const navEstimatedValue = typeof units === "number" && typeof latestNav === "number" ? units * latestNav : null;
  const currentEstimatedValue = navEstimatedValue ?? manualValue ?? previous?.currentEstimatedValue ?? null;
  const previousNav = finiteNumberOrNull(fund?.previousNav);
  const dailyReturn = finiteNumberOrNull(fund?.return1d) ?? null;
  const navDailyProfit =
    typeof units === "number" && typeof latestNav === "number" && typeof previousNav === "number"
      ? units * (latestNav - previousNav)
      : null;
  const snapshotDailyProfit =
    currentEstimatedValue !== null && dailyReturn !== null && dailyReturn > -99.9
      ? currentEstimatedValue * (dailyReturn / 100) / (1 + dailyReturn / 100)
      : null;
  const estimatedProfit =
    navDailyProfit ?? snapshotDailyProfit ?? position.dayProfitSnapshot ?? previous?.estimatedProfit ?? null;
  const estimatedProfitPercent = dailyReturn ?? previous?.estimatedProfitPercent ?? null;
  const hasFreshNavValuation = navEstimatedValue !== null;
  const hasSnapshotValue = manualValue !== null || previous?.currentEstimatedValue !== null;
  const valuationStatus: PortfolioValuationStatus = options.refreshFailed
    ? previous?.valuationStatus === "fresh" && previousFresh
      ? "stale"
      : "failed"
    : hasFreshNavValuation
      ? isQdii
        ? "delayed"
        : "fresh"
      : hasSnapshotValue
        ? "stale"
        : "unavailable";
  const valuationUpdatedAt = options.refreshFailed && previous?.valuationUpdatedAt ? previous.valuationUpdatedAt : now;

  return {
    snapshotId: `portfolio-valuation-${key}-${valuationUpdatedAt}`,
    fundId: fund?.fundId ?? position.positionId,
    fundCode: position.fundCode ?? fund?.fundCode,
    fundName: fund?.fundName ?? position.fundName,
    holdingId: position.positionId,
    positionAmount: manualValue,
    positionShare: units,
    holdingCostAmount,
    costNav,
    latestEstimatedNav: latestNav,
    latestEstimatedPrice: latestNav,
    valuationDate: fund?.latestNavDate ?? fund?.metricTradeDate ?? fund?.metricUpdatedAt ?? position.updatedAt ?? position.createdAt,
    currentEstimatedValue,
    estimatedProfit,
    estimatedProfitPercent,
    valuationUpdatedAt,
    valuationStatus,
    dataSource: hasFreshNavValuation ? "backend_cache" : hasSnapshotValue ? "manual_import" : "unavailable",
    delayReason: isQdii ? "QDII 或海外市场净值披露存在延迟，以最新可用日期展示。" : undefined,
    staleReason: options.refreshFailed
      ? "本次刷新失败，保留上一条估值快照作为过期参考。"
      : hasFreshNavValuation
        ? undefined
        : hasSnapshotValue
          ? "当前仅有持仓截图或手动金额，等待净值刷新。"
          : "缺少份额、净值或持仓金额。",
    errorMessage: options.errorMessage,
    isRealtime: false
  };
}

function buildPositionView(position: PortfolioPosition, fund?: FundListItem, valuationSnapshot?: PortfolioValuationSnapshot): PositionView {
  const latestNav = fund?.latestNav ?? null;
  const previousNav = fund?.previousNav ?? null;
  const hasNavPosition = Boolean(position.units && position.costNav);

  if (hasNavPosition) {
    const units = position.units ?? 0;
    const costNav = position.costNav ?? 0;
    const costValue = units * costNav;
    const marketValue = latestNav ? units * latestNav : position.marketValueSnapshot ?? null;
    const dayProfit = latestNav && previousNav ? units * (latestNav - previousNav) : position.dayProfitSnapshot ?? null;
    const totalProfit = marketValue !== null ? marketValue - costValue : position.holdingProfitSnapshot ?? null;

    return {
      position,
      fund,
      latestNav,
      previousNav,
      marketValue,
      costValue,
      dayProfit,
      totalProfit,
      dayReturn: fund?.return1d ?? (latestNav && previousNav ? ((latestNav - previousNav) / previousNav) * 100 : null),
      totalReturn: totalProfit !== null && costValue > 0 ? (totalProfit / costValue) * 100 : position.holdingReturnSnapshot ?? null,
      valuationSnapshot,
      dataMode: "nav"
    };
  }

  const marketValue = position.marketValueSnapshot ?? null;
  const totalProfit = position.holdingProfitSnapshot ?? null;
  const costValue = marketValue !== null && totalProfit !== null ? marketValue - totalProfit : null;
  const estimatedDayProfit =
    marketValue !== null && fund?.return1d !== null && fund?.return1d !== undefined && fund.return1d > -99.9
      ? marketValue * (fund.return1d / 100) / (1 + fund.return1d / 100)
      : position.dayProfitSnapshot ?? null;

  return {
    position,
    fund,
    latestNav,
    previousNav,
    marketValue,
    costValue,
    dayProfit: estimatedDayProfit,
    totalProfit,
    dayReturn: fund?.return1d ?? null,
    totalReturn: position.holdingReturnSnapshot ?? null,
    valuationSnapshot,
    dataMode: "snapshot"
  };
}

function getPortfolioSignals(item: PositionView) {
  const signals: Array<{ label: string; tone: string }> = [];
  if (item.fund?.return1d !== null && item.fund?.return1d !== undefined) {
    signals.push({
      label: `昨日 ${formatPercent(item.fund.return1d)}`,
      tone: item.fund.return1d >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
    });
  }
  if (item.fund?.return3m !== null && item.fund?.return3m !== undefined && item.fund.return3m >= 10) {
    signals.push({ label: "近3月强势", tone: "bg-emerald-50 text-emerald-700" });
  }
  if (item.fund?.maxDrawdown !== null && item.fund?.maxDrawdown !== undefined && item.fund.maxDrawdown <= -20) {
    signals.push({ label: "回撤偏深", tone: "bg-rose-50 text-rose-700" });
  }
  if (item.dataMode === "snapshot") {
    signals.push({ label: "持仓快照", tone: "bg-amber-50 text-amber-700" });
  } else {
    signals.push({ label: "净值增强", tone: "bg-emerald-50 text-emerald-700" });
  }
  return signals.slice(0, 4);
}

export function PortfolioClient({ funds }: { funds: FundListItem[] }) {
  const router = useRouter();
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [draft, setDraft] = useState<DraftPosition>(emptyDraft);
  const [message, setMessage] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedNames, setUploadedNames] = useState<string[]>([]);
  const [snapshotText, setSnapshotText] = useState("");
  const [snapshotDrafts, setSnapshotDrafts] = useState<SnapshotDraft[]>([]);
  const [screenshotRecognitionMessage, setScreenshotRecognitionMessage] = useState("");
  const [isRecognizingScreenshots, setIsRecognizingScreenshots] = useState(false);
  const [isCollectingPortfolio, setIsCollectingPortfolio] = useState(false);
  const [marketValueEdits, setMarketValueEdits] = useState<Record<string, string>>({});
  const [valuationSnapshots, setValuationSnapshots] = useState<Record<string, PortfolioValuationSnapshot>>({});
  const [valuationRefreshTime, setValuationRefreshTime] = useState<string | null>(null);
  const [isValuationRefreshing, setIsValuationRefreshing] = useState(false);

  const fundByCode = useMemo(() => new Map(funds.map((fund) => [fund.fundCode, fund])), [funds]);
  const selectedFund = draft.fundCode ? fundByCode.get(draft.fundCode.trim()) : matchFundByName(funds, draft.fundName);
  const positionViews = useMemo(
    () =>
      positions
        .map((position) =>
          buildPositionView(
            position,
            position.fundCode ? fundByCode.get(position.fundCode) : matchFundByName(funds, position.fundName),
            valuationSnapshots[portfolioValuationKey(position)]
          )
        )
        .sort((left, right) => (right.marketValue ?? 0) - (left.marketValue ?? 0)),
    [fundByCode, funds, positions, valuationSnapshots]
  );

  function refreshPortfolioValuations(sourcePositions = positions, options: { silent?: boolean; refreshFailed?: boolean; errorMessage?: string } = {}) {
    if (!sourcePositions.length) {
      setValuationSnapshots({});
      writePortfolioValuationSnapshotMap({});
      setValuationRefreshTime(null);
      return;
    }

    setIsValuationRefreshing(true);
    setValuationSnapshots((current) => {
      const next: Record<string, PortfolioValuationSnapshot> = { ...current };
      sourcePositions.forEach((position) => {
        const fund = position.fundCode ? fundByCode.get(position.fundCode) : matchFundByName(funds, position.fundName);
        const key = portfolioValuationKey(position);
        next[key] = buildPortfolioValuationSnapshot(position, fund, current[key], {
          refreshFailed: options.refreshFailed,
          errorMessage: options.errorMessage
        });
      });
      const activeKeys = new Set(positions.map(portfolioValuationKey));
      Object.keys(next).forEach((key) => {
        if (!activeKeys.has(key)) delete next[key];
      });
      writePortfolioValuationSnapshotMap(next);
      return next;
    });
    const now = new Date().toISOString();
    setValuationRefreshTime(now);
    if (!options.silent) {
      setMessage(`已刷新 ${sourcePositions.length} 只持仓基金估值；该估值仅用于持仓监控。`);
    }
    window.setTimeout(() => {
      setIsValuationRefreshing(false);
    }, 400);
  }

  async function refreshHeldFundSnapshots(sourcePositions = positions, options: { silent?: boolean } = {}) {
    const fundCodes = Array.from(new Set(sourcePositions.map((position) => position.fundCode).filter(Boolean))) as string[];
    if (!fundCodes.length) {
      refreshPortfolioValuations(sourcePositions, options);
      return;
    }

    try {
      const response = await fetch("/api/funds/refresh-visible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fundCodes })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message ?? payload.detail ?? "持仓基金估值刷新失败");
      }
      const results = Array.isArray(payload.results) ? (payload.results as RefreshVisibleResult[]) : [];
      const failedCodes = new Set(results.filter((result) => result.status === "failed" && result.fundCode).map((result) => result.fundCode as string));
      const failedMessages = new Map(
        results
          .filter((result) => result.status === "failed" && result.fundCode)
          .map((result) => [result.fundCode as string, result.message ?? "该持仓基金估值刷新失败。"])
      );
      const successfulPositions = sourcePositions.filter((position) => !position.fundCode || !failedCodes.has(position.fundCode));
      const failedPositions = sourcePositions.filter((position) => position.fundCode && failedCodes.has(position.fundCode));
      if (successfulPositions.length) {
        refreshPortfolioValuations(successfulPositions, { silent: true });
      }
      failedPositions.forEach((position) => {
        refreshPortfolioValuations([position], {
          silent: true,
          refreshFailed: true,
          errorMessage: failedMessages.get(position.fundCode ?? "") ?? "该持仓基金估值刷新失败。"
        });
      });
      router.refresh();
      if (!options.silent) {
        setMessage(`已请求刷新 ${fundCodes.length} 只已持仓基金估值；成功 ${payload.successCount ?? 0} 只，失败 ${payload.failedCount ?? 0} 只。`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "持仓基金估值刷新失败";
      refreshPortfolioValuations(sourcePositions, { silent: true, refreshFailed: true, errorMessage });
      if (!options.silent) {
        setMessage(`${errorMessage}；已保留本地估值快照。`);
      }
    }
  }

  useEffect(() => {
    syncWatchlistFromPositions(positions);
  }, [positions, fundByCode]);

  useEffect(() => {
    setValuationSnapshots(readPortfolioValuationSnapshotMap());
  }, []);

  useEffect(() => {
    if (!positions.length) {
      setValuationSnapshots({});
      writePortfolioValuationSnapshotMap({});
      setValuationRefreshTime(null);
      return;
    }

    refreshPortfolioValuations(positions, { silent: true });
    const intervalId = window.setInterval(() => {
      void refreshHeldFundSnapshots(positions, { silent: true });
    }, PORTFOLIO_VALUATION_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [positions, fundByCode, funds]);

  useEffect(() => {
    let cancelled = false;
    const localPositions = mergePositionsByIdentity(readPortfolioPositions());
    if (localPositions.length) {
      setPositions(localPositions);
      void syncPortfolioPositionsToBackend(localPositions).catch(() => {
        if (!cancelled) setMessage("本地持仓已恢复，但后端暂时未同步；请确认后端服务已启动。");
      });
    }

    async function restoreFromBackend() {
      try {
        const backendPositions = mergePositionsByIdentity(await readPortfolioPositionsFromBackend());
        if (cancelled || !backendPositions.length || localPositions.length) return;
        setPositions(backendPositions);
        writePortfolioPositions(backendPositions);
        syncWatchlistFromPositions(backendPositions);
        setMessage(`已从数据库恢复 ${backendPositions.length} 条持仓。`);
      } catch {
        if (!cancelled && !localPositions.length) {
          setMessage("本地和数据库暂未读取到持仓；导入截图后会自动保存到数据库。");
        }
      }
    }

    void restoreFromBackend();
    return () => {
      cancelled = true;
    };
  }, [fundByCode]);

  const summary = useMemo(() => {
    return positionViews.reduce(
      (acc, item) => {
        if (item.costValue === null || item.costValue === undefined) {
          acc.costValueUnknownCount += 1;
        } else {
          acc.costValue += item.costValue;
        }
        if (item.marketValue === null || item.marketValue === undefined) {
          acc.marketValueUnknownCount += 1;
        } else {
          acc.marketValue += item.marketValue;
        }
        if (item.dayProfit === null || item.dayProfit === undefined) {
          acc.dayProfitUnknownCount += 1;
        } else {
          acc.dayProfit += item.dayProfit;
        }
        if (item.totalProfit === null || item.totalProfit === undefined) {
          acc.totalProfitUnknownCount += 1;
        } else {
          acc.totalProfit += item.totalProfit;
        }
        if (item.latestNav || item.marketValue) acc.readyCount += 1;
        return acc;
      },
      {
        costValue: 0,
        marketValue: 0,
        dayProfit: 0,
        totalProfit: 0,
        readyCount: 0,
        costValueUnknownCount: 0,
        marketValueUnknownCount: 0,
        dayProfitUnknownCount: 0,
        totalProfitUnknownCount: 0
      }
    );
  }, [positionViews]);

  function updateDraft<K extends keyof DraftPosition>(key: K, value: DraftPosition[K]) {
    const next = { ...draft, [key]: value };
    if (key === "fundCode") {
      const fund = fundByCode.get(value.trim());
      next.fundName = fund?.fundName ?? draft.fundName;
    }
    setDraft(next);
  }

  function syncWatchlistFromPositions(next: PortfolioPosition[]) {
    const current = readJsonArray(STORAGE_KEYS.watchlist);
    const activeGeneratedIds = new Set(
      next.flatMap((position) => {
        const code = position.fundCode?.trim();
        return code ? [`user-${code}`, `code-${code}`] : [];
      })
    );
    const cleaned = current.filter((id) => !isPortfolioGeneratedWatchId(id) || activeGeneratedIds.has(id));
    if (cleaned.length !== current.length || cleaned.some((id, index) => id !== current[index])) {
      writeJsonArray(STORAGE_KEYS.watchlist, cleaned);
    }
  }

  function persist(next: PortfolioPosition[]) {
    const merged = mergePositionsByIdentity(next);
    setPositions(merged);
    writePortfolioPositions(merged);
    syncWatchlistFromPositions(merged);
    void syncPortfolioPositionsToBackend(merged)
      .then((payload) => {
        setMessage(`持仓已保存到本地并同步数据库${payload.savedCount !== undefined ? `（${payload.savedCount} 条）` : ""}。`);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "持仓已保存到本地，但同步数据库失败。");
      });
  }

  async function refreshPortfolioDecision() {
    const response = await fetch("/api/portfolio/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message ?? payload.detail ?? "组合策略刷新失败");
    }
    return payload;
  }

  function savePosition() {
    const fundCode = draft.fundCode.trim();
    const fund = fundCode ? fundByCode.get(fundCode) : matchFundByName(funds, draft.fundName);
    const fundName = (draft.fundName || fund?.fundName || fundCode).trim();
    const units = toNumber(draft.units);
    const costNav = toNumber(draft.costNav);
    const marketValue = toNumber(draft.marketValue);
    const holdingProfit = toNumber(draft.holdingProfit);
    const holdingReturn = toNumber(draft.holdingReturn);

    if (!fundName) {
      setMessage("请至少填写基金名称；如果知道基金代码，建议一起填写，后续可以匹配净值。");
      return;
    }

    if ((units <= 0 || costNav <= 0) && marketValue <= 0) {
      setMessage("请填写“份额+成本净值”，或填写截图里的持有金额。");
      return;
    }

    const now = new Date().toISOString();
    const positionId = fundCode ? `code-${fundCode}` : `name-${slugifyName(fundName)}`;
    const nextPosition: PortfolioPosition = {
      positionId,
      fundCode: fundCode || fund?.fundCode,
      fundName,
      units: units > 0 ? units : undefined,
      costNav: costNav > 0 ? costNav : undefined,
      marketValueSnapshot: marketValue > 0 ? marketValue : undefined,
      holdingProfitSnapshot: marketValue > 0 ? holdingProfit : undefined,
      holdingReturnSnapshot: marketValue > 0 ? holdingReturn : undefined,
      source: marketValue > 0 && units <= 0 ? "manual_snapshot" : "manual_nav",
      createdAt: positions.find((item) => item.positionId === positionId)?.createdAt ?? now,
      updatedAt: now
    };
    persist([nextPosition, ...positions.filter((item) => item.positionId !== positionId)]);
    setDraft(emptyDraft);
    setMessage("已保存持仓，正在自动拉取这只基金的最新盘后数据。");
    window.setTimeout(() => {
      void collectPortfolioData([nextPosition]);
    }, 0);
  }

  function updateMarketValueEdit(positionId: string, value: string) {
    setMarketValueEdits((current) => ({ ...current, [positionId]: value }));
  }

  function savePositionMarketValue(position: PortfolioPosition, currentMarketValue?: number | null) {
    const raw = marketValueEdits[position.positionId] ?? String(currentMarketValue ?? position.marketValueSnapshot ?? "");
    const marketValue = toNumber(raw);
    if (marketValue <= 0) {
      setMessage("请填写有效的持仓金额。");
      return;
    }

    const now = new Date().toISOString();
    const nextPosition: PortfolioPosition = {
      ...position,
      marketValueSnapshot: marketValue,
      holdingProfitSnapshot: position.holdingProfitSnapshot,
      source: position.source ?? "manual_snapshot",
      updatedAt: now
    };

    setMarketValueEdits((current) => {
      const next = { ...current };
      delete next[position.positionId];
      return next;
    });
    persist([nextPosition, ...positions.filter((item) => positionIdentityKey(item) !== positionIdentityKey(nextPosition))]);
    setMessage("已更新这只基金的持仓金额，正在刷新对应基金盘后数据。");
    window.setTimeout(() => {
      void collectPortfolioData([nextPosition]);
    }, 0);
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const names = files.map((file) => file.name);
    setUploadedFiles(files);
    setUploadedNames(names);
    setSnapshotDrafts([]);
    setSnapshotText("");
    if (names.length) {
      const nextMessage = `已选择 ${names.length} 张截图。点击“识别本次截图”生成导入草稿；新上传已清空上一批草稿。`;
      setScreenshotRecognitionMessage(nextMessage);
      setMessage(nextMessage);
    } else {
      setScreenshotRecognitionMessage("");
      setMessage("");
    }
  }

  function parseSnapshotText() {
    const rows = parseSnapshotRows(snapshotText);
    setSnapshotDrafts(rows);
    setMessage(rows.length ? `已解析 ${rows.length} 条截图持仓，请确认后导入。` : "暂未解析到持仓。建议格式：基金名称 持有金额 昨日收益 持有收益 持有收益率");
  }

  async function recognizeCurrentScreenshots() {
    const currentFiles = uploadedFiles.length ? uploadedFiles : Array.from(screenshotInputRef.current?.files ?? []);

    if (!currentFiles.length) {
      const nextMessage = "请先选择本次要识别的持仓截图。";
      setScreenshotRecognitionMessage(nextMessage);
      setMessage(nextMessage);
      return;
    }

    setIsRecognizingScreenshots(true);
    const recognizingMessage = `正在识别 ${currentFiles.length} 张截图，请稍等。`;
    setScreenshotRecognitionMessage(recognizingMessage);
    setMessage(recognizingMessage);

    try {
      const formData = new FormData();
      currentFiles.forEach((file) => {
        formData.append("images", file, file.name);
      });

      const response = await fetch("/api/portfolio/screenshot-drafts", {
        method: "POST",
        body: formData
      });
      const payload = await response.json().catch(() => ({}));
      const drafts = Array.isArray(payload.drafts) ? (payload.drafts as SnapshotDraft[]) : [];
      const warnings = Array.isArray(payload.warnings) ? payload.warnings.filter(Boolean).join("；") : "";

      if (payload.status === "config_missing") {
        setSnapshotDrafts([]);
        setSnapshotText("");
        const nextMessage = warnings || "未配置视觉识别服务，无法识别本次截图。";
        setScreenshotRecognitionMessage(nextMessage);
        setMessage(nextMessage);
        return;
      }

      if (!response.ok || payload.status !== "ok") {
        setSnapshotDrafts([]);
        const nextMessage = warnings || payload.message || "截图识别失败，请稍后重试或粘贴 OCR 文本后解析。";
        setScreenshotRecognitionMessage(nextMessage);
        setMessage(nextMessage);
        return;
      }

      setSnapshotDrafts(drafts);
      setSnapshotText(typeof payload.rawText === "string" && payload.rawText.trim() ? payload.rawText : drafts.map(formatDraftLine).join("\n"));
      const nextMessage =
        drafts.length
          ? `已从本次 ${payload.imageCount ?? currentFiles.length} 张截图识别 ${drafts.length} 条持仓草稿，请校对后导入。${warnings ? `提示：${warnings}` : ""}`
          : `本次截图未识别到持仓草稿。${warnings ? `提示：${warnings}` : ""}`;
      setScreenshotRecognitionMessage(nextMessage);
      setMessage(nextMessage);
    } catch (error) {
      setSnapshotDrafts([]);
      const nextMessage = error instanceof Error ? error.message : "截图识别失败，请稍后重试。";
      setScreenshotRecognitionMessage(nextMessage);
      setMessage(nextMessage);
    } finally {
      setIsRecognizingScreenshots(false);
    }
  }

  function loadExampleScreenshotDrafts() {
    setSnapshotDrafts(alipayExampleRows);
    setSnapshotText(alipayExampleRows.map(formatDraftLine).join("\n"));
    setMessage("已载入示例草稿，仅用于演示格式；不会代表本次上传截图的识别结果。");
  }

  function importSnapshotDrafts() {
    if (!snapshotDrafts.length) {
      setMessage("还没有可导入的截图持仓草稿。");
      return;
    }

    const now = new Date().toISOString();
    const nextRows = snapshotDrafts.map<PortfolioPosition>((item) => {
      const alias = findKnownFundAlias(item.fundName);
      const fund = matchFundByName(funds, item.fundName);
      const fundCode = fund?.fundCode ?? alias?.code;
      const fundName = fund?.fundName ?? alias?.displayName ?? item.fundName;
      return {
        positionId: fundCode ? `code-${fundCode}` : `name-${slugifyName(item.fundName)}`,
        fundCode,
        fundName,
        marketValueSnapshot: item.marketValue ?? undefined,
        dayProfitSnapshot: item.dayProfit ?? undefined,
        holdingProfitSnapshot: item.holdingProfit ?? undefined,
        holdingReturnSnapshot: item.holdingReturn ?? undefined,
        source: "alipay_screenshot",
        createdAt: now,
        updatedAt: now
      };
    });
    const nextIds = new Set(nextRows.map((item) => item.positionId));
    const nextPositions = [...nextRows, ...positions.filter((item) => !nextIds.has(item.positionId))];
    persist(nextPositions);
    setUploadedFiles([]);
    setUploadedNames([]);
    setSnapshotDrafts([]);
    setSnapshotText("");
    setMessage(`已导入 ${nextRows.length} 条支付宝截图持仓，正在自动匹配基金代码并拉取真实数据。`);
    window.setTimeout(() => {
      void collectPortfolioData(nextPositions);
    }, 0);
  }

  function chooseSearchResult(items: FundSearchResult[], fundName: string) {
    const normalized = fundName.replace(/\s+/g, "");
    return (
      items.find((item) => item.fundName.replace(/\s+/g, "") === normalized) ??
      items.find((item) => normalized.includes(item.fundName.replace(/\s+/g, "")) || item.fundName.replace(/\s+/g, "").includes(normalized)) ??
      items[0]
    );
  }

  async function searchAndCollectPosition(position: PortfolioPosition) {
    const alias = findKnownFundAlias(position.fundCode ?? position.fundName);
    let fundCode = position.fundCode ?? alias?.code;
    let fundName = alias?.displayName ?? position.fundName;
    let fundType: string | null | undefined;
    let fundCompany: string | null | undefined;

    if (!fundCode) {
      const searchQuery = alias?.searchQuery ?? position.fundName;
      const searchResponse = await fetch(`/api/funds/search?q=${encodeURIComponent(searchQuery)}&limit=5`, { cache: "no-store" });
      const searchPayload = await searchResponse.json();
      if (!searchResponse.ok) {
        throw new Error(searchPayload.message ?? `${position.fundName} 搜索失败`);
      }
      const matched = chooseSearchResult(searchPayload.items ?? [], position.fundName);
      if (!matched) {
        throw new Error(`${position.fundName} 未匹配到基金代码`);
      }
      fundCode = matched.fundCode;
      fundName = matched.fundName;
      fundType = matched.fundType;
      fundCompany = matched.fundCompany;
    }

    const addResponse = await fetch("/api/funds/candidates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fundCode,
        fundName,
        fundType,
        fundCompany,
        theme: alias?.theme ?? "自选基金",
        trackingTarget: fundName,
        query: position.fundName
      })
    });
    const addPayload = await addResponse.json();
    if (!addResponse.ok) {
      throw new Error(addPayload.message ?? `${fundName} 加入候选池失败`);
    }

    const collectResponse = await fetch(`/api/funds/${encodeURIComponent(fundCode)}/collect`, { method: "POST" });
    const collectPayload = await collectResponse.json();
    if (!collectResponse.ok) {
      throw new Error(collectPayload.detail ?? collectPayload.message ?? `${fundName} 采集失败`);
    }

    return {
      ...position,
      positionId: `code-${fundCode}`,
      fundCode,
      fundName,
      updatedAt: new Date().toISOString()
    };
  }

  async function collectPortfolioData(sourcePositions = positions) {
    if (!sourcePositions.length) {
      setMessage("当前没有持仓可采集。");
      return;
    }

    setIsCollectingPortfolio(true);
    let successCount = 0;
    const errors: string[] = [];
    const updated: PortfolioPosition[] = [];

    for (const position of sourcePositions) {
      setMessage(`正在匹配并采集：${position.fundName}`);
      try {
        const next = await searchAndCollectPosition(position);
        updated.push(next);
        successCount += 1;
      } catch (error) {
        updated.push(position);
        errors.push(error instanceof Error ? error.message : `${position.fundName} 采集失败`);
      }
    }

    const sourceKeys = new Set(sourcePositions.map(positionIdentityKey));
    const updatedKeys = new Set([...updated.map(positionIdentityKey), ...sourceKeys]);
    const mergedPositions = [
      ...updated,
      ...positions.filter((item) => !updatedKeys.has(positionIdentityKey(item)))
    ];
    persist(mergedPositions);
    try {
      await refreshPortfolioDecision();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "组合策略刷新失败");
    }
    setIsCollectingPortfolio(false);
    router.refresh();
    setMessage(
      errors.length
        ? `已采集 ${successCount} 只，${errors.length} 只失败：${errors.slice(0, 2).join("；")}`
        : `已完成 ${successCount} 只持仓基金的真实数据采集，请刷新或稍等页面更新。`
    );
  }

  function removePosition(positionId: string) {
    persist(positions.filter((item) => item.positionId !== positionId));
  }

  function refreshQuotes() {
    setIsRefreshing(true);
    router.refresh();
    window.setTimeout(() => {
      setIsRefreshing(false);
      setMessage("已请求刷新基金快照。净值是否变化取决于后端是否完成当日盘后采集。");
    }, 600);
  }

  function refreshHeldValuations() {
    void refreshHeldFundSnapshots(positions);
  }

  return (
    <div className="space-y-8">
      <section className="panel p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="持仓基金" value={`${positions.length} 只`} />
          <SummaryCard label="已匹配估值" value={`${summary.readyCount} 只`} />
          <SummaryCard
            label="当前市值"
            value={formatPlainMoney(summary.marketValue)}
            note={summary.marketValueUnknownCount ? `${summary.marketValueUnknownCount} 只待补` : undefined}
          />
          <SummaryCard
            label="今日盈亏"
            value={formatMoney(summary.dayProfit)}
            tone={summary.dayProfit >= 0 ? "positive" : "negative"}
            note={summary.dayProfitUnknownCount ? `${summary.dayProfitUnknownCount} 只待补` : undefined}
          />
        </div>
        <p className="mt-4 text-sm leading-7 text-ink/60">
          本页支持“份额+成本净值”的手动录入，也支持“支付宝截图资产快照”导入。保存持仓后会自动同步数据库并拉取对应基金的盘后最新数据；已有持仓可以在列表里直接修改持仓金额。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void collectPortfolioData()}
            disabled={isCollectingPortfolio}
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCollectingPortfolio ? "采集中..." : "匹配并刷新全部持仓数据"}
          </button>
          <button type="button" onClick={refreshQuotes} disabled={isRefreshing} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {isRefreshing ? "刷新中..." : "刷新页面快照"}
          </button>
          <button type="button" onClick={refreshHeldValuations} disabled={isValuationRefreshing} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {isValuationRefreshing ? "估值刷新中..." : "刷新持仓估值"}
          </button>
          <Link href="/watchlist" className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold">
            去我的观察
          </Link>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink/50">
          盘中估算涨跌幅约每 1 分钟刷新一次，只覆盖已录入持仓基金；盘后展示今日涨幅，更新时间 {formatTime(valuationRefreshTime)}，不代表实时成交价格。
        </p>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex-1 rounded-2xl bg-mist/60 p-4 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">上传支付宝持仓截图</span>
            <input ref={screenshotInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple onChange={handleImageUpload} className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3" />
            <p className="mt-3 text-xs leading-6 text-ink/55">
              上传后会调用服务端视觉识别生成草稿；导入前请先校对金额，系统不会保存原图。
            </p>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void recognizeCurrentScreenshots()}
              disabled={isRecognizingScreenshots}
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRecognizingScreenshots ? "识别中..." : "识别本次截图"}
            </button>
            <button type="button" onClick={importSnapshotDrafts} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold">
              确认导入草稿
            </button>
            <button type="button" onClick={loadExampleScreenshotDrafts} className="rounded-full border border-ink/15 bg-white px-5 py-3 text-sm font-semibold text-ink/70">
              载入示例草稿
            </button>
          </div>
        </div>

        {screenshotRecognitionMessage ? (
          <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-ink/65 ring-1 ring-ink/10">
            {screenshotRecognitionMessage}
          </p>
        ) : null}

        {uploadedNames.length ? (
          <div className="mt-4 rounded-xl bg-white p-4 text-sm text-ink/65">
            已选择 {uploadedNames.length} 张截图：{uploadedNames.join("、")}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <label className="text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">OCR/人工校对文本</span>
            <textarea
              value={snapshotText}
              onChange={(event) => setSnapshotText(event.target.value)}
              placeholder={"每行格式：基金名称 持有金额 昨日收益 持有收益 持有收益率\n例如：嘉实全球产业升级股票(QDII)C 59319.08 0.00 17143.65 40.84%"}
              className="min-h-36 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none"
            />
            <button type="button" onClick={parseSnapshotText} className="mt-3 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold">
              解析文本为草稿
            </button>
          </label>

          <div className="rounded-xl bg-white p-4">
            <p className="text-sm font-semibold">导入草稿</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-2">
              {snapshotDrafts.length ? (
                snapshotDrafts.map((item) => (
                  <div key={item.fundName} className="flex items-center justify-between gap-3 rounded-lg bg-mist/60 px-3 py-2 text-sm">
                    <span className="font-medium">{item.fundName}</span>
                    <span className={(item.holdingProfit ?? 0) >= 0 ? "text-pine" : "text-rose-700"}>
                      {formatPlainMoney(item.marketValue)} / {formatMoney(item.holdingProfit)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-ink/55">暂无草稿。可以先点击“识别本次截图”，或粘贴 OCR 文本后解析。</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">基金代码</span>
            <input
              value={draft.fundCode}
              onChange={(event) => updateDraft("fundCode", event.target.value)}
              list="portfolio-fund-codes"
              placeholder="可选，例如 017731"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none"
            />
            <datalist id="portfolio-fund-codes">
              {funds.map((fund) => (
                <option key={fund.fundId} value={fund.fundCode}>
                  {fund.fundName}
                </option>
              ))}
            </datalist>
          </label>
          <label className="flex-1 text-sm font-medium text-ink/80">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">基金名称</span>
            <input
              value={selectedFund?.fundName ?? draft.fundName}
              onChange={(event) => updateDraft("fundName", event.target.value)}
              placeholder="基金名称或截图里的简称"
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none"
            />
          </label>
          <label className="w-full text-sm font-medium text-ink/80 lg:w-36">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">份额</span>
            <input value={draft.units} onChange={(event) => updateDraft("units", event.target.value)} inputMode="decimal" placeholder="可选" className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none" />
          </label>
          <label className="w-full text-sm font-medium text-ink/80 lg:w-36">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">成本净值</span>
            <input value={draft.costNav} onChange={(event) => updateDraft("costNav", event.target.value)} inputMode="decimal" placeholder="可选" className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none" />
          </label>
          <label className="w-full text-sm font-medium text-ink/80 lg:w-40">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">持有金额</span>
            <input value={draft.marketValue} onChange={(event) => updateDraft("marketValue", event.target.value)} inputMode="decimal" placeholder="截图金额" className="w-full rounded-xl border border-ink/10 bg-white px-4 py-3 outline-none" />
          </label>
          <button type="button" onClick={savePosition} className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white">
            保存持仓
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-ink/70">
            持有收益
            <input value={draft.holdingProfit} onChange={(event) => updateDraft("holdingProfit", event.target.value)} inputMode="decimal" placeholder="可选" className="ml-2 rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none" />
          </label>
          <label className="text-sm text-ink/70">
            持有收益率
            <input value={draft.holdingReturn} onChange={(event) => updateDraft("holdingReturn", event.target.value)} inputMode="decimal" placeholder="可选" className="ml-2 rounded-xl border border-ink/10 bg-white px-3 py-2 outline-none" />
          </label>
          <button type="button" onClick={refreshQuotes} disabled={isRefreshing} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {isRefreshing ? "刷新中..." : "刷新基金快照"}
          </button>
          <button type="button" onClick={refreshHeldValuations} disabled={isValuationRefreshing} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
            {isValuationRefreshing ? "估值刷新中..." : "刷新持仓估值"}
          </button>
          <button
            type="button"
            onClick={() => void collectPortfolioData()}
            disabled={isCollectingPortfolio}
            className="rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCollectingPortfolio ? "采集中..." : "匹配并拉取真实数据"}
          </button>
          {message ? <span className="text-sm text-ink/60">{message}</span> : null}
        </div>
      </section>

      <section className="panel overflow-hidden p-0">
        {positionViews.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-semibold">还没有录入自己的持仓</p>
            <p className="mt-3 text-sm text-ink/60">可以上传截图生成草稿，也可以手动录入基金代码、份额、成本或截图金额。</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink text-white">
                <tr>
                  <th className="px-5 py-4">基金</th>
                  <th className="px-5 py-4">资产 / 成本</th>
                  <th className="px-5 py-4">今日涨幅</th>
                  <th className="px-5 py-4">今日收益</th>
                  <th className="px-5 py-4">最新净值</th>
                  <th className="px-5 py-4">今日盈亏</th>
                  <th className="px-5 py-4">累计盈亏</th>
                  <th className="px-5 py-4">数据模式</th>
                  <th className="px-5 py-4">动作</th>
                </tr>
              </thead>
              <tbody>
                {positionViews.map((item) => (
                  <tr key={item.position.positionId} className="border-b border-ink/10 bg-white">
                    <td className="px-5 py-4">
                      {item.position.fundCode ? (
                        <Link href={`/funds/${item.position.fundCode}`} className="font-semibold hover:text-pine">
                          {item.fund?.fundName ?? item.position.fundName}
                        </Link>
                      ) : (
                        <p className="font-semibold">{item.fund?.fundName ?? item.position.fundName}</p>
                      )}
                      <p className="mt-1 text-xs text-ink/55">{item.position.fundCode ?? "基金代码待匹配"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {getPortfolioSignals(item).map((signal) => (
                          <span key={signal.label} className={`rounded-full px-2 py-1 text-[11px] font-semibold ${signal.tone}`}>
                            {signal.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p>{formatPlainMoney(item.marketValue)}</p>
                      <p className="mt-1 text-xs text-ink/55">估算成本 {formatPlainMoney(item.costValue)}</p>
                      <div className="mt-3 flex min-w-[220px] items-center gap-2">
                        <input
                          value={marketValueEdits[item.position.positionId] ?? ""}
                          onChange={(event) => updateMarketValueEdit(item.position.positionId, event.target.value)}
                          inputMode="decimal"
                          placeholder="修改持仓金额"
                          className="w-32 rounded-xl border border-ink/10 bg-mist/50 px-3 py-2 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => savePositionMarketValue(item.position, item.marketValue)}
                          className="rounded-full bg-white px-3 py-2 text-xs font-semibold ring-1 ring-ink/10 hover:text-pine"
                        >
                          保存金额
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className={`font-semibold ${(item.dayReturn ?? 0) >= 0 ? "text-pine" : "text-rose-700"}`}>
                        {formatPercent(item.dayReturn)}
                      </p>
                      <p className={`mt-1 text-xs ${valuationStatusTone(item.valuationSnapshot?.valuationStatus)}`}>
                        {valuationStatusLabel(item.valuationSnapshot?.valuationStatus)} · {formatTime(item.valuationSnapshot?.valuationUpdatedAt)}
                      </p>
                      {item.valuationSnapshot?.delayReason || item.valuationSnapshot?.staleReason ? (
                        <p className="mt-1 max-w-[180px] text-xs leading-5 text-ink/45">{item.valuationSnapshot.delayReason ?? item.valuationSnapshot.staleReason}</p>
                      ) : null}
                      {item.valuationSnapshot?.errorMessage ? (
                        <p className="mt-1 max-w-[180px] text-xs leading-5 text-rose-700">{item.valuationSnapshot.errorMessage}</p>
                      ) : null}
                    </td>
                    <td className={`px-5 py-4 font-semibold ${(item.valuationSnapshot?.estimatedProfit ?? 0) >= 0 ? "text-pine" : "text-rose-700"}`}>
                      {formatMoney(item.valuationSnapshot?.estimatedProfit)}
                      <p className="mt-1 text-xs font-normal text-ink/55">{formatPercent(item.valuationSnapshot?.estimatedProfitPercent)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p>{formatNav(item.latestNav)}</p>
                      <p className="mt-1 text-xs text-ink/55">前一日 {formatNav(item.previousNav)}</p>
                    </td>
                    <td className={`px-5 py-4 font-semibold ${(item.dayProfit ?? 0) >= 0 ? "text-pine" : "text-rose-700"}`}>
                      {formatMoney(item.dayProfit)}
                      <p className="mt-1 text-xs font-normal text-ink/55">{formatPercent(item.dayReturn)}</p>
                    </td>
                    <td className={`px-5 py-4 font-semibold ${(item.totalProfit ?? 0) >= 0 ? "text-pine" : "text-rose-700"}`}>
                      {formatMoney(item.totalProfit)}
                      <p className="mt-1 text-xs font-normal text-ink/55">{formatPercent(item.totalReturn)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.dataMode === "nav" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {item.dataMode === "nav" ? "净值增强" : "截图快照"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => void collectPortfolioData([item.position])}
                          disabled={isCollectingPortfolio}
                          className="rounded-full bg-pine px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          刷新这只
                        </button>
                        <button type="button" onClick={() => removePosition(item.position.positionId)} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold">
                          移除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  note
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-mist/70 p-4">
      <p className="text-sm text-ink/55">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "positive" ? "text-pine" : tone === "negative" ? "text-rose-700" : ""}`}>
        {value}
      </p>
      {note ? <p className="mt-2 text-xs text-amber-700">{note}</p> : null}
    </div>
  );
}
