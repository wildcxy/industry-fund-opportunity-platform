from psycopg.rows import dict_row

from db.connection import get_connection


def get_homepage_snapshot() -> dict | None:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select trade_date, data_version, updated_at, snapshot_payload
                from homepage_snapshot_daily
                where status = 'published'
                order by trade_date desc, updated_at desc
                limit 1
                """
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "tradeDate": row["trade_date"].isoformat() if row["trade_date"] else None,
                "dataVersion": row["data_version"],
                "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
                "data": row["snapshot_payload"],
            }


def get_industry_detail_snapshot(industry_id: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select trade_date, data_version, updated_at, snapshot_payload
                from industry_detail_snapshot_daily
                where industry_id = %s and status = 'published'
                order by trade_date desc, updated_at desc
                limit 1
                """,
                (industry_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "tradeDate": row["trade_date"].isoformat() if row["trade_date"] else None,
                "dataVersion": row["data_version"],
                "updatedAt": row["updated_at"].isoformat() if row["updated_at"] else None,
                "data": row["snapshot_payload"],
            }
