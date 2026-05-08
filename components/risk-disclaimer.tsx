export function RiskDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="panel border-amber-200/80 bg-amber-50/90 p-5 text-sm text-amber-950">
      <p className="font-semibold">风险提示</p>
      <p className={compact ? "mt-2" : "mt-3 leading-7"}>
        本产品仅提供信息整理与辅助分析，不构成投资建议。历史表现不代表未来收益，行业与基金均存在波动与回撤风险。
      </p>
    </div>
  );
}
