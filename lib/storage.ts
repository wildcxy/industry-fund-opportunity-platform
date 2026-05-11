import { compareItems, funds, industryCards, mockIndustryLongTermEvents } from "@/mock/data";
import { calculateIndustryEventImpact } from "@/lib/strategy/industry-events";
import { isDemoMode } from "@/lib/data-mode";
import { MOCK_SNAPSHOT_UPDATED_AT } from "@/lib/mock-metadata";
import {
  FundCompareItem,
  IndustryLongTermEvent,
  ManualStrategyAssumption,
  PortfolioPosition,
  PortfolioValuationSnapshot,
  WatchlistItem,
  WatchlistStrategyManualAssumptionRef,
  WatchlistStrategyState
} from "@/types";

export const STORAGE_KEYS = {
  watchlist: "industry-fund-watchlist",
  watchlistStrategyState: "industry-fund-watchlist-strategy-state",
  manualStrategyAssumptions: "industry-fund-manual-strategy-assumptions",
  compare: "industry-fund-compare",
  portfolio: "industry-fund-portfolio",
  portfolioValuation: "industry-fund-portfolio-valuation"
} as const;

type WatchlistSummaryItem = {
  itemType: "industry" | "fund";
  itemId: string;
  fundCode?: string | null;
  statusLabel: string;
  latestChange: string;
  updatedAt?: string;
};

export type WatchlistStrategyStateMap = Record<string, WatchlistStrategyState>;

export type PortfolioValuationSnapshotMap = Record<string, PortfolioValuationSnapshot>;

export type ManualStrategyAssumptionDraft = Omit<ManualStrategyAssumption, "assumptionId" | "source" | "createdAt" | "updatedAt"> & {
  assumptionId?: string;
};

