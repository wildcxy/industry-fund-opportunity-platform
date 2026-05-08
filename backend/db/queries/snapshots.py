from db.connection import get_connection


def get_latest_publish_status() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select batch_id, trade_date, publish_status, published_at
                from data_publish_batch
                order by created_at desc
                limit 1
                """
            )
            row = cur.fetchone()

            if not row:
                return {
                    "hasPublishedData": False,
                    "batchId": None,
                    "tradeDate": None,
                    "publishStatus": "none",
                    "publishedAt": None,
                }

            return {
                "hasPublishedData": True,
                "batchId": row[0],
                "tradeDate": row[1].isoformat() if row[1] else None,
                "publishStatus": row[2],
                "publishedAt": row[3].isoformat() if row[3] else None,
            }


def count_rows(table_name: str) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(f"select count(*) from {table_name}")
            row = cur.fetchone()
            return int(row[0]) if row else 0
