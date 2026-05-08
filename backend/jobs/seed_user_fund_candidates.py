from db.queries.fund_candidates import upsert_candidate


SEED_FUNDS = [
    {
        "fund_code": "017731",
        "fund_name_query": "嘉实全球产业升级",
        "matched_fund_name": "嘉实全球产业升级股票(QDII)C",
        "matched_fund_type": "QDII",
        "matched_fund_company": "嘉实基金",
        "theme": "自选基金",
        "tracking_target": "嘉实全球产业升级",
    },
    {
        "fund_code": "017523",
        "fund_name_query": "南方北证50",
        "matched_fund_name": "南方北证50成份指数发起A",
        "matched_fund_type": "指数基金",
        "matched_fund_company": "南方基金",
        "theme": "自选基金",
        "tracking_target": "北证50",
    },
    {
        "fund_code": "017524",
        "fund_name_query": "南方北证50",
        "matched_fund_name": "南方北证50成份指数发起C",
        "matched_fund_type": "指数基金",
        "matched_fund_company": "南方基金",
        "theme": "自选基金",
        "tracking_target": "北证50",
    },
]


def main() -> None:
    for item in SEED_FUNDS:
        candidate = upsert_candidate(source_name="manual-seed", **item)
        print(f"Seeded candidate: {candidate['fundCode']} {candidate['fundName']} status={candidate['candidateStatus']}")


if __name__ == "__main__":
    main()