export function readJsonArray(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeJsonArray(key: string, value: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readJsonObject<T extends Record<string, unknown>>(key: string): T {
  if (typeof window === "undefined") {
    return {} as T;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {} as T;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

function writeJsonObject<T extends Record<string, unknown>>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readCompareItems(): FundCompareItem[] {
  const ids = readJsonArray(STORAGE_KEYS.compare);
  return compareItems.filter((item) => ids.includes(item.fundId)).slice(0, 4);
}

export function readWatchlistIds(): string[] {
  return readJsonArray(STORAGE_KEYS.watchlist);
}

const industryEventSummaryById = new Map(
  industryCards.map((item) => [
    item.industryId,
    calculateIndustryEventImpact({
      industryId: item.industryId,
      events: mockIndustryLongTermEvents
    })
  ])
);

const eventsByIndustryId = new Map<string, IndustryLongTermEvent[]>();
mockIndustryLongTermEvents.forEach((event) => {
  eventsByIndustryId.set(event.industryId, [...(eventsByIndustryId.get(event.industryId) ?? []), event]);
});

const industryEventMetaById = new Map(industryCards.map((item) => [item.industryId, buildIndustryEventMeta(eventsByIndustryId.get(item.industryId) ?? [])]));

const industryByTheme = new Map(industryCards.flatMap((card) => [card.industryName, ...(card.tags ?? [])].map((key) => [key, card])));

function readJsonRecordArray<T>(key: string, isValid: (value: unknown) => value is T): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValid) : [];
  } catch {
    return [];
  }
}

function writeJsonRecordArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function isManualStrategyAssumption(value: unknown): value is ManualStrategyAssumption {
  if (!value || typeof value !== "object") {
    return false;
  }

  const item = value as Partial<ManualStrategyAssumption>;
  return (
    typeof item.assumptionId === "string" &&
    item.source === "user" &&
    (item.targetType === "fund" || item.targetType === "industry") &&
    typeof item.thesisTitle === "string" &&
    typeof item.hypothesis === "string" &&
    typeof item.evidenceSourceNote === "string" &&
    typeof item.invalidationCondition === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

export function manualAssumptionTargetKeys(input: {
  targetType?: ManualStrategyAssumption["targetType"];
  fundId?: string | null;
  fundCode?: string | null;
  industryId?: string | null;
}) {
  const keys = new Set<string>();
  if (input.targetType === "fund" || input.fundId || input.fundCode) {
    if (input.fundId) keys.add(`fund-id:${input.fundId}`);
    if (input.fundCode) keys.add(`fund-code:${input.fundCode}`);
  }
  if (input.targetType === "industry" || input.industryId) {
    if (input.industryId) keys.add(`industry-id:${input.industryId}`);
  }
  return keys;
}

export function readManualStrategyAssumptions(): ManualStrategyAssumption[] {
  return readJsonRecordArray<ManualStrategyAssumption>(STORAGE_KEYS.manualStrategyAssumptions, isManualStrategyAssumption);
}

export function writeManualStrategyAssumptions(value: ManualStrategyAssumption[]) {
  writeJsonRecordArray(STORAGE_KEYS.manualStrategyAssumptions, value);
}

export function readManualStrategyAssumptionsForTarget(target: {
  targetType?: ManualStrategyAssumption["targetType"];
  fundId?: string | null;
  fundCode?: string | null;
  industryId?: string | null;
}) {
  const targetKeys = manualAssumptionTargetKeys(target);
  if (!targetKeys.size) {
    return [];
  }

  return readManualStrategyAssumptions().filter((assumption) => {
    const assumptionKeys = manualAssumptionTargetKeys(assumption);
    return Array.from(assumptionKeys).some((key) => targetKeys.has(key));
  });
}

export function upsertManualStrategyAssumption(draft: ManualStrategyAssumptionDraft) {
  const now = new Date().toISOString();
  const existingAssumptions = readManualStrategyAssumptions();
  const existing = draft.assumptionId ? existingAssumptions.find((item) => item.assumptionId === draft.assumptionId) : undefined;
  const assumption: ManualStrategyAssumption = {
    ...draft,
    assumptionId: draft.assumptionId ?? `manual-assumption-${now.replace(/[^0-9]/g, "")}-${Math.random().toString(36).slice(2, 8)}`,
    source: "user",
    thesisTitle: draft.thesisTitle.trim(),
    hypothesis: draft.hypothesis.trim(),
    evidenceSourceNote: draft.evidenceSourceNote.trim(),
    invalidationCondition: draft.invalidationCondition.trim(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  const nextAssumptions = existing
    ? existingAssumptions.map((item) => (item.assumptionId === assumption.assumptionId ? assumption : item))
    : [assumption, ...existingAssumptions];
  writeManualStrategyAssumptions(nextAssumptions);
  return assumption;
}

export function removeManualStrategyAssumption(assumptionId: string) {
  writeManualStrategyAssumptions(readManualStrategyAssumptions().filter((item) => item.assumptionId !== assumptionId));
}

export function manualAssumptionToStrategyRef(assumption: ManualStrategyAssumption): WatchlistStrategyManualAssumptionRef | null {
  if (!assumption.invalidationCondition.trim()) {
    return null;
  }

  return {
    assumptionId: assumption.assumptionId,
    source: "user",
    targetType: assumption.targetType,
    fundId: assumption.fundId,
    fundCode: assumption.fundCode,
    industryId: assumption.industryId,
    thesisTitle: assumption.thesisTitle,
    evidenceSourceNote: assumption.evidenceSourceNote,
    nextReviewDate: assumption.nextReviewDate,
    createdAt: assumption.createdAt,
    updatedAt: assumption.updatedAt,
    hypothesis: assumption.hypothesis,
    confidence: assumption.confidence,
    appliesWhen: assumption.evidenceSourceNote,
    invalidationCondition: assumption.invalidationCondition,
    evidenceRefs: assumption.evidenceSourceNote ? [assumption.evidenceSourceNote] : undefined
  };
}

function fundStrategyStateKeys(itemOrId: WatchlistItem | string, fundCode?: string | null) {
  if (typeof itemOrId === "string") {
    return [itemOrId, fundCode, fundCode ? `fund:${fundCode}` : null, fundCode ? `code-${fundCode}` : null, fundCode ? `user-${fundCode}` : null].filter(Boolean) as string[];
  }

  const item = itemOrId;
  if (item.itemType !== "fund") {
    return [];
  }

  const code = item.fundCode ?? item.itemId.match(/^(?:code|user|top10)-(\d{6})$/)?.[1] ?? (/^\d{6}$/.test(item.itemId) ? item.itemId : null);
  return [item.itemId, code, code ? `fund:${code}` : null, code ? `code-${code}` : null, code ? `user-${code}` : null].filter(Boolean) as string[];
}

export function readWatchlistStrategyStateMap(): WatchlistStrategyStateMap {
  return readJsonObject<WatchlistStrategyStateMap>(STORAGE_KEYS.watchlistStrategyState);
}

export function writeWatchlistStrategyStateMap(value: WatchlistStrategyStateMap) {
  writeJsonObject(STORAGE_KEYS.watchlistStrategyState, value);
}

export function readWatchlistStrategyState(itemOrId: WatchlistItem | string, fundCode?: string | null): WatchlistStrategyState | undefined {
  const stateMap = readWatchlistStrategyStateMap();
  const keys = fundStrategyStateKeys(itemOrId, fundCode);
  return keys.map((key) => stateMap[key]).find(Boolean);
}

export function writeWatchlistStrategyState(itemId: string, state: WatchlistStrategyState, fundCode?: string | null) {
  const stateMap = readWatchlistStrategyStateMap();
  const keys = new Set(fundStrategyStateKeys(itemId, fundCode));
  if (!keys.size) {
    keys.add(itemId);
  }
  const nextStateMap = { ...stateMap };
  keys.forEach((key) => {
    nextStateMap[key] = state;
  });
  writeWatchlistStrategyStateMap({
    ...nextStateMap
  });
}

export function removeWatchlistStrategyState(itemOrId: WatchlistItem | string, fundCode?: string | null) {
  const stateMap = readWatchlistStrategyStateMap();
  const keys = fundStrategyStateKeys(itemOrId, fundCode);
  if (!keys.length) return;

  keys.forEach((key) => {
    delete stateMap[key];
  });
  writeWatchlistStrategyStateMap(stateMap);
}

export function readPortfolioPositions(): PortfolioPosition[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.portfolio);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.fundName === "string") : [];
  } catch {
    return [];
  }
}

export function portfolioValuationKey(position: Pick<PortfolioPosition, "positionId" | "fundCode">) {
  return position.fundCode ? `code-${position.fundCode}` : position.positionId;
}

export function readPortfolioValuationSnapshotMap(): PortfolioValuationSnapshotMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.portfolioValuation);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as PortfolioValuationSnapshotMap) : {};
  } catch {
    return {};
  }
}

