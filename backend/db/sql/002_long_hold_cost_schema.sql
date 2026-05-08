create table if not exists fund_fee_rule (
    id bigserial primary key,
    fund_id varchar(64) not null,
    trade_date date not null,
    subscription_fee_rate numeric(10,4),
    purchase_fee_rate numeric(10,4),
    management_fee_rate numeric(10,4),
    custodian_fee_rate numeric(10,4),
    sales_service_fee_rate numeric(10,4),
    fee_rule_text text,
    source_name varchar(128) not null default 'manual-drop',
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    quality_status varchar(32) not null default 'partial',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, fund_id, data_version)
);

create index if not exists idx_fund_fee_rule_fund_id on fund_fee_rule(fund_id);
create index if not exists idx_fund_fee_rule_trade_date on fund_fee_rule(trade_date);

create table if not exists fund_redemption_fee_ladder (
    id bigserial primary key,
    fund_id varchar(64) not null,
    trade_date date not null,
    min_holding_days integer not null,
    max_holding_days integer,
    redemption_fee_rate numeric(10,4),
    rule_text text,
    is_free_threshold boolean not null default false,
    priority_rank integer not null default 0,
    source_name varchar(128) not null default 'manual-drop',
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    quality_status varchar(32) not null default 'partial',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_redemption_ladder_fund_id on fund_redemption_fee_ladder(fund_id);
create index if not exists idx_redemption_ladder_trade_date on fund_redemption_fee_ladder(trade_date);

create table if not exists fund_holding_cost_snapshot (
    id bigserial primary key,
    trade_date date not null,
    fund_id varchar(64) not null,
    holding_days integer not null,
    subscription_cost_rate numeric(10,4),
    redemption_cost_rate numeric(10,4),
    management_cost_rate numeric(10,4),
    custodian_cost_rate numeric(10,4),
    sales_service_cost_rate numeric(10,4),
    total_cost_rate numeric(10,4) not null,
    is_redemption_fee_free boolean not null default false,
    matched_redemption_rule_json jsonb,
    calculation_methodology_json jsonb,
    source_batch_id varchar(64) not null,
    data_version varchar(64) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(trade_date, fund_id, holding_days, data_version)
);

create index if not exists idx_holding_cost_fund_id on fund_holding_cost_snapshot(fund_id);
create index if not exists idx_holding_cost_trade_date on fund_holding_cost_snapshot(trade_date);
create index if not exists idx_holding_cost_holding_days on fund_holding_cost_snapshot(holding_days);
