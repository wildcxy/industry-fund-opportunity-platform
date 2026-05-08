import os

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start, resolve_trade_date


DATA_VERSION = "manual-drop-v1"


def risk_level_to_score(risk_level: str | None) -> int:
    mapping = {"低": 35, "中": 60, "高": 82}
    return mapping.get(risk_level or "", 60)


def label_for_scores(opportunity_score: int, valuation_score: float | None, risk_score: int) -> str:
    valuation = valuation_score or 0
    if opportunity_score >= 82 and risk_score < 75:
        return "机会增强"
    if valuation >= 80:
        return "低位关注"
    if risk_score >= 75:
        return "高热观察"
    return "趋势确认"


def summary_for_label(label: str, industry_name: str) -> str:
    mapping = {
        "机会增强": f"{industry_name}当前呈现趋势、资金与产业催化共振，可作为重点观察方向。",
        "低位关注": f"{industry_name}更偏估值修复与中期观察逻辑，适合等待进一步验证。",
        "高热观察": f"{industry_name}热度较高，短期需要平衡强趋势与拥挤风险。",
        "趋势确认": f"{industry_name}处于趋势逐步清晰阶段，适合持续跟踪。"
    }
    return mapping[label]


def focus_reason_for_label(label: str) -> str:
    mapping = {
        "机会增强": "趋势、资金与催化形成共振，适合作为当前重点跟踪方向。",
        "低位关注": "估值位置更有吸引力，适合纳入中期观察清单。",
        "高热观察": "趋势很强但热度较高，更适合控制节奏地跟踪。",
        "趋势确认": "趋势信号逐步增强，可继续观察后续资金与事件变化。"
    }
    return mapping[label]


def tags_for_row(row: dict) -> list[str]:
    tags: list[str] = []
    if (row["capital_score"] or 0) >= 85:
        tags.append("资金回流")
    if (row["trend_score"] or 0) >= 80:
        tags.append("趋势强化")
    if (row["valuation_score"] or 0) >= 80:
        tags.append("估值改善")
    if (row["risk_score"] or 0) >= 75:
        tags.append("拥挤度抬升")
    if not tags:
        tags.append("持续观察")
    return tags[:3]


def main() -> None:
    trade_date = resolve_trade_date(os.getenv("TRADE_DATE"))
    job_name = "opportunity-score-daily"
    batch_id = build_batch_id(trade_date)
    log_job_start(job_name, batch_id, trade_date)

    processed_count = 0
    try:
        with get_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(
                    """
                    select idm.*, im.industry_name
                    from industry_daily_metrics idm
                    join industry_master im on im.industry_id = idm.industry_id
                    where idm.trade_date = %s and idm.data_version = %s
                    """,
                    (trade_date, DATA_VERSION),
                )
                rows = cur.fetchall()

                cur.execute(
                    "delete from industry_opportunity_daily where trade_date = %s and data_version = %s",
                    (trade_date, DATA_VERSION),
                )

                for row in rows:
                    risk_score = int(row["risk_score"] or risk_level_to_score(row["risk_level"]))
                    opportunity_score = round(
                        (float(row["trend_score"] or 0) * 0.35)
                        + (float(row["capital_score"] or 0) * 0.35)
                        + (float(row["valuation_score"] or 0) * 0.2)
                        + ((100 - risk_score) * 0.1)
                    )
                    label = label_for_scores(opportunity_score, row["valuation_score"], risk_score)
                    summary = summary_for_label(label, row["industry_name"])
                    tags = tags_for_row(row)

                    cur.execute(
                        """
                        insert into industry_opportunity_daily (
                            trade_date, industry_id, opportunity_score, trend_score, capital_score, valuation_score,
                            risk_level, label, summary, tags_json, methodology_json, focus_reason,
                            source_batch_id, data_version, created_at, updated_at
                        )
                        values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                        """,
                        (
                            trade_date,
                            row["industry_id"],
                            opportunity_score,
                            row["trend_score"],
                            row["capital_score"],
                            row["valuation_score"],
                            row["risk_level"],
                            label,
                            summary,
                            Jsonb(tags),
                            Jsonb(
                                {
                                    "title": "评分口径",
                                    "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"
                                }
                            ),
                            focus_reason_for_label(label),
                            batch_id,
                            DATA_VERSION,
                        ),
                    )
                    processed_count += 1
            conn.commit()

        status = "success" if processed_count > 0 else "skipped"
        print(f"Opportunity scores built rows={processed_count}")
        log_job_end(job_name, batch_id, trade_date, run_status=status, processed_count=processed_count)
    except Exception as exc:
        log_job_end(job_name, batch_id, trade_date, run_status="failed", processed_count=processed_count, error_message=str(exc))
        raise


if __name__ == "__main__":
    main()
