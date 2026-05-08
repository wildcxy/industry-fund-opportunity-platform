from db.connection import get_connection


def ping_database() -> str:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("select 'ok'")
            row = cur.fetchone()
            return row[0] if row else "unknown"
