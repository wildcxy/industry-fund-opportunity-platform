from jobs.shared import build_batch_id, log_job_end, log_job_start


def main() -> None:
    job_name = "market-calendar-check"
    batch_id = build_batch_id()
    log_job_start(job_name, batch_id)
    print("TODO: 判断当前是否为交易日，并决定是否继续执行盘后主流程。")
    log_job_end(job_name, batch_id)


if __name__ == "__main__":
    main()
