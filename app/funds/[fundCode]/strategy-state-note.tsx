"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ManualStrategyAssumptionPanel } from "@/components/manual-strategy-assumption-panel";
import { readWatchlistStrategyState } from "@/lib/storage";
import { SystemStrategyConclusion, SystemStrategyConclusionResult, WatchlistStrategyState } from "@/types";

const STAGE_LABELS: Record<WatchlistStrategyState["stage"], string> = {
  watching: "普通观察",
  scoring: "评分中",
  buy_plan_draft: "计划草稿",
  paused: "暂停观察",
  removed: "移出池"
};

const STAGE_TONES: Record<WatchlistStrategyState["stage"], string> = {
  watching: "bg-sky-50 text-sky-700",
  scoring: "bg-amber-50 text-amber-700",
  buy_plan_draft: "bg-teal-50 text-teal-700",
  paused: "bg-rose-50 text-rose-700",
  removed: "bg-rose-50 text-rose-700"
};

function SystemConclusionPanel({ conclusion }: { conclusion?: SystemStrategyConclusion }) {
  if (!conclusion) return null;
  const blockingRules = conclusion.triggeredRules.filter((rule) => !rule.passed);

  return (
    <div className="mt-3 rounded-xl bg-white p-4 text-sm leading-6 text-ink/62 ring-1 ring-ink/10">
      <p className="font-semibold text-ink/72">System conclusion</p>
      <p className="mt-1">{SYSTEM_CONCLUSION_LABELS[conclusion.conclusionResult]} · {conclusion.conclusionTime}</p>
      <p className="mt-1">{conclusion.dataSnapshotSummary}</p>
      {conclusion.relatedAiEvidenceIds.length ? <p className="mt-1">AI evidence refs: {conclusion.relatedAiEvidenceIds.join(", ")}</p> : null}
      {blockingRules.length ? <p className="mt-1 text-amber-800">Blocking rule: {blockingRules[0].label} - {blockingRules[0].message}</p> : null}
      {conclusion.riskVetoes.length ? <p className="mt-1 text-rose-700">Risk vetoes: {conclusion.riskVetoes.join("; ")}</p> : null}
      <p className="mt-1 text-ink/48">{conclusion.note}</p>
    </div>
  );
}

const SYSTEM_CONCLUSION_LABELS: Record<SystemStrategyConclusionResult, string> = {
  system_plan_draft_ready: "系统草稿条件满足",
  system_watch_continue: "系统继续观察",
  system_risk_blocked: "系统风险阻断",
  system_need_more_evidence: "系统证据不足"
};

export function StrategyStateNote({ fundId, fundCode, fundName }: { fundId: string; fundCode: string; fundName: string }) {
  const [state, setState] = useState<WatchlistStrategyState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setState(readWatchlistStrategyState(fundId, fundCode) ?? null);
    setLoaded(true);
  }, [fundId, fundCode]);

  if (!loaded) {
    return (
      <section className="panel p-6">
        <p className="eyebrow">Strategy State</p>
        <p className="mt-3 text-sm text-ink/60">正在读取本地策略状态...</p>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Strategy State</p>
            <h2 className="mt-2 text-2xl font-semibold">尚未生成策略状态</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/65">
              {fundName} 当前没有本地策略状态。可以先加入观察池，再在“我的观察”中生成或刷新系统策略结论。
            </p>
          </div>
          <Link href="/watchlist" className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
            去我的观察
          </Link>
        </div>
        <ManualStrategyAssumptionPanel targetType="fund" fundId={fundId} fundCode={fundCode} fundName={fundName} />
      </section>
    );
  }

  const riskVetoes = state.riskVetoes?.filter(Boolean) ?? [];

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">Strategy State</p>
          <h2 className="mt-2 text-2xl font-semibold">观察池策略状态</h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded-full px-3 py-1 ${STAGE_TONES[state.stage]}`}>{STAGE_LABELS[state.stage]}</span>
            {typeof state.strategyScore === "number" ? <span className="rounded-full bg-mist px-3 py-1 text-pine">策略分 {state.strategyScore}</span> : null}
            {state.confidence ? <span className="rounded-full bg-mist px-3 py-1 text-pine">置信度 {state.confidence}</span> : null}
            {state.systemConclusionResult ? <span className="rounded-full bg-mist px-3 py-1 text-pine">{SYSTEM_CONCLUSION_LABELS[state.systemConclusionResult]}</span> : null}
          </div>
        </div>
        <Link href="/watchlist" className="w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          去我的观察
        </Link>
      </div>

      {state.reason ? <p className="mt-4 text-sm leading-7 text-ink/68">{state.reason}</p> : null}
      {state.nextAction ? <p className="mt-3 rounded-xl bg-mist/60 p-4 text-sm leading-6 text-ink/70">下一步：{state.nextAction}</p> : null}
      <SystemConclusionPanel conclusion={state.systemConclusion} />
      {riskVetoes.length ? <p className="mt-3 rounded-xl bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">风险 veto：{riskVetoes.join("；")}</p> : null}
      {state.missingEvidence?.length ? (
        <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          仍有 {state.missingEvidence.length} 项证据需要补齐，完整原因请回到“我的观察”查看。
        </p>
      ) : null}
      {state.manualAssumptionRefs?.length ? (
        <div className="mt-3 rounded-xl bg-white p-4 text-sm leading-6 text-ink/62 ring-1 ring-ink/10">
          <p className="font-semibold text-ink/72">用户假设引用</p>
          {state.manualAssumptionRefs.map((assumption) => (
            <p key={assumption.assumptionId} className="mt-1">
              {assumption.thesisTitle ? `${assumption.thesisTitle}：` : ""}
              {assumption.hypothesis} 失效条件：{assumption.invalidationCondition}
            </p>
          ))}
        </div>
      ) : null}
      {state.backtestSummary ? (
        <p className="mt-3 rounded-xl bg-white p-4 text-sm leading-6 text-ink/60 ring-1 ring-ink/10">
          历史验证：{state.backtestSummary.sampleStartDate} 至 {state.backtestSummary.sampleEndDate}，最大回撤 {state.backtestSummary.maxDrawdownPercent ?? "待补"}%。该信息仅用于历史验证和不确定性检查。
        </p>
      ) : null}
      {state.nextReviewDate ? <p className="mt-3 text-xs text-ink/48">下次系统复核：{state.nextReviewDate}</p> : null}
      {state.backtestSummary ? (
        <div className="mt-2 rounded-xl bg-white p-4 text-sm leading-6 text-ink/60 ring-1 ring-ink/10">
          <p>
            Return: {state.backtestSummary.returnPercent ?? "pending"}%; benchmark: {state.backtestSummary.benchmarkReturnPercent ?? "pending"}%; volatility: {state.backtestSummary.volatilityPercent ?? "pending"}%; sample size: {state.backtestSummary.sampleSize ?? "pending"}; overfit risk: {state.backtestSummary.overfitRisk}.
          </p>
          {state.backtestSummary.limitations.length ? <p className="mt-1">{state.backtestSummary.limitations[0]}</p> : null}
        </div>
      ) : null}
      <ManualStrategyAssumptionPanel
        targetType="fund"
        fundId={fundId}
        fundCode={fundCode}
        fundName={fundName}
        onAssumptionsChange={() => {
          setState(readWatchlistStrategyState(fundId, fundCode) ?? null);
        }}
      />
    </section>
  );
}
