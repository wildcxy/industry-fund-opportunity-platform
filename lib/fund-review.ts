import { FundListItem } from "@/types";

export type FundReviewSeverity = "low" | "medium" | "high";

export type FundReviewMetric = {
  label: string;
  value: string;
  note: string;
};

export type ShortTermReview = {
  level: FundReviewSeverity;
  badgeLabel: string;
  toneClass: string;
  title: string;
  summary: string;
  metrics: FundReviewMetric[];
  actions: string[];
};

function hasNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

function percent(value: number | null | undefined) {
  if (!hasNumber(value)) return "--";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function nav(value: number | null | undefined) {
  if (!hasNumber(value)) return "--";
  return value.toFixed(4);
}

export function buildShortTermReview(fund: FundListItem): ShortTermReview {
  const return1d = fund.return1d;
  const return1m = fund.return1m;
  const return3m = fund.return3m;
  const maxDrawdown = fund.maxDrawdown;
  const volatility = fund.volatility;

  const strongDay = hasNumber(return1d) && return1d >= 2.5;
  const strongMonth = hasNumber(return1m) && return1m >= 6;
  const strongQuarter = hasNumber(return3m) && return3m >= 12;
  const deepDrawdown = hasNumber(maxDrawdown) && maxDrawdown <= -18;
  const highVolatility = hasNumber(volatility) && volatility >= 25;
  const weakQuarter = hasNumber(return3m) && return3m <= -10;

  let level: FundReviewSeverity = "low";
  let badgeLabel = "走势待观察";
  let title = "短期走势没有明显极端信号";
  let summary = "当前更适合继续跟踪净值、回撤和主题基本面，不应只用单日涨跌做判断。";

  if ((strongMonth && strongQuarter) || (strongDay && strongQuarter)) {
    level = highVolatility || deepDrawdown ? "high" : "medium";
    badgeLabel = "连续上涨留意回调";
    title = "短期连续上涨，注意追高后的回调风险";
    summary =
      "近 1 月与近 3 月表现同时偏强时，说明资金或主题情绪较热；如果叠加高波动或历史回撤较深，复盘时要优先确认是否已经出现拥挤。";
  } else if (strongMonth || strongDay) {
    level = "medium";
    badgeLabel = "短期升温";
    title = "短期涨幅升温，适合观察持续性";
    summary = "短期涨幅已经开始抬升，复盘重点是确认涨幅来自主题趋势、净值修复，还是单日波动。";
  } else if (weakQuarter) {
    level = "medium";
    badgeLabel = "阶段回撤明显";
    title = "阶段表现偏弱，关注是否进入左侧观察区";
    summary = "近 3 月跌幅较大时，不代表可以直接买入；需要结合行业景气、估值分位、持仓质量和后续催化再判断。";
  } else if (deepDrawdown || highVolatility) {
    level = "medium";
    badgeLabel = "波动风险偏高";
    title = "波动或回撤偏高，先确认风险承受能力";
    summary = "基金历史波动较大，长期持有前要先确认自己能否接受净值回撤，而不是只看短期收益。";
  }

  const toneClass =
    level === "high"
      ? "bg-rose-50 text-rose-700"
      : level === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-mist text-pine";

  const actions =
    level === "high"
      ? [
          "不要只因为短期强势直接追高，先看是否连续多日过热。",
          "观察同主题基金是否普遍上涨，如果普涨过快，回调概率会抬升。",
          "结合最大回撤和波动率，确认自己能承受的仓位上限。"
        ]
      : level === "medium"
        ? [
            "把该基金加入观察或持仓复盘，连续 3 到 5 个交易日跟踪涨跌变化。",
            "对比同主题低费率、低回撤基金，确认它是否真的更适合长期持有。",
            "如果数据缺失，先补齐净值、规模、费率和持仓披露后再做判断。"
          ]
        : [
            "继续观察昨日涨跌、近 1 月走势和最大回撤是否出现变化。",
            "优先补齐费用规则、持仓披露和同主题对比数据。",
            "不把单日涨跌当作买卖依据。"
          ];

  return {
    level,
    badgeLabel,
    toneClass,
    title,
    summary,
    metrics: [
      { label: "昨日涨跌", value: percent(return1d), note: "盘后更新口径，可理解为最新已披露交易日净值变化。" },
      { label: "近 1 月", value: percent(return1m), note: "用于判断短期是否快速升温。" },
      { label: "近 3 月", value: percent(return3m), note: "用于判断主题趋势是否已经连续走强或走弱。" },
      { label: "最大回撤", value: percent(maxDrawdown), note: "衡量历史下跌压力，数值越负代表回撤越深。" },
      { label: "波动率", value: percent(volatility), note: "衡量净值波动强度，越高越需要控制仓位。" },
      { label: "最新/前值净值", value: `${nav(fund.latestNav)} / ${nav(fund.previousNav)}`, note: "用于解释昨日涨跌的净值来源。" }
    ],
    actions
  };
}

export function buildFundDataQualityNotes(fund: FundListItem) {
  const notes: string[] = [];

  if (fund.dataCompleteness === "pending") {
    notes.push("该基金仍处于待采集状态，暂时不能用于严肃比较。");
  }
  if (fund.dataCompleteness === "failed") {
    notes.push("最近一次采集失败，建议刷新或稍后重试。");
  }
  if (fund.dataCompleteness === "partial") {
    notes.push("部分指标缺失，页面会展示已有真实数据，但不会用演示值补位。");
  }
  if (!hasNumber(fund.return1d)) {
    notes.push("昨日涨跌暂缺，可能是净值尚未披露、QDII 延迟或接口未返回日度点位。");
  }
  if (!fund.feeRuleSummary && (!fund.holdingCostSummary || fund.holdingCostSummary.length === 0)) {
    notes.push("费用与赎回规则待补充，长期持有成本比较暂不完整。");
  }
  if (!hasNumber(fund.aum) || fund.aum <= 0) {
    notes.push("规模数据待补充，无法判断规模过小或流动性风险。");
  }

  return notes.length ? notes : ["当前核心快照字段相对完整，可进入收益、风险、费用和持仓复盘。"];
}
