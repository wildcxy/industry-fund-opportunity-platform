create table if not exists portfolio_position_snapshot (
    id bigserial primary key,
    snapshot_id varchar(96) not null unique,
    user_id varchar(96) not null default 'local-demo',
    position_id varchar(128) not null,
    fund_code varchar(32),
    fund_name varchar(255) not null,
    source varchar(64) not null default 'manual_snapshot',
    market_value_snapshot numeric(18,4),
    day_profit_snapshot numeric(18,4),
    holding_profit_snapshot numeric(18,4),
    holding_return_snapshot numeric(10,4),
    units numeric(20,6),
    cost_nav numeric(18,6),
    data_status varchar(32) not null default 'snapshot',
    data_date date,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(user_id, position_id)
);

create index if not exists idx_portfolio_position_user on portfolio_position_snapshot(user_id);
create index if not exists idx_portfolio_position_fund_code on portfolio_position_snapshot(fund_code);

create table if not exists portfolio_valuation_snapshot (
    id bigserial primary key,
    valuation_id varchar(96) not null unique,
    user_id varchar(96) not null default 'local-demo',
    trade_date date not null,
    total_market_value numeric(18,4),
    total_cost_value numeric(18,4),
    total_day_profit numeric(18,4),
    total_holding_profit numeric(18,4),
    holding_count integer not null default 0,
    enhanced_count integer not null default 0,
    summary_json jsonb not null default '{}'::jsonb,
    quality_json jsonb not null default '{}'::jsonb,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(user_id, trade_date)
);

create index if not exists idx_portfolio_valuation_user_date on portfolio_valuation_snapshot(user_id, trade_date desc);

create table if not exists portfolio_position_valuation (
    id bigserial primary key,
    user_id varchar(96) not null default 'local-demo',
    trade_date date not null,
    position_id varchar(128) not null,
    fund_code varchar(32),
    fund_name varchar(255) not null,
    theme varchar(128),
    fund_type varchar(64),
    latest_nav numeric(18,6),
    previous_nav numeric(18,6),
    return_1d numeric(10,4),
    market_value numeric(18,4),
    cost_value numeric(18,4),
    day_profit numeric(18,4),
    holding_profit numeric(18,4),
    holding_return numeric(10,4),
    data_mode varchar(32) not null default 'snapshot',
    data_quality varchar(32) not null default 'snapshot_only',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(user_id, trade_date, position_id)
);

create index if not exists idx_portfolio_position_valuation_user_date on portfolio_position_valuation(user_id, trade_date desc);

create table if not exists portfolio_diagnosis_snapshot (
    id bigserial primary key,
    diagnosis_id varchar(96) not null unique,
    user_id varchar(96) not null default 'local-demo',
    trade_date date not null,
    diagnosis_json jsonb not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(user_id, trade_date)
);

create table if not exists portfolio_decision_tip (
    id bigserial primary key,
    tip_id varchar(96) not null unique,
    user_id varchar(96) not null default 'local-demo',
    trade_date date not null,
    tip_type varchar(64) not null,
    severity varchar(32) not null,
    title varchar(255) not null,
    summary text not null,
    evidence_json jsonb not null default '{}'::jsonb,
    data_quality varchar(32) not null default 'computed',
    risk_disclaimer text not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_portfolio_tip_user_date on portfolio_decision_tip(user_id, trade_date desc);

create table if not exists portfolio_candidate_fund (
    id bigserial primary key,
    candidate_id varchar(96) not null unique,
    user_id varchar(96) not null default 'local-demo',
    trade_date date not null,
    fund_id varchar(64) not null,
    fund_code varchar(32) not null,
    fund_name varchar(255) not null,
    source_type varchar(64) not null,
    reason text not null,
    metrics_json jsonb not null default '{}'::jsonb,
    data_quality varchar(32) not null default 'snapshot',
    risk_disclaimer text not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(user_id, trade_date, fund_id, source_type)
);

create index if not exists idx_portfolio_candidate_user_date on portfolio_candidate_fund(user_id, trade_date desc);
