from jobs.shared import build_batch_id, log_job_end, log_job_start


def main() -> None:
    job_name = "data-quality-check"
    batch_id = build_batch_id()
    log_job_start(job_name, batch_id)
    print("TODO: 执行阻断级与告警级质量校验，决定是否允许发布。")
    log_job_end(job_name, batch_id)


if __name__ == "__main__":
    main()
