from datetime import date
from uuid import uuid4

from psycopg.rows import dict_row

from db.connection import get_connection


DEFAULT_THEME = "自选基金"
PENDING_STATUS = "pending"
COLLECTING_STATUS = "collecting"
READY_STATUS = "ready"
FAILED_STATUS = "failed"


def normalize_fund_code(fund_code: str) -> str:
    return str(fund_code or "").strip().zfill(6)


def make_user_fund_id(fund_code: str) -> str:
    return f"user-{normalize_fund_code(fund_code)}"


def get_existing_fund_id(fund_code: str) -> str | None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("select fund_id from fund_master where fund_code = %s", (normalized,))
            row = cur.fetchone()
    return row["fund_id"] if row else None


def get_candidate_by_code(fund_code: str) -> dict | None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select *
                from fund_candidate_request
                where fund_code = %s
                """,
                (normalized,),
            )
            row = cur.fetchone()
    return dict(row) if row else None


def list_candidate_statuses() -> dict[str, dict]:
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select candidate.*, task.task_status, task.attempt_count, task.last_error_message as task_error_message
                from fund_candidate_request candidate
                left join lateral (
                    select *
                    from fund_collection_task task
                    where task.fund_code = candidate.fund_code
                    order by task.created_at desc
                    limit 1
                ) task on true
                """
            )
            rows = cur.fetchall()

    return {row["fund_code"]: _serialize_status(row) for row in rows}


def upsert_candidate(
    *,
    fund_code: str,
    fund_name_query: str | None,
    matched_fund_name: str,
    matched_fund_type: str | None,
    matched_fund_company: str | None,
    theme: str | None = None,
    tracking_target: str | None = None,
    source_name: str = "akshare",
) -> dict:
    normalized = normalize_fund_code(fund_code)
    fund_id = get_existing_fund_id(normalized) or make_user_fund_id(normalized)
    request_id = f"candidate-{normalized}"
    selected_theme = theme or DEFAULT_THEME
    selected_tracking_target = tracking_target or matched_fund_name

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                insert into fund_candidate_request (
                    request_id, fund_id, fund_code, fund_name_query, matched_fund_name,
                    matched_fund_type, matched_fund_company, theme, tracking_target,
                    source_name, request_status, created_at, updated_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                on conflict (fund_code) do update
                set fund_id = excluded.fund_id,
                    fund_name_query = excluded.fund_name_query,
                    matched_fund_name = excluded.matched_fund_name,
                    matched_fund_type = excluded.matched_fund_type,
                    matched_fund_company = excluded.matched_fund_company,
                    theme = excluded.theme,
                    tracking_target = excluded.tracking_target,
                    source_name = excluded.source_name,
                    updated_at = now()
                returning *
                """,
                (
                    request_id,
                    fund_id,
                    normalized,
                    fund_name_query,
                    matched_fund_name,
                    matched_fund_type,
                    matched_fund_company,
                    selected_theme,
                    selected_tracking_target,
                    source_name,
                    PENDING_STATUS,
                ),
            )
            row = cur.fetchone()
        conn.commit()

    return _serialize_candidate(row)


def create_collection_task(fund_id: str, fund_code: str) -> dict:
    normalized = normalize_fund_code(fund_code)
    task_id = f"collect-{normalized}-{uuid4().hex[:10]}"
    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                insert into fund_collection_task (
                    task_id, fund_id, fund_code, task_status, attempt_count, created_at, updated_at
                )
                values (%s, %s, %s, %s, 0, now(), now())
                returning *
                """,
                (task_id, fund_id, normalized, PENDING_STATUS),
            )
            row = cur.fetchone()
        conn.commit()
    return dict(row)


