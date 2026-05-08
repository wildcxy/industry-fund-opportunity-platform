from psycopg.rows import dict_row

from db.connection import get_connection


def main() -> None:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select 'fund_daily_metrics' as table_name, count(*) as total,
                       count(*) filter (where aum is null) as null_count,
                       min(aum) as min_aum,
                       max(aum) as max_aum,
                       count(*) filter (where aum >= 1000000) as huge_count,
                       count(*) filter (where aum > 1000 and aum < 1000000) as suspicious_count
                from fund_daily_metrics
                union all
                select 'fund_compare_daily', count(*), count(*) filter (where aum is null),
                       min(aum), max(aum),
                       count(*) filter (where aum >= 1000000),
                       count(*) filter (where aum > 1000 and aum < 1000000)
                from fund_compare_daily
                """
            )
            summary_rows = cur.fetchall()

            cur.execute(
                """
                select fm.fund_code, fm.fund_name, fdm.trade_date, fdm.aum
                from fund_master fm
                join fund_daily_metrics fdm on fdm.fund_id = fm.fund_id
                where fdm.aum > 1000
                order by fdm.aum desc
                limit 50
                """
            )
            suspicious_rows = cur.fetchall()

    for row in summary_rows:
        print(
            f"{row['table_name']}: total={row['total']} null={row['null_count']} "
            f"min={row['min_aum']} max={row['max_aum']} "
            f"huge={row['huge_count']} suspicious={row['suspicious_count']}"
        )

    if suspicious_rows:
        print("Suspicious AUM rows:")
        for row in suspicious_rows:
            print(f"{row['fund_code']} {row['fund_name']} {row['trade_date']} aum={row['aum']}")
        raise RuntimeError("AUM quality check failed.")

    print("AUM quality check passed.")


if __name__ == "__main__":
    main()
