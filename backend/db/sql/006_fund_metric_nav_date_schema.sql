alter table fund_daily_metrics
    add column if not exists latest_nav_date date,
    add column if not exists previous_nav_date date;

create index if not exists idx_fund_daily_latest_nav_date on fund_daily_metrics(latest_nav_date);