export function writePortfolioValuationSnapshotMap(snapshotMap: PortfolioValuationSnapshotMap) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.portfolioValuation, JSON.stringify(snapshotMap));
}

function buildWatchlistBaseItems(ids: string[]): WatchlistItem[] {
  if (!isDemoMode()) {
    return [];
  }

  const idSet = new Set(ids);
  const industryItems = industryCards
    .filter((item) => idSet.has(item.industryId))
    .map<WatchlistItem>((item) => {
      return {
        itemId: item.industryId,
        itemType: "industry",
        displayName: item.industryName,
        statusLabel: item.label,
        latestChange: item.summary,
        updatedAt: MOCK_SNAPSHOT_UPDATED_AT,
        entryLink: `/industries/${item.industryId}`,
        industryEventSummary: industryEventSummaryById.get(item.industryId),
        industryEventMeta: industryEventMetaById.get(item.industryId)
      };
    });

  const fundItems = funds
    .filter((item) => idSet.has(item.fundId))
    .map<WatchlistItem>((item) => {
      const industry = industryByTheme.get(item.theme) ?? item.themeAliases?.map((alias) => industryByTheme.get(alias)).find(Boolean);

      return {
        itemId: item.fundId,
        itemType: "fund",
        fundCode: item.fundCode,
        displayName: item.fundName,
        statusLabel: item.tags[0] ?? "观察中",
        latestChange: `${item.theme} 主题关注度仍在改善`,
        updatedAt: MOCK_SNAPSHOT_UPDATED_AT,
        entryLink: `/funds/${item.fundCode}`,
        industryEventSummary: industry ? industryEventSummaryById.get(industry.industryId) : undefined,
        industryEventMeta: industry ? industryEventMetaById.get(industry.industryId) : undefined
      };
    });

  return [...industryItems, ...fundItems];
}

