"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ManualStrategyAssumptionDraft,
  readManualStrategyAssumptionsForTarget,
  removeManualStrategyAssumption,
  upsertManualStrategyAssumption
} from "@/lib/storage";
import { ManualStrategyAssumption, StrategyConfidence } from "@/types";

type ManualStrategyAssumptionPanelProps = {
  targetType: ManualStrategyAssumption["targetType"];
  fundId?: string;
  fundCode?: string;
  fundName?: string;
  industryId?: string;
  industryName?: string;
  compact?: boolean;
  onAssumptionsChange?: (assumptions: ManualStrategyAssumption[]) => void;
};

type FormState = {
  assumptionId?: string;
  thesisTitle: string;
  hypothesis: string;
  evidenceSourceNote: string;
  confidence: StrategyConfidence;
  invalidationCondition: string;
  nextReviewDate: string;
};

const EMPTY_FORM: FormState = {
  thesisTitle: "",
  hypothesis: "",
  evidenceSourceNote: "",
  confidence: "medium",
  invalidationCondition: "",
  nextReviewDate: ""
};

const CONFIDENCE_OPTIONS: StrategyConfidence[] = ["low", "medium", "high"];

function targetLabel(props: ManualStrategyAssumptionPanelProps) {
  if (props.targetType === "industry") {
    return props.industryName ?? props.industryId ?? "行业";
  }

  return props.fundName ?? props.fundCode ?? props.fundId ?? "基金";
}

function assumptionMatchesTarget(props: ManualStrategyAssumptionPanelProps) {
  return readManualStrategyAssumptionsForTarget({
    targetType: props.targetType,
    fundId: props.fundId,
    fundCode: props.fundCode,
    industryId: props.industryId
  });
}

function formFromAssumption(assumption: ManualStrategyAssumption): FormState {
  return {
    assumptionId: assumption.assumptionId,
    thesisTitle: assumption.thesisTitle,
    hypothesis: assumption.hypothesis,
    evidenceSourceNote: assumption.evidenceSourceNote,
    confidence: assumption.confidence,
    invalidationCondition: assumption.invalidationCondition,
    nextReviewDate: assumption.nextReviewDate ?? ""
  };
}