def mark_collection_started(task_id: str, fund_code: str) -> None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update fund_collection_task
                set task_status = %s,
                    attempt_count = attempt_count + 1,
                    started_at = now(),
                    updated_at = now()
                where task_id = %s
                """,
                (COLLECTING_STATUS, task_id),
            )
            cur.execute(
                """
                update fund_candidate_request
                set request_status = %s,
                    last_error_message = null,
                    updated_at = now()
                where fund_code = %s
                """,
                (COLLECTING_STATUS, normalized),
            )
        conn.commit()


def mark_collection_success(task_id: str, fund_code: str, trade_date: date) -> None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update fund_collection_task
                set task_status = %s,
                    last_success_trade_date = %s,
                    last_error_message = null,
                    ended_at = now(),
                    updated_at = now()
                where task_id = %s
                """,
                (READY_STATUS, trade_date, task_id),
            )
            cur.execute(
                """
                update fund_candidate_request
                set request_status = %s,
                    last_success_trade_date = %s,
                    last_error_message = null,
                    updated_at = now()
                where fund_code = %s
                """,
                (READY_STATUS, trade_date, normalized),
            )
        conn.commit()


def mark_collection_failed(task_id: str, fund_code: str, message: str) -> None:
    normalized = normalize_fund_code(fund_code)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                update fund_collection_task
                set task_status = %s,
                    last_error_message = %s,
                    ended_at = now(),
                    updated_at = now()
                where task_id = %s
                """,
                (FAILED_STATUS, message[:1000], task_id),
            )
            cur.execute(
                """
                update fund_candidate_request
                set request_status = %s,
                    last_error_message = %s,
                    updated_at = now()
                where fund_code = %s
                """,
                (FAILED_STATUS, message[:1000], normalized),
            )
        conn.commit()


def get_collection_status(fund_code: str) -> dict:
    candidate = get_candidate_by_code(fund_code)
    if not candidate:
        return {
            "fundCode": normalize_fund_code(fund_code),
            "candidateStatus": "not_added",
            "taskStatus": None,
            "lastSuccessTradeDate": None,
            "lastErrorMessage": None,
        }

    with get_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select *
                from fund_collection_task
                where fund_code = %s
                order by created_at desc
                limit 1
                """,
                (candidate["fund_code"],),
            )
            task = cur.fetchone()

    return {
        "fundId": candidate["fund_id"],
        "fundCode": candidate["fund_code"],
        "fundName": candidate["matched_fund_name"],
        "candidateStatus": candidate["request_status"],
        "taskStatus": task["task_status"] if task else None,
        "attemptCount": task["attempt_count"] if task else 0,
        "lastSuccessTradeDate": (
            candidate["last_success_trade_date"].isoformat() if candidate["last_success_trade_date"] else None
        ),
        "lastErrorMessage": candidate["last_error_message"] or (task["last_error_message"] if task else None),
    }


def _serialize_candidate(row: dict) -> dict:
    return {
        "requestId": row["request_id"],
        "fundId": row["fund_id"],
        "fundCode": row["fund_code"],
        "fundName": row["matched_fund_name"],
        "fundType": row["matched_fund_type"],
        "fundCompany": row["matched_fund_company"],
        "theme": row["theme"],
        "trackingTarget": row["tracking_target"],
        "sourceName": row["source_name"],
        "candidateStatus": row["request_status"],
        "lastSuccessTradeDate": row["last_success_trade_date"].isoformat() if row["last_success_trade_date"] else None,
        "lastErrorMessage": row["last_error_message"],
    }


def _serialize_status(row: dict) -> dict:
    error_message = row["last_error_message"] or row.get("task_error_message")
    return {
        "fundId": row["fund_id"],
        "fundCode": row["fund_code"],
        "fundName": row["matched_fund_name"],
        "candidateStatus": row["request_status"],
        "taskStatus": row.get("task_status"),
        "attemptCount": row.get("attempt_count") or 0,
        "lastSuccessTradeDate": row["last_success_trade_date"].isoformat() if row["last_success_trade_date"] else None,
        "lastErrorMessage": error_message,
    }
