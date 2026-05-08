import csv
import hashlib
import shutil
from contextlib import suppress
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

from config.settings import get_settings
from db.connection import get_connection


def build_batch_id(trade_date: date | None = None) -> str:
    current = trade_date or date.today()
    return f"{current.isoformat()}_{datetime.now().strftime('%H%M%S')}"


def resolve_trade_date(value: str | None = None) -> date:
    if value:
        return date.fromisoformat(value)
    return date.today()


def get_runtime_dropzone_dir() -> Path:
    return Path(get_settings().runtime_dropzone_dir)


def get_runtime_archive_dir() -> Path:
    return Path(get_settings().runtime_data_archive_dir)


def get_trade_dropzone_dir(trade_date: date) -> Path:
    return get_runtime_dropzone_dir() / trade_date.isoformat()


def get_trade_archive_raw_dir(trade_date: date) -> Path:
    return get_runtime_archive_dir() / "raw" / trade_date.isoformat()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_dropzone_csv(trade_date: date, relative_path: str, fieldnames: list[str], rows: Iterable[dict[str, object]]) -> Path:
    destination = ensure_directory(get_trade_dropzone_dir(trade_date) / Path(relative_path).parent) / Path(relative_path).name
    with destination.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return destination


def log_job_start(job_name: str, batch_id: str, trade_date: date | None = None) -> None:
    print(f"[START] {job_name} batch={batch_id}")
    with suppress(Exception):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into job_run_log (
                        job_name, batch_id, trade_date, run_status, started_at, created_at, updated_at
                    )
                    values (%s, %s, %s, 'running', now(), now(), now())
                    """,
                    (job_name, batch_id, trade_date),
                )
            conn.commit()


def log_job_end(
    job_name: str,
    batch_id: str,
    trade_date: date | None = None,
    run_status: str = "success",
    processed_count: int | None = None,
    error_message: str | None = None,
) -> None:
    print(f"[END] {job_name} batch={batch_id} status={run_status}")
    with suppress(Exception):
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    update job_run_log
                    set trade_date = coalesce(trade_date, %s),
                        run_status = %s,
                        ended_at = now(),
                        processed_count = %s,
                        error_message = %s,
                        updated_at = now()
                    where job_name = %s and batch_id = %s
                    """,
                    (trade_date, run_status, processed_count, error_message, job_name, batch_id),
                )
            conn.commit()


def compute_checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def count_csv_rows(path: Path) -> int:
    with path.open("r", encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        return sum(1 for _ in reader)


def record_source_ingestion(
    source_name: str,
    batch_id: str,
    trade_date: date,
    file_path: Path | None,
    row_count: int,
    checksum: str | None,
    ingestion_status: str,
    message: str,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into source_ingestion_audit (
                    source_name, batch_id, trade_date, file_path, row_count, checksum,
                    ingestion_status, message, created_at, updated_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, now(), now())
                """,
                (
                    source_name,
                    batch_id,
                    trade_date,
                    str(file_path) if file_path else None,
                    row_count,
                    checksum,
                    ingestion_status,
                    message,
                ),
            )
        conn.commit()


def archive_dropzone_file(
    source_name: str,
    batch_id: str,
    trade_date: date,
    relative_path: str,
) -> tuple[Path | None, int]:
    source_path = get_trade_dropzone_dir(trade_date) / relative_path
    if not source_path.exists():
        record_source_ingestion(
            source_name=source_name,
            batch_id=batch_id,
            trade_date=trade_date,
            file_path=source_path,
            row_count=0,
            checksum=None,
            ingestion_status="missing",
            message="Source file not found in manual drop zone.",
        )
        return None, 0

    destination_dir = ensure_directory(get_trade_archive_raw_dir(trade_date) / Path(relative_path).parent)
    destination_path = destination_dir / source_path.name
    if destination_path.exists():
        destination_path.unlink()
    # On Windows local runs, copy2 occasionally fails while preserving metadata even
    # though the file itself is writable. A plain file copy is more robust for our
    # archival use case and is sufficient because checksums are recorded separately.
    shutil.copyfile(source_path, destination_path)

    row_count = count_csv_rows(destination_path) if destination_path.suffix.lower() == ".csv" else 0
    checksum = compute_checksum(destination_path)
    record_source_ingestion(
        source_name=source_name,
        batch_id=batch_id,
        trade_date=trade_date,
        file_path=destination_path,
        row_count=row_count,
        checksum=checksum,
        ingestion_status="archived",
        message="Source file copied to raw archive.",
    )
    return destination_path, row_count