export function ManualStrategyAssumptionPanel(props: ManualStrategyAssumptionPanelProps) {
  const [assumptions, setAssumptions] = useState<ManualStrategyAssumption[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const title = useMemo(() => targetLabel(props), [props]);

  useEffect(() => {
    setAssumptions(assumptionMatchesTarget(props));
  }, [props.targetType, props.fundId, props.fundCode, props.industryId]);

  function refreshAssumptions(nextMessage?: string) {
    const nextAssumptions = assumptionMatchesTarget(props);
    setAssumptions(nextAssumptions);
    props.onAssumptionsChange?.(nextAssumptions);
    if (nextMessage) {
      setMessage(nextMessage);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function saveAssumption() {
    const hasRequiredText = form.thesisTitle.trim() && form.hypothesis.trim() && form.evidenceSourceNote.trim();
    if (!hasRequiredText) {
      setMessage("请先补充标题、假设内容和证据来源备注。");
      return;
    }

    const draft: ManualStrategyAssumptionDraft = {
      assumptionId: form.assumptionId,
      targetType: props.targetType,
      fundId: props.fundId,
      fundCode: props.fundCode,
      fundName: props.fundName,
      industryId: props.industryId,
      industryName: props.industryName,
      thesisTitle: form.thesisTitle,
      hypothesis: form.hypothesis,
      evidenceSourceNote: form.evidenceSourceNote,
      confidence: form.confidence,
      invalidationCondition: form.invalidationCondition,
      nextReviewDate: form.nextReviewDate || undefined
    };
    upsertManualStrategyAssumption(draft);
    resetForm();
    refreshAssumptions(
      form.invalidationCondition.trim()
        ? "个人假设已保存，并会在下一次系统策略刷新中作为用户假设引用。"
        : "个人假设已保存；补充失效条件后才会参与系统策略刷新。"
    );
  }

  function editAssumption(assumption: ManualStrategyAssumption) {
    setForm(formFromAssumption(assumption));
    setMessage("正在编辑已保存的个人假设。");
  }

  function removeAssumption(assumptionId: string) {
    removeManualStrategyAssumption(assumptionId);
    if (form.assumptionId === assumptionId) {
      resetForm();
    }
    refreshAssumptions("个人假设已移除；系统策略状态会在刷新后同步。");
  }

  return (
    <div className={`${props.compact ? "mt-3" : "mt-4"} rounded-xl bg-white p-4 text-xs leading-6 text-ink/65 ring-1 ring-ink/10`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-ink/78">个人策略假设</p>
          <p className="mt-1 text-ink/55">{title} 的用户假设只作为证据补充；没有失效条件时不会影响系统置信度。</p>
        </div>
        {form.assumptionId ? (
          <button type="button" onClick={resetForm} className="w-fit rounded-full border border-ink/15 px-3 py-1 font-semibold text-ink/70">
            新增一条
          </button>
        ) : null}
      </div>

      {assumptions.length ? (
        <div className="mt-3 space-y-2">
          {assumptions.map((assumption) => (
            <div key={assumption.assumptionId} className="rounded-lg bg-mist/60 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-ink/75">{assumption.thesisTitle}</p>
                  <p className="mt-1">{assumption.hypothesis}</p>
                  <p className="mt-1 text-ink/52">证据备注：{assumption.evidenceSourceNote}</p>
                  <p className={assumption.invalidationCondition ? "mt-1 text-ink/58" : "mt-1 font-semibold text-amber-800"}>
                    失效条件：{assumption.invalidationCondition || "待补充，暂不参与系统策略刷新"}
                  </p>
                  <p className="mt-1 text-ink/48">
                    置信度 {assumption.confidence}
                    {assumption.nextReviewDate ? ` / 下次复核 ${assumption.nextReviewDate}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editAssumption(assumption)} className="rounded-full bg-white px-3 py-1 font-semibold text-pine">
                    编辑
                  </button>
                  <button type="button" onClick={() => removeAssumption(assumption.assumptionId)} className="rounded-full bg-white px-3 py-1 font-semibold text-rose-700">
                    移除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="font-semibold text-ink/65">标题</span>
          <input
            value={form.thesisTitle}
            onChange={(event) => updateForm("thesisTitle", event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
            placeholder="例如：订单兑现观察"
          />
        </label>
        <label className="block">
          <span className="font-semibold text-ink/65">置信度</span>
          <select
            value={form.confidence}
            onChange={(event) => updateForm("confidence", event.target.value as StrategyConfidence)}
            className="mt-1 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
          >
            {CONFIDENCE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="font-semibold text-ink/65">假设内容</span>
          <textarea
            value={form.hypothesis}
            onChange={(event) => updateForm("hypothesis", event.target.value)}
            className="mt-1 min-h-20 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
            placeholder="写下你希望系统后续一起跟踪的个人判断。"
          />
        </label>
        <label className="block">
          <span className="font-semibold text-ink/65">证据来源备注</span>
          <input
            value={form.evidenceSourceNote}
            onChange={(event) => updateForm("evidenceSourceNote", event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
            placeholder="公告、财报、行业新闻或手动导入说明"
          />
        </label>
        <label className="block">
          <span className="font-semibold text-ink/65">下次复核日期</span>
          <input
            type="date"
            value={form.nextReviewDate}
            onChange={(event) => updateForm("nextReviewDate", event.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="font-semibold text-ink/65">失效条件</span>
          <textarea
            value={form.invalidationCondition}
            onChange={(event) => updateForm("invalidationCondition", event.target.value)}
            className="mt-1 min-h-16 w-full rounded-lg border border-ink/10 bg-mist/40 px-3 py-2 outline-none focus:border-pine/40"
            placeholder="例如：订单未兑现、回撤超阈值、行业事件转弱或持仓集中度超限。"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={saveAssumption} className="rounded-full bg-pine px-4 py-2 font-semibold text-white">
          {form.assumptionId ? "保存修改" : "保存假设"}
        </button>
        {message ? <span className="text-ink/55">{message}</span> : null}
      </div>
    </div>
  );
}