function buildIndustryEventMeta(events: IndustryLongTermEvent[]) {
  const sourceTypes = Array.from(new Set(events.map((event) => event.sourceType)));
  const freshness = Array.from(new Set(events.map((event) => event.freshness)));
  const latestPublishedAt = events
    .map((event) => event.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    eventCount: events.length,
    sourceTypes,
    freshness,
    latestPublishedAt,
    sourceDescription: sourceTypes.length === 1 && sourceTypes[0] === "mock"
      ? "当前为 Mock 行业事件样例；真实资讯第一版仅接手动导入或授权 API，不做非授权网页抓取。"
      : "事件来自授权 API、手动导入或内部维护标签；仅作为长期 thesis 证据，不直接生成买入结论。"
  };
}

function watchlistUniqueKey(item: WatchlistItem | WatchlistSummaryItem) {
  if (item.itemType === "fund") {
    const code = item.fundCode ?? item.itemId.match(/^(?:code|user|top10)-(\d{6})$/)?.[1] ?? (/^\d{6}$/.test(item.itemId) ? item.itemId : null);
    return code ? `fund:${code}` : `fund:${item.itemId}`;
  }

  return `industry:${item.itemId}`;
}

function uniqueWatchlistItems(items: WatchlistItem[]) {
  const seen = new Set<string>();
  const unique: WatchlistItem[] = [];

  for (const item of items) {
    const key = watchlistUniqueKey(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(item);
  }

  return unique;
}

export function buildWatchlistItems(ids: string[], summaryItems: WatchlistSummaryItem[] = []): WatchlistItem[] {
  const baseItems = buildWatchlistBaseItems(ids);
  const summaryMap = new Map(summaryItems.map((item) => [`${item.itemType}:${item.itemId}`, item]));
  const usedKeys = new Set(baseItems.map(watchlistUniqueKey));
  const summaryOnlyItems = summaryItems
    .filter((item) => {
      const aliases = [item.itemId, item.fundCode, item.fundCode ? `user-${item.fundCode}` : null, item.fundCode ? `code-${item.fundCode}` : null].filter(Boolean) as string[];
      return aliases.some((id) => ids.includes(id)) && !usedKeys.has(watchlistUniqueKey(item));
    })
    .map<WatchlistItem>((item) => ({
      itemId: item.itemId,
      itemType: item.itemType,
      fundCode: item.fundCode,
      displayName: item.latestChange.split("：")[0] || item.itemId,
      statusLabel: item.statusLabel,
      latestChange: item.latestChange,
      updatedAt: item.updatedAt || new Date().toISOString(),
      entryLink: item.itemType === "fund" ? (item.fundCode ? `/funds/${item.fundCode}` : "/funds") : `/industries/${item.itemId}`
    }));

  const mergedBase = baseItems.map((item) => {
    const summary = summaryMap.get(`${item.itemType}:${item.itemId}`);
    if (!summary) {
      return item;
    }

    return {
      ...item,
      fundCode: summary.fundCode ?? item.fundCode,
      statusLabel: summary.statusLabel || item.statusLabel,
      latestChange: summary.latestChange || item.latestChange,
      updatedAt: summary.updatedAt || item.updatedAt,
      entryLink: summary.fundCode ? `/funds/${summary.fundCode}` : item.entryLink
    };
  });

  return uniqueWatchlistItems([...mergedBase, ...summaryOnlyItems]);
}

export function mergeWatchlistStrategyStates(items: WatchlistItem[], stateMap: WatchlistStrategyStateMap = readWatchlistStrategyStateMap()): WatchlistItem[] {
  return items.map((item) => {
    const strategyState = fundStrategyStateKeys(item)
      .map((key) => stateMap[key])
      .find(Boolean);

    if (!strategyState) {
      return item;
    }

    return {
      ...item,
      strategyState
    };
  });
}

export function readWatchlistItems(): WatchlistItem[] {
  const ids = readWatchlistIds();
  if (!ids.length) {
    return [];
  }

  return mergeWatchlistStrategyStates(buildWatchlistItems(ids));
}
