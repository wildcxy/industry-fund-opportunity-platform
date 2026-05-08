alter table fund_daily_metrics
    add column if not exists return_1d numeric(10,4),
    add column if not exists latest_nav numeric(18,6),
    add column if not exists previous_nav numeric(18,6),
    add column if not exists latest_nav_date date,
    add column if not exists previous_nav_date date;

create table if not exists fund_disclosed_holding (
    id bigserial primary key,
    fund_id varchar(64) not null,
    fund_code varchar(32) not null,
    report_period varchar(32) not null,
    report_date date,
    disclose_date date,
    holding_name varchar(255) not null,
    holding_code varchar(64),
    holding_type varchar(32) not null default 'stock',
    weight_percent numeric(10,4),
    source_name varchar(128) not null default 'manual-or-public-disclosure',
    data_quality varchar(32) not null default 'disclosed',
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(fund_code, report_period, holding_name)
);

create index if not exists idx_fund_disclosed_holding_code on fund_disclosed_holding(fund_code);
create index if not exists idx_fund_disclosed_holding_period on fund_disclosed_holding(report_period);
