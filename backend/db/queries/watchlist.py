from psycopg.rows import dict_row

from db.connection import get_connection


def get_watchlist_summary_snapshot() -> dict:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select trade_date, data_version, updated_at, item_type, item_id, status_label, latest_change, watch_hint
                from (
                    select distinct on (item_type, item_id) *
                    from watchlist_change_summary_daily
                    order by item_type, item_id, trade_date desc, updated_at desc
                ) latest
                order by item_type, item_id
                """
            )
            rows = cur.fetchall()
            cur.execute(
                """
                select
                    'fund' as item_type,
                    fm.fund_id as item_id,
                    fm.fund_code,
                    case
                        when fdm.return_1d is null then '净值待更新'
                        when fdm.return_1d >= 3 then '昨日强势'
                        when fdm.return_1d <= -3 then '昨日回撤'
                        else '真实快照'
                    end as status_label,
                    concat(
                        fm.fund_name,
                        '：昨日涨跌 ',
                        coalesce(to_char(fdm.return_1d, 'FM999990.00'), '--'),
                        '%，近3月 ',
                        coalesce(to_char(fdm.return_3m, 'FM999990.00'), '--'),
                        '%，主题 ',
                        fm.theme,
                        '。'
                    ) as latest_change,
                    '持仓基金默认进入观察池；该摘要来自最新盘后基金快照，不构成买卖建议。' as watch_hint,
                    fdm.trade_date,
                    fdm.data_version,
                    fdm.updated_at
                from fund_master fm
                join lateral (
                    select *
                    from fund_daily_metrics m
                    where m.fund_id = fm.fund_id
                    order by m.trade_date desc, m.updated_at desc
                    limit 1
                ) fdm on true
                order by fm.fund_id
                """
            )
            fund_rows = cur.fetchall()

    all_rows = [*rows, *fund_rows]
    trade_date = all_rows[0]["trade_date"].isoformat() if all_rows else None
    data_version = all_rows[0]["data_version"] if all_rows else None
    updated_at = all_rows[0]["updated_at"].isoformat() if all_rows else None

    return {
        "tradeDate": trade_date,
        "dataVersion": data_version,
        "updatedAt": updated_at,
        "items": [
            {
                "itemType": row["item_type"],
                "itemId": row["item_id"],
                "fundCode": row["fund_code"] if "fund_code" in row else None,
                "statusLabel": row["status_label"],
                "latestChange": row["latest_change"],
                "watchHint": row["watch_hint"],
                "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
            }
            for row in all_rows
        ],
    }
