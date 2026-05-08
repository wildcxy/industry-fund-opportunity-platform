from datetime import date, datetime

from psycopg.types.json import Jsonb

from db.connection import get_connection
from jobs.shared import build_batch_id, log_job_end, log_job_start


TRADE_DATE = date(2026, 4, 21)
DATA_VERSION = "seed-v1"


def upsert_master_data(cur) -> None:
    industries = [
        ("semiconductor", "半导体"),
        ("innovative-medicine", "创新药"),
        ("ai-infra", "AI 算力基础设施"),
    ]
    for industry_id, industry_name in industries:
        cur.execute(
            """
            insert into industry_master (industry_id, industry_name, display_name, created_at, updated_at)
            values (%s, %s, %s, now(), now())
            on conflict (industry_id) do update
            set industry_name = excluded.industry_name,
                display_name = excluded.display_name,
                updated_at = now()
            """,
            (industry_id, industry_name, industry_name),
        )

    funds = [
        ("f1", "159995", "国证芯片 ETF", "ETF", "半导体", "国证芯片指数", "国证基金", True, 0.50, date(2022, 3, 15)),
        ("f2", "012345", "半导体设备联接 A", "联接基金", "半导体", "半导体设备主题 ETF 联接", "远见基金", False, 0.60, date(2023, 3, 15)),
        ("f3", "560880", "创新药产业 ETF", "ETF", "创新药", "创新药产业指数", "医疗创新基金", True, 0.45, date(2022, 3, 15)),
        ("f4", "018888", "AI 算力先锋混合", "主动基金", "AI 算力基础设施", "主动配置算力基础设施产业链", "前沿成长基金", False, 1.20, date(2024, 6, 28)),
    ]

    for fund in funds:
        cur.execute(
            """
            insert into fund_master (
                fund_id, fund_code, fund_name, fund_type, theme, tracking_target,
                fund_company, tradable_on_exchange, fee_rate, inception_date, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            on conflict (fund_id) do update
            set fund_code = excluded.fund_code,
                fund_name = excluded.fund_name,
                fund_type = excluded.fund_type,
                theme = excluded.theme,
                tracking_target = excluded.tracking_target,
                fund_company = excluded.fund_company,
                tradable_on_exchange = excluded.tradable_on_exchange,
                fee_rate = excluded.fee_rate,
                inception_date = excluded.inception_date,
                updated_at = now()
            """,
            fund,
        )

    mappings = [
        ("semiconductor", "f1"),
        ("semiconductor", "f2"),
        ("innovative-medicine", "f3"),
        ("ai-infra", "f4"),
    ]
    for priority, mapping in enumerate(mappings, start=1):
        cur.execute(
            """
            insert into industry_fund_mapping (industry_id, fund_id, mapping_type, priority_rank, created_at, updated_at)
            values (%s, %s, 'theme', %s, now(), now())
            on conflict (industry_id, fund_id) do update
            set priority_rank = excluded.priority_rank,
                updated_at = now()
            """,
            (mapping[0], mapping[1], priority),
        )


