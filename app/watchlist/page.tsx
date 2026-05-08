"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { RiskDisclaimer } from "@/components/risk-disclaimer";
import { buildWatchlistItems, readPortfolioPositions, readWatchlistIds, readWatchlistItems, STORAGE_KEYS, writeJsonArray } from "@/lib/storage";
import { PortfolioPosition, WatchlistItem } from "@/types";

type SortMode = "latest" | "name";

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

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [refreshMessage, setRefreshMessage] = useState("");
  const [isRefreshingFunds, setIsRefreshingFunds] = useState(false);

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
        const merged = buildWatchlistItems(ids, payload.snapshot?.items ?? []);
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

  const sortedItems = useMemo(() => sortItems(items, sortMode), [items, sortMode]);
  const industryItems = sortedItems.filter((item) => item.itemType === "industry");
  const fundItems = sortedItems.filter((item) => item.itemType === "fund");

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
          <button
            type="button"
            onClick={() => void refreshWatchFunds()}
            disabled={isRefreshingFunds}
            className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshingFunds ? "刷新中..." : "刷新观察基金数据"}
          </button>
        </div>
        {refreshMessage ? <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-6 text-ink/65 ring-1 ring-ink/10">{refreshMessage}</p> : null}
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
              <p className="text-sm text-ink/55">最近变化摘要</p>
              <p className="mt-3 text-sm leading-7 text-ink/68">
                当前观察项按最近更新时间排序，便于优先处理新近变化更明显的主题与基金。
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
              <h2 className="mt-2 text-2xl font-semibold">基金观察</h2>
              <div className="mt-4 grid gap-4">
                {fundItems.map((item) => (
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
          </section>
        </>
      )}

      <RiskDisclaimer compact />
    </div>
  );
}
