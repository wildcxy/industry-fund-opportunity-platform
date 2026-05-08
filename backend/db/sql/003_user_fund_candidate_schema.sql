create table if not exists fund_candidate_request (
    id bigserial primary key,
    request_id varchar(64) not null unique,
    fund_id varchar(64) not null,
    fund_code varchar(32) not null unique,
    fund_name_query varchar(255),
    matched_fund_name varchar(255) not null,
    matched_fund_type varchar(64),
    matched_fund_company varchar(128),
    theme varchar(128) not null default '自选基金',
    tracking_target varchar(255),
    source_name varchar(64) not null default 'akshare',
    request_status varchar(32) not null default 'pending',
    last_success_trade_date date,
    last_error_message text,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_fund_candidate_status on fund_candidate_request(request_status);
create index if not exists idx_fund_candidate_code on fund_candidate_request(fund_code);

create table if not exists fund_collection_task (
    id bigserial primary key,
    task_id varchar(64) not null unique,
    fund_id varchar(64) not null,
    fund_code varchar(32) not null,
    task_type varchar(64) not null default 'single_fund_collect',
    task_status varchar(32) not null default 'pending',
    attempt_count integer not null default 0,
    last_success_trade_date date,
    last_error_message text,
    started_at timestamp,
    ended_at timestamp,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

create index if not exists idx_fund_collection_task_code on fund_collection_task(fund_code);
create index if not exists idx_fund_collection_task_status on fund_collection_task(task_status);