def replace_daily_data(cur, batch_id: str) -> None:
    tables = [
        "fund_daily_metrics",
        "industry_daily_metrics",
        "industry_events_daily",
        "industry_opportunity_daily",
        "homepage_snapshot_daily",
        "industry_detail_snapshot_daily",
        "fund_compare_daily",
        "watchlist_change_summary_daily",
        "data_publish_batch",
    ]
    for table in tables:
        cur.execute(f"delete from {table}")

    fund_rows = [
        ("f1", 0.8, 8.4, 15.2, 9.1, -12.6, 24.8, 76.2, 1.268, 1.258, 5, ["北方华创", "中微公司", "沪硅产业"], "中", "跟踪误差可控，适合主题表达。"),
        ("f2", 0.5, 6.7, 13.6, 7.5, -11.1, 21.4, 18.9, 1.105, 1.0995, 3, ["北方华创", "拓荆科技", "华海清科"], "中", "联接基金以主题跟踪为主，适合场外观察。"),
        ("f3", -0.2, 5.1, 11.2, 6.8, -10.5, 19.8, 28.5, 0.992, 0.994, 4, ["百济神州", "恒瑞医药", "信达生物"], "中", "跟踪误差可控，适合观察创新药修复。"),
        ("f4", 1.1, 9.6, 18.7, 12.4, -15.4, 29.2, 11.3, 1.311, 1.2967, 2, ["中际旭创", "新易盛", "寒武纪"], "中高", "主动管理，不适用指数跟踪误差。"),
    ]
    for fund_id, r1d, r1, r3, r6, drawdown, vol, aum, latest_nav, previous_nav, years, holdings, concentration, note in fund_rows:
        cur.execute(
            """
            insert into fund_daily_metrics (
                trade_date, fund_id, return_1d, return_1m, return_3m, return_6m, max_drawdown, volatility, aum,
                latest_nav, previous_nav, founded_years, top_holdings_json, concentration_label, tracking_deviation_note,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (TRADE_DATE, fund_id, r1d, r1, r3, r6, drawdown, vol, aum, latest_nav, previous_nav, years, Jsonb(holdings), concentration, note, batch_id, DATA_VERSION),
        )
        cur.execute(
            """
            insert into fund_compare_daily (
                trade_date, fund_id, return_metrics_json, risk_metrics_json, fee_rate, aum, inception_date,
                top_holdings_json, concentration_label, tracking_deviation_note, source_batch_id, data_version,
                created_at, updated_at
            )
            select
                %s, fm.fund_id,
                %s, %s, fm.fee_rate, %s, fm.inception_date, %s, %s, %s, %s, %s, now(), now()
            from fund_master fm
            where fm.fund_id = %s
            """,
            (
                TRADE_DATE,
                Jsonb({"day1": r1d, "month1": r1, "month3": r3, "month6": r6, "latestNav": latest_nav, "previousNav": previous_nav}),
                Jsonb({"maxDrawdown": drawdown, "volatility": vol}),
                aum,
                Jsonb(holdings),
                concentration,
                note,
                batch_id,
                DATA_VERSION,
                fund_id,
            ),
        )

    industry_rows = [
        ("semiconductor", 4.8, 11.6, 18.3, 82, 88, 71, 63, "中", 12),
        ("innovative-medicine", 2.4, 8.1, 12.5, 73, 75, 85, 56, "中", 9),
        ("ai-infra", 6.2, 14.4, 20.1, 89, 91, 58, 82, "高", 7),
    ]
    for row in industry_rows:
        cur.execute(
            """
            insert into industry_daily_metrics (
                trade_date, industry_id, performance_5d, performance_20d, performance_60d,
                trend_score, capital_score, valuation_score, risk_score, risk_level, fund_count,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (TRADE_DATE, *row, batch_id, DATA_VERSION),
        )

    events = [
        ("semiconductor", date(2026, 4, 8), "设备龙头订单超预期", "提升市场对产能扩张兑现的预期。"),
        ("semiconductor", date(2026, 4, 19), "ETF 资金净流入放大", "中短线资金重新回流半导体赛道。"),
        ("innovative-medicine", date(2026, 4, 17), "重点公司海外授权进展", "增强创新药商业化预期。"),
        ("ai-infra", date(2026, 4, 18), "板块成交创阶段新高", "主题热度显著上升。"),
    ]
    for idx, (industry_id, event_date, title, summary) in enumerate(events, start=1):
        cur.execute(
            """
            insert into industry_events_daily (
                trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank,
                source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, 'event', %s, %s, %s, now(), now())
            """,
            (TRADE_DATE, industry_id, event_date, title, summary, idx, batch_id, DATA_VERSION),
        )

    opportunities = [
        (
            "semiconductor",
            86,
            82,
            88,
            71,
            "中",
            "机会增强",
            "国产替代与算力链共振，板块出现趋势与事件的双重强化。",
            ["产业催化", "资金回流", "高景气验证"],
            {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"},
            "趋势、资金与产业催化形成共振，适合作为当前重点跟踪方向。",
        ),
        (
            "innovative-medicine",
            79,
            73,
            75,
            85,
            "中",
            "低位关注",
            "估值仍处历史中低位区间，适合中期观察与择机布局。",
            ["低位修复", "估值改善", "政策友好"],
            {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"},
            "估值位置更有吸引力，适合结合中期观察逐步验证。",
        ),
        (
            "ai-infra",
            84,
            89,
            91,
            58,
            "高",
            "高热观察",
            "市场热度高、成交活跃，但估值与拥挤度提示短期追高风险。",
            ["强趋势", "高热度", "拥挤度抬升"],
            {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"},
            "热度较高，适合观察强趋势与风险提示之间的平衡。",
        ),
    ]
    for row in opportunities:
        cur.execute(
            """
            insert into industry_opportunity_daily (
                trade_date, industry_id, opportunity_score, trend_score, capital_score, valuation_score,
                risk_level, label, summary, tags_json, methodology_json, focus_reason, source_batch_id,
                data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (
                TRADE_DATE,
                row[0],
                row[1],
                row[2],
                row[3],
                row[4],
                row[5],
                row[6],
                row[7],
                Jsonb(row[8]),
                Jsonb(row[9]),
                row[10],
                batch_id,
                DATA_VERSION,
            ),
        )

    homepage_payload = {
        "marketOverview": {
            "strongTrendCount": 2,
            "lowPositionCount": 1,
            "summary": "当前样例市场环境呈现主线集中、轮动分化的结构。"
        },
        "industries": [
            {
                "industryId": "semiconductor",
                "industryName": "半导体",
                "opportunityScore": 86,
                "trendScore": 82,
                "capitalScore": 88,
                "valuationScore": 71,
                "riskLevel": "中",
                "performance5d": 4.8,
                "performance20d": 11.6,
                "fundCount": 12,
                "tags": ["产业催化", "资金回流", "高景气验证"],
                "summary": "国产替代与算力链共振，板块出现趋势与事件的双重强化。",
                "label": "机会增强",
                "focusReason": "趋势、资金与产业催化形成共振，适合作为当前重点跟踪方向。"
            },
            {
                "industryId": "innovative-medicine",
                "industryName": "创新药",
                "opportunityScore": 79,
                "trendScore": 73,
                "capitalScore": 75,
                "valuationScore": 85,
                "riskLevel": "中",
                "performance5d": 2.4,
                "performance20d": 8.1,
                "fundCount": 9,
                "tags": ["低位修复", "估值改善", "政策友好"],
                "summary": "估值仍处历史中低位区间，适合中期观察与择机布局。",
                "label": "低位关注",
                "focusReason": "估值位置更有吸引力，适合结合中期观察逐步验证。"
            },
            {
                "industryId": "ai-infra",
                "industryName": "AI 算力基础设施",
                "opportunityScore": 84,
                "trendScore": 89,
                "capitalScore": 91,
                "valuationScore": 58,
                "riskLevel": "高",
                "performance5d": 6.2,
                "performance20d": 14.4,
                "fundCount": 7,
                "tags": ["强趋势", "高热度", "拥挤度抬升"],
                "summary": "市场热度高、成交活跃，但估值与拥挤度提示短期追高风险。",
                "label": "高热观察",
                "focusReason": "热度较高，适合观察强趋势与风险提示之间的平衡。"
            },
        ],
    }
    cur.execute(
        """
        insert into homepage_snapshot_daily (
            trade_date, snapshot_key, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at
        )
        values (%s, 'homepage', %s, 'published', %s, %s, now(), now())
        """,
        (TRADE_DATE, Jsonb(homepage_payload), batch_id, DATA_VERSION),
    )

    detail_payloads = {
        "semiconductor": {
            "industryId": "semiconductor",
            "industryName": "半导体",
            "headline": "趋势与产业催化共振，处于可重点跟踪区间。",
            "opportunityLabel": "机会增强",
            "thesisSummary": "板块近期在算力链扩产、国产替代预期和资金回流三重驱动下走强，但仍需警惕短期交易拥挤导致的波动放大。",
            "conclusionCards": [
                {"title": "当前判断", "value": "机会增强", "summary": "趋势与产业催化共振，处于可重点跟踪区间。"},
                {"title": "趋势强度", "value": "82", "summary": "近 20 日持续跑赢宽基，均线结构向上。"},
                {"title": "资金强度", "value": "88", "summary": "相关 ETF 连续多日净流入，成交活跃度抬升。"},
                {"title": "估值性价比", "value": "71", "summary": "估值已离开底部区间，但仍低于阶段高位。"},
                {"title": "拥挤度风险", "value": "63", "summary": "热点集中度抬升，适合分批观察而非盲目追高。"},
            ],
            "timelineEvents": [
                {"date": "2026-04-08", "title": "设备龙头订单超预期", "summary": "提升市场对产能扩张兑现的预期。"},
                {"date": "2026-04-19", "title": "ETF 资金净流入放大", "summary": "中短线资金重新回流半导体赛道。"},
            ],
        },
        "innovative-medicine": {
            "industryId": "innovative-medicine",
            "industryName": "创新药",
            "headline": "估值修复阶段具备观察价值，适合中期跟踪。",
            "opportunityLabel": "低位关注",
            "thesisSummary": "板块受益于政策环境改善与创新成果释放，估值仍具备修复空间，但资金趋势尚未完全强化。",
            "conclusionCards": [
                {"title": "当前判断", "value": "低位关注", "summary": "估值修复阶段具备观察价值，适合中期跟踪。"},
                {"title": "趋势强度", "value": "73", "summary": "修复趋势已形成，但尚未进入强趋势区间。"},
                {"title": "资金强度", "value": "75", "summary": "资金回流较温和，偏向中线资金布局。"},
                {"title": "估值性价比", "value": "85", "summary": "行业估值处于更有吸引力的位置。"},
                {"title": "拥挤度风险", "value": "56", "summary": "受政策与临床事件影响，个股层面波动仍大。"},
            ],
            "timelineEvents": [
                {"date": "2026-04-17", "title": "重点公司海外授权进展", "summary": "增强创新药商业化预期。"},
            ],
        },
        "ai-infra": {
            "industryId": "ai-infra",
            "industryName": "AI 算力基础设施",
            "headline": "趋势最强，但短期风险同步抬升。",
            "opportunityLabel": "高热观察",
            "thesisSummary": "板块在景气预期和资金共振下表现突出，但估值抬升与交易拥挤度已经成为主要约束。",
            "conclusionCards": [
                {"title": "当前判断", "value": "高热观察", "summary": "趋势最强，但短期风险同步抬升。"},
                {"title": "趋势强度", "value": "89", "summary": "短期趋势显著，占据市场主线。"},
                {"title": "资金强度", "value": "91", "summary": "资金加速流入，成交金额显著放大。"},
                {"title": "估值性价比", "value": "58", "summary": "估值已处于相对偏高区间。"},
                {"title": "拥挤度风险", "value": "82", "summary": "高热主题交易拥挤，波动放大风险高。"},
            ],
            "timelineEvents": [
                {"date": "2026-04-18", "title": "板块成交创阶段新高", "summary": "主题热度显著上升。"},
            ],
        },
    }
    for industry_id, payload in detail_payloads.items():
        cur.execute(
            """
            insert into industry_detail_snapshot_daily (
                trade_date, industry_id, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at
            )
            values (%s, %s, %s, 'published', %s, %s, now(), now())
            """,
            (TRADE_DATE, industry_id, Jsonb(payload), batch_id, DATA_VERSION),
        )

    watchlist_rows = [
        ("industry", "semiconductor", "机会增强", "资金热度连续抬升", "优先跟踪半导体相关 ETF 的资金与成交活跃度。"),
        ("fund", "f3", "估值修复", "近 20 日表现持续改善", "结合创新药主题修复节奏，关注后续资金回流强度。"),
    ]
    for row in watchlist_rows:
        cur.execute(
            """
            insert into watchlist_change_summary_daily (
                trade_date, item_type, item_id, status_label, latest_change, watch_hint, source_batch_id,
                data_version, created_at, updated_at
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, now(), now())
            """,
            (TRADE_DATE, *row, batch_id, DATA_VERSION),
        )

    cur.execute(
        """
        insert into data_publish_batch (
            batch_id, trade_date, pipeline_stage, publish_status, published_at, message, created_at, updated_at
        )
        values (%s, %s, 'snapshot-publish', 'published', %s, 'Seed demo data published', now(), now())
        """,
        (batch_id, TRADE_DATE, datetime.now()),
    )


def main() -> None:
    job_name = "seed-demo-data"
    batch_id = build_batch_id(TRADE_DATE)
    log_job_start(job_name, batch_id)
    with get_connection() as conn:
        with conn.cursor() as cur:
            upsert_master_data(cur)
            replace_daily_data(cur, batch_id)
        conn.commit()
    print(f"Seed data loaded with batch_id={batch_id}")
    log_job_end(job_name, batch_id)


if __name__ == "__main__":
    main()
