insert into industry_master (industry_id, industry_name, display_name, created_at, updated_at)
values ('cpo-optical-communication', 'CPO光通信', 'CPO光通信', now(), now())
on conflict (industry_id) do update
set industry_name = excluded.industry_name,
    display_name = excluded.display_name,
    active_flag = true,
    updated_at = now();

delete from industry_daily_metrics
where trade_date = date '2026-05-06'
  and industry_id = 'cpo-optical-communication'
  and data_version = 'manual-drop-v1';

insert into industry_daily_metrics (
    trade_date, industry_id, performance_5d, performance_20d, performance_60d,
    trend_score, capital_score, valuation_score, risk_score, risk_level, fund_count,
    source_batch_id, data_version, created_at, updated_at
)
values (
    date '2026-05-06', 'cpo-optical-communication', 5.4, 13.2, 19.6,
    86, 84, 62, 78, '高', 6,
    'manual-cpo-backfill-2026-05-06', 'manual-drop-v1', now(), now()
);

delete from industry_opportunity_daily
where trade_date = date '2026-05-06'
  and industry_id = 'cpo-optical-communication'
  and data_version = 'manual-drop-v1';

insert into industry_opportunity_daily (
    trade_date, industry_id, opportunity_score, trend_score, capital_score, valuation_score,
    risk_level, label, summary, tags_json, methodology_json, focus_reason,
    source_batch_id, data_version, created_at, updated_at
)
values (
    date '2026-05-06',
    'cpo-optical-communication',
    83,
    86,
    84,
    62,
    '高',
    '高热观察',
    'CPO光通信与高速光模块处于AI算力扩张中的通信环节，长期逻辑需要用订单、资本开支和海外需求持续验证。',
    '["AI通信链","光模块","长期事件验证"]'::jsonb,
    '{"title":"评分口径","content":"补齐手工盘后指标，用于行业观察和趋势策略计算；后续仍需用真实行业指数、基金池和回撤数据复核，不构成投资建议。"}'::jsonb,
    '趋势和资金较强，但风险等级偏高，适合先观察回撤承接与基本面兑现，不宜把短期涨幅直接理解为买入条件。',
    'manual-cpo-backfill-2026-05-06',
    'manual-drop-v1',
    now(),
    now()
);

delete from industry_events_daily
where trade_date = date '2026-05-06'
  and industry_id = 'cpo-optical-communication'
  and data_version = 'manual-drop-v1';

insert into industry_events_daily (
    trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank,
    source_batch_id, data_version, created_at, updated_at
)
values (
    date '2026-05-06',
    'cpo-optical-communication',
    date '2026-04-24',
    '光模块与高速互联需求延续',
    'CPO光通信仍需用订单交付、海外需求和利润质量继续验证，短期高热时优先关注回撤风险。',
    'event',
    1,
    'manual-cpo-backfill-2026-05-06',
    'manual-drop-v1',
    now(),
    now()
);
