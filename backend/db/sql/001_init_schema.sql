create table if not exists fund_master (
    id bigserial primary key,
    fund_id varchar(64) not null unique,
    fund_code varchar(32) not null unique,
    fund_name varchar(255) not null,
    fund_type varchar(32) not null,
    theme varchar(128) not null,
    tracking_target varchar(255) not null,
    fund_company varchar(128),
    tradable_on_exchange boolean not null default false,
    fee_rate numeric(8,4),
    inception_date date,
    status varchar(32) not null default 'active',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_fund_master_theme on fund_master(theme);
create index if not exists idx_fund_master_fund_type on fund_master(fund_type);
create index if not exists idx_fund_master_company on fund_master(fund_company);

create table if not exists industry_master (
    id bigserial primary key,
    industry_id varchar(64) not null unique,
    industry_name varchar(128) not null unique,
    display_name varchar(128),
    sort_order integer not null default 0,
    active_flag boolean not null default true,
    risk_disclaimer_template text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists industry_fund_mapping (
    id bigserial primary key,
    industry_id varchar(64) not null,
    fund_id varchar(64) not null,
    mapping_type varchar(32) not null default 'theme',
    priority_rank integer not null default 0,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(industry_id, fund_id)
);

create table if not exists fund_daily_metrics (
    id bigserial primary key,
    trade_date date not null,
    fund_id varchar(64) not null,
    return_1m numeric(10,4),
    return_3m numeric(10,4),
    return_6m numeric(10,4),
    max_drawdown numeric(10,4),
    volatility numeric(10,4),
    aum numeric(18,4),
    latest_nav numeric(18,6),
    previous_nav numeric(18,6),
    latest_nav_date date,
    previous_nav_date date,
    founded_years integer,
    top_holdings_json jsonb,
    concentration_label varchar(32),
    tracking_deviation_note text,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, fund_id, data_version)
);

create index if not exists idx_fund_daily_trade_date on fund_daily_metrics(trade_date);
create index if not exists idx_fund_daily_fund_id on fund_daily_metrics(fund_id);

create table if not exists industry_daily_metrics (
    id bigserial primary key,
    trade_date date not null,
    industry_id varchar(64) not null,
    performance_5d numeric(10,4),
    performance_20d numeric(10,4),
    performance_60d numeric(10,4),
    trend_score numeric(10,2),
    capital_score numeric(10,2),
    valuation_score numeric(10,2),
    risk_score numeric(10,2),
    risk_level varchar(16),
    fund_count integer,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, industry_id, data_version)
);

create table if not exists industry_events_daily (
    id bigserial primary key,
    trade_date date not null,
    industry_id varchar(64) not null,
    event_date date not null,
    event_title varchar(255) not null,
    event_summary text not null,
    event_type varchar(64),
    priority_rank integer not null default 0,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_industry_events_trade_date on industry_events_daily(trade_date);
create index if not exists idx_industry_events_industry_id on industry_events_daily(industry_id);

create table if not exists industry_opportunity_daily (
    id bigserial primary key,
    trade_date date not null,
    industry_id varchar(64) not null,
    opportunity_score numeric(10,2) not null,
    trend_score numeric(10,2) not null,
    capital_score numeric(10,2) not null,
    valuation_score numeric(10,2) not null,
    risk_level varchar(16) not null,
    label varchar(32) not null,
    summary text not null,
    tags_json jsonb,
    methodology_json jsonb,
    focus_reason text,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists homepage_snapshot_daily (
    id bigserial primary key,
    trade_date date not null,
    snapshot_key varchar(64) not null unique,
    snapshot_payload jsonb not null,
    status varchar(32) not null default 'published',
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists industry_detail_snapshot_daily (
    id bigserial primary key,
    trade_date date not null,
    industry_id varchar(64) not null,
    snapshot_payload jsonb not null,
    status varchar(32) not null default 'published',
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, industry_id, data_version)
);

create table if not exists fund_compare_daily (
    id bigserial primary key,
    trade_date date not null,
    fund_id varchar(64) not null,
    return_metrics_json jsonb not null,
    risk_metrics_json jsonb not null,
    fee_rate numeric(8,4),
    aum numeric(18,4),
    inception_date date,
    top_holdings_json jsonb,
    concentration_label varchar(32),
    tracking_deviation_note text,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, fund_id, data_version)
);

create table if not exists watchlist_change_summary_daily (
    id bigserial primary key,
    trade_date date not null,
    item_type varchar(32) not null,
    item_id varchar(64) not null,
    status_label varchar(64),
    latest_change text,
    watch_hint text,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists data_publish_batch (
    id bigserial primary key,
    batch_id varchar(64) not null unique,
    trade_date date not null,
    pipeline_stage varchar(64) not null,
    publish_status varchar(32) not null,
    published_at timestamp,
    rollback_from_batch_id varchar(64),
    message text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists job_run_log (
    id bigserial primary key,
    job_name varchar(128) not null,
    batch_id varchar(64) not null,
    trade_date date,
    run_status varchar(32) not null,
    started_at timestamp not null,
    ended_at timestamp,
    processed_count integer,
    error_message text,
    log_path varchar(255),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists data_quality_result (
    id bigserial primary key,
    batch_id varchar(64) not null,
    trade_date date not null,
    rule_name varchar(128) not null,
    rule_level varchar(32) not null,
    check_status varchar(32) not null,
    sample_payload jsonb,
    message text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create table if not exists source_ingestion_audit (
    id bigserial primary key,
    source_name varchar(128) not null,
    batch_id varchar(64) not null,
    trade_date date not null,
    file_path varchar(255),
    row_count integer,
    checksum varchar(128),
    ingestion_status varchar(32) not null,
    message text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);
