--
-- PostgreSQL database dump
--

\restrict hBf4ulFchnhfNrhUdZcLP3CWQwJkItmzq9tPNBqaW8rTNRJ1CcDA8ovFbphjkfq

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP INDEX IF EXISTS public.idx_redemption_ladder_trade_date;
DROP INDEX IF EXISTS public.idx_redemption_ladder_fund_id;
DROP INDEX IF EXISTS public.idx_portfolio_valuation_user_date;
DROP INDEX IF EXISTS public.idx_portfolio_tip_user_date;
DROP INDEX IF EXISTS public.idx_portfolio_position_valuation_user_date;
DROP INDEX IF EXISTS public.idx_portfolio_position_user;
DROP INDEX IF EXISTS public.idx_portfolio_position_fund_code;
DROP INDEX IF EXISTS public.idx_portfolio_candidate_user_date;
DROP INDEX IF EXISTS public.idx_industry_events_trade_date;
DROP INDEX IF EXISTS public.idx_industry_events_industry_id;
DROP INDEX IF EXISTS public.idx_holding_cost_trade_date;
DROP INDEX IF EXISTS public.idx_holding_cost_holding_days;
DROP INDEX IF EXISTS public.idx_holding_cost_fund_id;
DROP INDEX IF EXISTS public.idx_fund_master_theme;
DROP INDEX IF EXISTS public.idx_fund_master_fund_type;
DROP INDEX IF EXISTS public.idx_fund_master_company;
DROP INDEX IF EXISTS public.idx_fund_fee_rule_trade_date;
DROP INDEX IF EXISTS public.idx_fund_fee_rule_fund_id;
DROP INDEX IF EXISTS public.idx_fund_disclosed_holding_period;
DROP INDEX IF EXISTS public.idx_fund_disclosed_holding_code;
DROP INDEX IF EXISTS public.idx_fund_daily_trade_date;
DROP INDEX IF EXISTS public.idx_fund_daily_fund_id;
DROP INDEX IF EXISTS public.idx_fund_collection_task_status;
DROP INDEX IF EXISTS public.idx_fund_collection_task_code;
DROP INDEX IF EXISTS public.idx_fund_candidate_status;
DROP INDEX IF EXISTS public.idx_fund_candidate_code;
ALTER TABLE IF EXISTS ONLY public.watchlist_change_summary_daily DROP CONSTRAINT IF EXISTS watchlist_change_summary_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.source_ingestion_audit DROP CONSTRAINT IF EXISTS source_ingestion_audit_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_valuation_snapshot DROP CONSTRAINT IF EXISTS portfolio_valuation_snapshot_valuation_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_valuation_snapshot DROP CONSTRAINT IF EXISTS portfolio_valuation_snapshot_user_id_trade_date_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_valuation_snapshot DROP CONSTRAINT IF EXISTS portfolio_valuation_snapshot_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_position_valuation DROP CONSTRAINT IF EXISTS portfolio_position_valuation_user_id_trade_date_position_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_position_valuation DROP CONSTRAINT IF EXISTS portfolio_position_valuation_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_position_snapshot DROP CONSTRAINT IF EXISTS portfolio_position_snapshot_user_id_position_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_position_snapshot DROP CONSTRAINT IF EXISTS portfolio_position_snapshot_snapshot_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_position_snapshot DROP CONSTRAINT IF EXISTS portfolio_position_snapshot_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_diagnosis_snapshot DROP CONSTRAINT IF EXISTS portfolio_diagnosis_snapshot_user_id_trade_date_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_diagnosis_snapshot DROP CONSTRAINT IF EXISTS portfolio_diagnosis_snapshot_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_diagnosis_snapshot DROP CONSTRAINT IF EXISTS portfolio_diagnosis_snapshot_diagnosis_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_decision_tip DROP CONSTRAINT IF EXISTS portfolio_decision_tip_tip_id_key;
ALTER TABLE IF EXISTS ONLY public.portfolio_decision_tip DROP CONSTRAINT IF EXISTS portfolio_decision_tip_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_candidate_fund DROP CONSTRAINT IF EXISTS portfolio_candidate_fund_user_id_trade_date_fund_id_source__key;
ALTER TABLE IF EXISTS ONLY public.portfolio_candidate_fund DROP CONSTRAINT IF EXISTS portfolio_candidate_fund_pkey;
ALTER TABLE IF EXISTS ONLY public.portfolio_candidate_fund DROP CONSTRAINT IF EXISTS portfolio_candidate_fund_candidate_id_key;
ALTER TABLE IF EXISTS ONLY public.job_run_log DROP CONSTRAINT IF EXISTS job_run_log_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_opportunity_daily DROP CONSTRAINT IF EXISTS industry_opportunity_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_master DROP CONSTRAINT IF EXISTS industry_master_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_master DROP CONSTRAINT IF EXISTS industry_master_industry_name_key;
ALTER TABLE IF EXISTS ONLY public.industry_master DROP CONSTRAINT IF EXISTS industry_master_industry_id_key;
ALTER TABLE IF EXISTS ONLY public.industry_fund_mapping DROP CONSTRAINT IF EXISTS industry_fund_mapping_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_fund_mapping DROP CONSTRAINT IF EXISTS industry_fund_mapping_industry_id_fund_id_key;
ALTER TABLE IF EXISTS ONLY public.industry_events_daily DROP CONSTRAINT IF EXISTS industry_events_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_detail_snapshot_daily DROP CONSTRAINT IF EXISTS industry_detail_snapshot_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.industry_detail_snapshot_daily DROP CONSTRAINT IF EXISTS industry_detail_snapshot_dail_trade_date_industry_id_data_v_key;
ALTER TABLE IF EXISTS ONLY public.industry_daily_metrics DROP CONSTRAINT IF EXISTS industry_daily_metrics_trade_date_industry_id_data_version_key;
ALTER TABLE IF EXISTS ONLY public.industry_daily_metrics DROP CONSTRAINT IF EXISTS industry_daily_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.homepage_snapshot_daily DROP CONSTRAINT IF EXISTS homepage_snapshot_daily_snapshot_key_key;
ALTER TABLE IF EXISTS ONLY public.homepage_snapshot_daily DROP CONSTRAINT IF EXISTS homepage_snapshot_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_redemption_fee_ladder DROP CONSTRAINT IF EXISTS fund_redemption_fee_ladder_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_master DROP CONSTRAINT IF EXISTS fund_master_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_master DROP CONSTRAINT IF EXISTS fund_master_fund_id_key;
ALTER TABLE IF EXISTS ONLY public.fund_master DROP CONSTRAINT IF EXISTS fund_master_fund_code_key;
ALTER TABLE IF EXISTS ONLY public.fund_holding_cost_snapshot DROP CONSTRAINT IF EXISTS fund_holding_cost_snapshot_trade_date_fund_id_holding_days__key;
ALTER TABLE IF EXISTS ONLY public.fund_holding_cost_snapshot DROP CONSTRAINT IF EXISTS fund_holding_cost_snapshot_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_fee_rule DROP CONSTRAINT IF EXISTS fund_fee_rule_trade_date_fund_id_data_version_key;
ALTER TABLE IF EXISTS ONLY public.fund_fee_rule DROP CONSTRAINT IF EXISTS fund_fee_rule_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_disclosed_holding DROP CONSTRAINT IF EXISTS fund_disclosed_holding_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_disclosed_holding DROP CONSTRAINT IF EXISTS fund_disclosed_holding_fund_code_report_period_holding_name_key;
ALTER TABLE IF EXISTS ONLY public.fund_daily_metrics DROP CONSTRAINT IF EXISTS fund_daily_metrics_trade_date_fund_id_data_version_key;
ALTER TABLE IF EXISTS ONLY public.fund_daily_metrics DROP CONSTRAINT IF EXISTS fund_daily_metrics_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_compare_daily DROP CONSTRAINT IF EXISTS fund_compare_daily_trade_date_fund_id_data_version_key;
ALTER TABLE IF EXISTS ONLY public.fund_compare_daily DROP CONSTRAINT IF EXISTS fund_compare_daily_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_collection_task DROP CONSTRAINT IF EXISTS fund_collection_task_task_id_key;
ALTER TABLE IF EXISTS ONLY public.fund_collection_task DROP CONSTRAINT IF EXISTS fund_collection_task_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_candidate_request DROP CONSTRAINT IF EXISTS fund_candidate_request_request_id_key;
ALTER TABLE IF EXISTS ONLY public.fund_candidate_request DROP CONSTRAINT IF EXISTS fund_candidate_request_pkey;
ALTER TABLE IF EXISTS ONLY public.fund_candidate_request DROP CONSTRAINT IF EXISTS fund_candidate_request_fund_code_key;
ALTER TABLE IF EXISTS ONLY public.data_quality_result DROP CONSTRAINT IF EXISTS data_quality_result_pkey;
ALTER TABLE IF EXISTS ONLY public.data_publish_batch DROP CONSTRAINT IF EXISTS data_publish_batch_pkey;
ALTER TABLE IF EXISTS ONLY public.data_publish_batch DROP CONSTRAINT IF EXISTS data_publish_batch_batch_id_key;
ALTER TABLE IF EXISTS public.watchlist_change_summary_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.source_ingestion_audit ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_valuation_snapshot ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_position_valuation ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_position_snapshot ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_diagnosis_snapshot ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_decision_tip ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.portfolio_candidate_fund ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.job_run_log ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_opportunity_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_master ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_fund_mapping ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_events_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_detail_snapshot_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.industry_daily_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.homepage_snapshot_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_redemption_fee_ladder ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_master ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_holding_cost_snapshot ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_fee_rule ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_disclosed_holding ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_daily_metrics ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_compare_daily ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_collection_task ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fund_candidate_request ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.data_quality_result ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.data_publish_batch ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.watchlist_change_summary_daily_id_seq;
DROP TABLE IF EXISTS public.watchlist_change_summary_daily;
DROP SEQUENCE IF EXISTS public.source_ingestion_audit_id_seq;
DROP TABLE IF EXISTS public.source_ingestion_audit;
DROP SEQUENCE IF EXISTS public.portfolio_valuation_snapshot_id_seq;
DROP TABLE IF EXISTS public.portfolio_valuation_snapshot;
DROP SEQUENCE IF EXISTS public.portfolio_position_valuation_id_seq;
DROP TABLE IF EXISTS public.portfolio_position_valuation;
DROP SEQUENCE IF EXISTS public.portfolio_position_snapshot_id_seq;
DROP TABLE IF EXISTS public.portfolio_position_snapshot;
DROP SEQUENCE IF EXISTS public.portfolio_diagnosis_snapshot_id_seq;
DROP TABLE IF EXISTS public.portfolio_diagnosis_snapshot;
DROP SEQUENCE IF EXISTS public.portfolio_decision_tip_id_seq;
DROP TABLE IF EXISTS public.portfolio_decision_tip;
DROP SEQUENCE IF EXISTS public.portfolio_candidate_fund_id_seq;
DROP TABLE IF EXISTS public.portfolio_candidate_fund;
DROP SEQUENCE IF EXISTS public.job_run_log_id_seq;
DROP TABLE IF EXISTS public.job_run_log;
DROP SEQUENCE IF EXISTS public.industry_opportunity_daily_id_seq;
DROP TABLE IF EXISTS public.industry_opportunity_daily;
DROP SEQUENCE IF EXISTS public.industry_master_id_seq;
DROP TABLE IF EXISTS public.industry_master;
DROP SEQUENCE IF EXISTS public.industry_fund_mapping_id_seq;
DROP TABLE IF EXISTS public.industry_fund_mapping;
DROP SEQUENCE IF EXISTS public.industry_events_daily_id_seq;
DROP TABLE IF EXISTS public.industry_events_daily;
DROP SEQUENCE IF EXISTS public.industry_detail_snapshot_daily_id_seq;
DROP TABLE IF EXISTS public.industry_detail_snapshot_daily;
DROP SEQUENCE IF EXISTS public.industry_daily_metrics_id_seq;
DROP TABLE IF EXISTS public.industry_daily_metrics;
DROP SEQUENCE IF EXISTS public.homepage_snapshot_daily_id_seq;
DROP TABLE IF EXISTS public.homepage_snapshot_daily;
DROP SEQUENCE IF EXISTS public.fund_redemption_fee_ladder_id_seq;
DROP TABLE IF EXISTS public.fund_redemption_fee_ladder;
DROP SEQUENCE IF EXISTS public.fund_master_id_seq;
DROP TABLE IF EXISTS public.fund_master;
DROP SEQUENCE IF EXISTS public.fund_holding_cost_snapshot_id_seq;
DROP TABLE IF EXISTS public.fund_holding_cost_snapshot;
DROP SEQUENCE IF EXISTS public.fund_fee_rule_id_seq;
DROP TABLE IF EXISTS public.fund_fee_rule;
DROP SEQUENCE IF EXISTS public.fund_disclosed_holding_id_seq;
DROP TABLE IF EXISTS public.fund_disclosed_holding;
DROP SEQUENCE IF EXISTS public.fund_daily_metrics_id_seq;
DROP TABLE IF EXISTS public.fund_daily_metrics;
DROP SEQUENCE IF EXISTS public.fund_compare_daily_id_seq;
DROP TABLE IF EXISTS public.fund_compare_daily;
DROP SEQUENCE IF EXISTS public.fund_collection_task_id_seq;
DROP TABLE IF EXISTS public.fund_collection_task;
DROP SEQUENCE IF EXISTS public.fund_candidate_request_id_seq;
DROP TABLE IF EXISTS public.fund_candidate_request;
DROP SEQUENCE IF EXISTS public.data_quality_result_id_seq;
DROP TABLE IF EXISTS public.data_quality_result;
DROP SEQUENCE IF EXISTS public.data_publish_batch_id_seq;
DROP TABLE IF EXISTS public.data_publish_batch;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: data_publish_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_publish_batch (
    id bigint NOT NULL,
    batch_id character varying(64) NOT NULL,
    trade_date date NOT NULL,
    pipeline_stage character varying(64) NOT NULL,
    publish_status character varying(32) NOT NULL,
    published_at timestamp without time zone,
    rollback_from_batch_id character varying(64),
    message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: data_publish_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_publish_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_publish_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_publish_batch_id_seq OWNED BY public.data_publish_batch.id;


--
-- Name: data_quality_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_quality_result (
    id bigint NOT NULL,
    batch_id character varying(64) NOT NULL,
    trade_date date NOT NULL,
    rule_name character varying(128) NOT NULL,
    rule_level character varying(32) NOT NULL,
    check_status character varying(32) NOT NULL,
    sample_payload jsonb,
    message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: data_quality_result_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.data_quality_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: data_quality_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.data_quality_result_id_seq OWNED BY public.data_quality_result.id;


--
-- Name: fund_candidate_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_candidate_request (
    id bigint NOT NULL,
    request_id character varying(64) NOT NULL,
    fund_id character varying(64) NOT NULL,
    fund_code character varying(32) NOT NULL,
    fund_name_query character varying(255),
    matched_fund_name character varying(255) NOT NULL,
    matched_fund_type character varying(64),
    matched_fund_company character varying(128),
    theme character varying(128) DEFAULT '自选基金'::character varying NOT NULL,
    tracking_target character varying(255),
    source_name character varying(64) DEFAULT 'akshare'::character varying NOT NULL,
    request_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    last_success_trade_date date,
    last_error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_candidate_request_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_candidate_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_candidate_request_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_candidate_request_id_seq OWNED BY public.fund_candidate_request.id;


--
-- Name: fund_collection_task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_collection_task (
    id bigint NOT NULL,
    task_id character varying(64) NOT NULL,
    fund_id character varying(64) NOT NULL,
    fund_code character varying(32) NOT NULL,
    task_type character varying(64) DEFAULT 'single_fund_collect'::character varying NOT NULL,
    task_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    last_success_trade_date date,
    last_error_message text,
    started_at timestamp without time zone,
    ended_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_collection_task_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_collection_task_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_collection_task_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_collection_task_id_seq OWNED BY public.fund_collection_task.id;


--
-- Name: fund_compare_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_compare_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    fund_id character varying(64) NOT NULL,
    return_metrics_json jsonb NOT NULL,
    risk_metrics_json jsonb NOT NULL,
    fee_rate numeric(8,4),
    aum numeric(18,4),
    inception_date date,
    top_holdings_json jsonb,
    concentration_label character varying(32),
    tracking_deviation_note text,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_compare_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_compare_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_compare_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_compare_daily_id_seq OWNED BY public.fund_compare_daily.id;


--
-- Name: fund_daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_daily_metrics (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    fund_id character varying(64) NOT NULL,
    return_1m numeric(10,4),
    return_3m numeric(10,4),
    return_6m numeric(10,4),
    max_drawdown numeric(10,4),
    volatility numeric(10,4),
    aum numeric(18,4),
    founded_years integer,
    top_holdings_json jsonb,
    concentration_label character varying(32),
    tracking_deviation_note text,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    return_1d numeric(10,4),
    latest_nav numeric(18,6),
    previous_nav numeric(18,6)
);


--
-- Name: fund_daily_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_daily_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_daily_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_daily_metrics_id_seq OWNED BY public.fund_daily_metrics.id;


--
-- Name: fund_disclosed_holding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_disclosed_holding (
    id bigint NOT NULL,
    fund_id character varying(64) NOT NULL,
    fund_code character varying(32) NOT NULL,
    report_period character varying(32) NOT NULL,
    report_date date,
    disclose_date date,
    holding_name character varying(255) NOT NULL,
    holding_code character varying(64),
    holding_type character varying(32) DEFAULT 'stock'::character varying NOT NULL,
    weight_percent numeric(10,4),
    source_name character varying(128) DEFAULT 'manual-or-public-disclosure'::character varying NOT NULL,
    data_quality character varying(32) DEFAULT 'disclosed'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_disclosed_holding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_disclosed_holding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_disclosed_holding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_disclosed_holding_id_seq OWNED BY public.fund_disclosed_holding.id;


--
-- Name: fund_fee_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_fee_rule (
    id bigint NOT NULL,
    fund_id character varying(64) NOT NULL,
    trade_date date NOT NULL,
    subscription_fee_rate numeric(10,4),
    purchase_fee_rate numeric(10,4),
    management_fee_rate numeric(10,4),
    custodian_fee_rate numeric(10,4),
    sales_service_fee_rate numeric(10,4),
    fee_rule_text text,
    source_name character varying(128) DEFAULT 'manual-drop'::character varying NOT NULL,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    quality_status character varying(32) DEFAULT 'partial'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_fee_rule_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_fee_rule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_fee_rule_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_fee_rule_id_seq OWNED BY public.fund_fee_rule.id;


--
-- Name: fund_holding_cost_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_holding_cost_snapshot (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    fund_id character varying(64) NOT NULL,
    holding_days integer NOT NULL,
    subscription_cost_rate numeric(10,4),
    redemption_cost_rate numeric(10,4),
    management_cost_rate numeric(10,4),
    custodian_cost_rate numeric(10,4),
    sales_service_cost_rate numeric(10,4),
    total_cost_rate numeric(10,4) NOT NULL,
    is_redemption_fee_free boolean DEFAULT false NOT NULL,
    matched_redemption_rule_json jsonb,
    calculation_methodology_json jsonb,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_holding_cost_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_holding_cost_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_holding_cost_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_holding_cost_snapshot_id_seq OWNED BY public.fund_holding_cost_snapshot.id;


--
-- Name: fund_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_master (
    id bigint NOT NULL,
    fund_id character varying(64) NOT NULL,
    fund_code character varying(32) NOT NULL,
    fund_name character varying(255) NOT NULL,
    fund_type character varying(32) NOT NULL,
    theme character varying(128) NOT NULL,
    tracking_target character varying(255) NOT NULL,
    fund_company character varying(128),
    tradable_on_exchange boolean DEFAULT false NOT NULL,
    fee_rate numeric(8,4),
    inception_date date,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_master_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_master_id_seq OWNED BY public.fund_master.id;


--
-- Name: fund_redemption_fee_ladder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fund_redemption_fee_ladder (
    id bigint NOT NULL,
    fund_id character varying(64) NOT NULL,
    trade_date date NOT NULL,
    min_holding_days integer NOT NULL,
    max_holding_days integer,
    redemption_fee_rate numeric(10,4),
    rule_text text,
    is_free_threshold boolean DEFAULT false NOT NULL,
    priority_rank integer DEFAULT 0 NOT NULL,
    source_name character varying(128) DEFAULT 'manual-drop'::character varying NOT NULL,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    quality_status character varying(32) DEFAULT 'partial'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: fund_redemption_fee_ladder_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fund_redemption_fee_ladder_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fund_redemption_fee_ladder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fund_redemption_fee_ladder_id_seq OWNED BY public.fund_redemption_fee_ladder.id;


--
-- Name: homepage_snapshot_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.homepage_snapshot_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    snapshot_key character varying(64) NOT NULL,
    snapshot_payload jsonb NOT NULL,
    status character varying(32) DEFAULT 'published'::character varying NOT NULL,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: homepage_snapshot_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.homepage_snapshot_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: homepage_snapshot_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.homepage_snapshot_daily_id_seq OWNED BY public.homepage_snapshot_daily.id;


--
-- Name: industry_daily_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_daily_metrics (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    industry_id character varying(64) NOT NULL,
    performance_5d numeric(10,4),
    performance_20d numeric(10,4),
    performance_60d numeric(10,4),
    trend_score numeric(10,2),
    capital_score numeric(10,2),
    valuation_score numeric(10,2),
    risk_score numeric(10,2),
    risk_level character varying(16),
    fund_count integer,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_daily_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_daily_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_daily_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_daily_metrics_id_seq OWNED BY public.industry_daily_metrics.id;


--
-- Name: industry_detail_snapshot_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_detail_snapshot_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    industry_id character varying(64) NOT NULL,
    snapshot_payload jsonb NOT NULL,
    status character varying(32) DEFAULT 'published'::character varying NOT NULL,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_detail_snapshot_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_detail_snapshot_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_detail_snapshot_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_detail_snapshot_daily_id_seq OWNED BY public.industry_detail_snapshot_daily.id;


--
-- Name: industry_events_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_events_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    industry_id character varying(64) NOT NULL,
    event_date date NOT NULL,
    event_title character varying(255) NOT NULL,
    event_summary text NOT NULL,
    event_type character varying(64),
    priority_rank integer DEFAULT 0 NOT NULL,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_events_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_events_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_events_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_events_daily_id_seq OWNED BY public.industry_events_daily.id;


--
-- Name: industry_fund_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_fund_mapping (
    id bigint NOT NULL,
    industry_id character varying(64) NOT NULL,
    fund_id character varying(64) NOT NULL,
    mapping_type character varying(32) DEFAULT 'theme'::character varying NOT NULL,
    priority_rank integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_fund_mapping_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_fund_mapping_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_fund_mapping_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_fund_mapping_id_seq OWNED BY public.industry_fund_mapping.id;


--
-- Name: industry_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_master (
    id bigint NOT NULL,
    industry_id character varying(64) NOT NULL,
    industry_name character varying(128) NOT NULL,
    display_name character varying(128),
    sort_order integer DEFAULT 0 NOT NULL,
    active_flag boolean DEFAULT true NOT NULL,
    risk_disclaimer_template text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_master_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_master_id_seq OWNED BY public.industry_master.id;


--
-- Name: industry_opportunity_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_opportunity_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    industry_id character varying(64) NOT NULL,
    opportunity_score numeric(10,2) NOT NULL,
    trend_score numeric(10,2) NOT NULL,
    capital_score numeric(10,2) NOT NULL,
    valuation_score numeric(10,2) NOT NULL,
    risk_level character varying(16) NOT NULL,
    label character varying(32) NOT NULL,
    summary text NOT NULL,
    tags_json jsonb,
    methodology_json jsonb,
    focus_reason text,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_opportunity_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.industry_opportunity_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: industry_opportunity_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.industry_opportunity_daily_id_seq OWNED BY public.industry_opportunity_daily.id;


--
-- Name: job_run_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_run_log (
    id bigint NOT NULL,
    job_name character varying(128) NOT NULL,
    batch_id character varying(64) NOT NULL,
    trade_date date,
    run_status character varying(32) NOT NULL,
    started_at timestamp without time zone NOT NULL,
    ended_at timestamp without time zone,
    processed_count integer,
    error_message text,
    log_path character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: job_run_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_run_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_run_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_run_log_id_seq OWNED BY public.job_run_log.id;


--
-- Name: portfolio_candidate_fund; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_candidate_fund (
    id bigint NOT NULL,
    candidate_id character varying(96) NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    trade_date date NOT NULL,
    fund_id character varying(64) NOT NULL,
    fund_code character varying(32) NOT NULL,
    fund_name character varying(255) NOT NULL,
    source_type character varying(64) NOT NULL,
    reason text NOT NULL,
    metrics_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    data_quality character varying(32) DEFAULT 'snapshot'::character varying NOT NULL,
    risk_disclaimer text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_candidate_fund_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_candidate_fund_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_candidate_fund_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_candidate_fund_id_seq OWNED BY public.portfolio_candidate_fund.id;


--
-- Name: portfolio_decision_tip; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_decision_tip (
    id bigint NOT NULL,
    tip_id character varying(96) NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    trade_date date NOT NULL,
    tip_type character varying(64) NOT NULL,
    severity character varying(32) NOT NULL,
    title character varying(255) NOT NULL,
    summary text NOT NULL,
    evidence_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    data_quality character varying(32) DEFAULT 'computed'::character varying NOT NULL,
    risk_disclaimer text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_decision_tip_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_decision_tip_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_decision_tip_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_decision_tip_id_seq OWNED BY public.portfolio_decision_tip.id;


--
-- Name: portfolio_diagnosis_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_diagnosis_snapshot (
    id bigint NOT NULL,
    diagnosis_id character varying(96) NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    trade_date date NOT NULL,
    diagnosis_json jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_diagnosis_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_diagnosis_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_diagnosis_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_diagnosis_snapshot_id_seq OWNED BY public.portfolio_diagnosis_snapshot.id;


--
-- Name: portfolio_position_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_position_snapshot (
    id bigint NOT NULL,
    snapshot_id character varying(96) NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    position_id character varying(128) NOT NULL,
    fund_code character varying(32),
    fund_name character varying(255) NOT NULL,
    source character varying(64) DEFAULT 'manual_snapshot'::character varying NOT NULL,
    market_value_snapshot numeric(18,4),
    day_profit_snapshot numeric(18,4),
    holding_profit_snapshot numeric(18,4),
    holding_return_snapshot numeric(10,4),
    units numeric(20,6),
    cost_nav numeric(18,6),
    data_status character varying(32) DEFAULT 'snapshot'::character varying NOT NULL,
    data_date date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_position_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_position_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_position_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_position_snapshot_id_seq OWNED BY public.portfolio_position_snapshot.id;


--
-- Name: portfolio_position_valuation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_position_valuation (
    id bigint NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    trade_date date NOT NULL,
    position_id character varying(128) NOT NULL,
    fund_code character varying(32),
    fund_name character varying(255) NOT NULL,
    theme character varying(128),
    fund_type character varying(64),
    latest_nav numeric(18,6),
    previous_nav numeric(18,6),
    return_1d numeric(10,4),
    market_value numeric(18,4),
    cost_value numeric(18,4),
    day_profit numeric(18,4),
    holding_profit numeric(18,4),
    holding_return numeric(10,4),
    data_mode character varying(32) DEFAULT 'snapshot'::character varying NOT NULL,
    data_quality character varying(32) DEFAULT 'snapshot_only'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_position_valuation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_position_valuation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_position_valuation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_position_valuation_id_seq OWNED BY public.portfolio_position_valuation.id;


--
-- Name: portfolio_valuation_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_valuation_snapshot (
    id bigint NOT NULL,
    valuation_id character varying(96) NOT NULL,
    user_id character varying(96) DEFAULT 'local-demo'::character varying NOT NULL,
    trade_date date NOT NULL,
    total_market_value numeric(18,4),
    total_cost_value numeric(18,4),
    total_day_profit numeric(18,4),
    total_holding_profit numeric(18,4),
    holding_count integer DEFAULT 0 NOT NULL,
    enhanced_count integer DEFAULT 0 NOT NULL,
    summary_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    quality_json jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_valuation_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portfolio_valuation_snapshot_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portfolio_valuation_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portfolio_valuation_snapshot_id_seq OWNED BY public.portfolio_valuation_snapshot.id;


--
-- Name: source_ingestion_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_ingestion_audit (
    id bigint NOT NULL,
    source_name character varying(128) NOT NULL,
    batch_id character varying(64) NOT NULL,
    trade_date date NOT NULL,
    file_path character varying(255),
    row_count integer,
    checksum character varying(128),
    ingestion_status character varying(32) NOT NULL,
    message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: source_ingestion_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.source_ingestion_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: source_ingestion_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.source_ingestion_audit_id_seq OWNED BY public.source_ingestion_audit.id;


--
-- Name: watchlist_change_summary_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist_change_summary_daily (
    id bigint NOT NULL,
    trade_date date NOT NULL,
    item_type character varying(32) NOT NULL,
    item_id character varying(64) NOT NULL,
    status_label character varying(64),
    latest_change text,
    watch_hint text,
    source_batch_id character varying(64) NOT NULL,
    data_version character varying(64) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: watchlist_change_summary_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.watchlist_change_summary_daily_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: watchlist_change_summary_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.watchlist_change_summary_daily_id_seq OWNED BY public.watchlist_change_summary_daily.id;


--
-- Name: data_publish_batch id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_publish_batch ALTER COLUMN id SET DEFAULT nextval('public.data_publish_batch_id_seq'::regclass);


--
-- Name: data_quality_result id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_result ALTER COLUMN id SET DEFAULT nextval('public.data_quality_result_id_seq'::regclass);


--
-- Name: fund_candidate_request id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_candidate_request ALTER COLUMN id SET DEFAULT nextval('public.fund_candidate_request_id_seq'::regclass);


--
-- Name: fund_collection_task id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_collection_task ALTER COLUMN id SET DEFAULT nextval('public.fund_collection_task_id_seq'::regclass);


--
-- Name: fund_compare_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_compare_daily ALTER COLUMN id SET DEFAULT nextval('public.fund_compare_daily_id_seq'::regclass);


--
-- Name: fund_daily_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_daily_metrics ALTER COLUMN id SET DEFAULT nextval('public.fund_daily_metrics_id_seq'::regclass);


--
-- Name: fund_disclosed_holding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_disclosed_holding ALTER COLUMN id SET DEFAULT nextval('public.fund_disclosed_holding_id_seq'::regclass);


--
-- Name: fund_fee_rule id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_fee_rule ALTER COLUMN id SET DEFAULT nextval('public.fund_fee_rule_id_seq'::regclass);


--
-- Name: fund_holding_cost_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_holding_cost_snapshot ALTER COLUMN id SET DEFAULT nextval('public.fund_holding_cost_snapshot_id_seq'::regclass);


--
-- Name: fund_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_master ALTER COLUMN id SET DEFAULT nextval('public.fund_master_id_seq'::regclass);


--
-- Name: fund_redemption_fee_ladder id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_redemption_fee_ladder ALTER COLUMN id SET DEFAULT nextval('public.fund_redemption_fee_ladder_id_seq'::regclass);


--
-- Name: homepage_snapshot_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_snapshot_daily ALTER COLUMN id SET DEFAULT nextval('public.homepage_snapshot_daily_id_seq'::regclass);


--
-- Name: industry_daily_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_daily_metrics ALTER COLUMN id SET DEFAULT nextval('public.industry_daily_metrics_id_seq'::regclass);


--
-- Name: industry_detail_snapshot_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_detail_snapshot_daily ALTER COLUMN id SET DEFAULT nextval('public.industry_detail_snapshot_daily_id_seq'::regclass);


--
-- Name: industry_events_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_events_daily ALTER COLUMN id SET DEFAULT nextval('public.industry_events_daily_id_seq'::regclass);


--
-- Name: industry_fund_mapping id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_fund_mapping ALTER COLUMN id SET DEFAULT nextval('public.industry_fund_mapping_id_seq'::regclass);


--
-- Name: industry_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_master ALTER COLUMN id SET DEFAULT nextval('public.industry_master_id_seq'::regclass);


--
-- Name: industry_opportunity_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_opportunity_daily ALTER COLUMN id SET DEFAULT nextval('public.industry_opportunity_daily_id_seq'::regclass);


--
-- Name: job_run_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_run_log ALTER COLUMN id SET DEFAULT nextval('public.job_run_log_id_seq'::regclass);


--
-- Name: portfolio_candidate_fund id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_candidate_fund ALTER COLUMN id SET DEFAULT nextval('public.portfolio_candidate_fund_id_seq'::regclass);


--
-- Name: portfolio_decision_tip id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_decision_tip ALTER COLUMN id SET DEFAULT nextval('public.portfolio_decision_tip_id_seq'::regclass);


--
-- Name: portfolio_diagnosis_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_diagnosis_snapshot ALTER COLUMN id SET DEFAULT nextval('public.portfolio_diagnosis_snapshot_id_seq'::regclass);


--
-- Name: portfolio_position_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_snapshot ALTER COLUMN id SET DEFAULT nextval('public.portfolio_position_snapshot_id_seq'::regclass);


--
-- Name: portfolio_position_valuation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_valuation ALTER COLUMN id SET DEFAULT nextval('public.portfolio_position_valuation_id_seq'::regclass);


--
-- Name: portfolio_valuation_snapshot id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_valuation_snapshot ALTER COLUMN id SET DEFAULT nextval('public.portfolio_valuation_snapshot_id_seq'::regclass);


--
-- Name: source_ingestion_audit id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_ingestion_audit ALTER COLUMN id SET DEFAULT nextval('public.source_ingestion_audit_id_seq'::regclass);


--
-- Name: watchlist_change_summary_daily id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_change_summary_daily ALTER COLUMN id SET DEFAULT nextval('public.watchlist_change_summary_daily_id_seq'::regclass);


--
-- Data for Name: data_publish_batch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_publish_batch (id, batch_id, trade_date, pipeline_stage, publish_status, published_at, rollback_from_batch_id, message, created_at, updated_at) FROM stdin;
2	2026-04-21_170918	2026-04-21	snapshot-publish	published	2026-04-21 17:09:18.573762	\N	Seed demo data published	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
3	2026-04-21_180345	2026-04-21	snapshot-publish	published	2026-04-21 18:03:45.335093	\N	Manual-drop snapshots published for manual-drop-v1.	2026-04-21 18:03:45.335093	2026-04-21 18:03:45.335093
4	2026-04-21_180555	2026-04-21	snapshot-publish	published	2026-04-21 18:05:55.765597	\N	Manual-drop snapshots published for manual-drop-v1.	2026-04-21 18:05:55.765597	2026-04-21 18:05:55.765597
5	2026-04-21_180626	2026-04-21	snapshot-publish	published	2026-04-21 18:06:26.623393	\N	Manual-drop snapshots published for manual-drop-v1.	2026-04-21 18:06:26.623393	2026-04-21 18:06:26.623393
\.


--
-- Data for Name: data_quality_result; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.data_quality_result (id, batch_id, trade_date, rule_name, rule_level, check_status, sample_payload, message, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fund_candidate_request; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_candidate_request (id, request_id, fund_id, fund_code, fund_name_query, matched_fund_name, matched_fund_type, matched_fund_company, theme, tracking_target, source_name, request_status, last_success_trade_date, last_error_message, created_at, updated_at) FROM stdin;
1	candidate-017731	user-017731	017731	嘉实全球产业升级	嘉实全球产业升级股票(QDII)C	QDII	嘉实基金	自选基金	嘉实全球产业升级	manual-seed	pending	\N	\N	2026-04-24 21:15:45.78896	2026-04-24 21:15:45.78896
3	candidate-017524	user-017524	017524	南方北证50	南方北证50成份指数发起C	指数基金	南方基金	自选基金	北证50	manual-seed	pending	\N	\N	2026-04-24 21:15:46.055257	2026-04-24 21:15:46.055257
2	candidate-017523	user-017523	017523	南方北证50	南方北证50成份指数发起A	指数基金	南方基金	自选基金	北证50	manual-seed	ready	2026-04-24	\N	2026-04-24 21:15:45.985693	2026-04-24 21:56:53.846968
4	candidate-016874	user-016874	016874	广发远见智选混合C	广发远见智选混合C	\N	\N	自选基金	广发远见智选混合C	akshare	ready	2026-04-29	\N	2026-04-29 10:09:58.645408	2026-04-29 14:38:29.96802
\.


--
-- Data for Name: fund_collection_task; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_collection_task (id, task_id, fund_id, fund_code, task_type, task_status, attempt_count, last_success_trade_date, last_error_message, started_at, ended_at, created_at, updated_at) FROM stdin;
1	collect-017523-ff66d5bd67	user-017523	017523	single_fund_collect	ready	1	2026-04-24	\N	2026-04-24 21:56:16.740442	2026-04-24 21:56:53.846968	2026-04-24 21:56:16.599974	2026-04-24 21:56:53.846968
2	collect-016874-98d64bdf86	user-016874	016874	single_fund_collect	failed	1	\N	the query has 16 placeholders but 17 parameters were passed	2026-04-29 10:09:59.598277	2026-04-29 10:19:21.758555	2026-04-29 10:09:59.561037	2026-04-29 10:19:21.758555
3	collect-016874-86770b2c78	user-016874	016874	single_fund_collect	ready	1	2026-04-29	\N	2026-04-29 14:37:42.801578	2026-04-29 14:38:29.96802	2026-04-29 14:37:42.651203	2026-04-29 14:38:29.96802
\.


--
-- Data for Name: fund_compare_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_compare_daily (id, trade_date, fund_id, return_metrics_json, risk_metrics_json, fee_rate, aum, inception_date, top_holdings_json, concentration_label, tracking_deviation_note, source_batch_id, data_version, created_at, updated_at) FROM stdin;
5	2026-04-21	f1	{"month1": 8.4, "month3": 15.2, "month6": 9.1}	{"volatility": 24.8, "maxDrawdown": -12.6}	0.5000	76.2000	2022-03-15	["北方华创", "中微公司", "沪硅产业"]	中	跟踪误差可控，适合主题表达。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
6	2026-04-21	f2	{"month1": 6.7, "month3": 13.6, "month6": 7.5}	{"volatility": 21.4, "maxDrawdown": -11.1}	0.6000	18.9000	2023-03-15	["北方华创", "拓荆科技", "华海清科"]	中	联接基金以主题跟踪为主，适合场外观察。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
7	2026-04-21	f3	{"month1": 5.1, "month3": 11.2, "month6": 6.8}	{"volatility": 19.8, "maxDrawdown": -10.5}	0.4500	28.5000	2022-03-15	["百济神州", "恒瑞医药", "信达生物"]	中	跟踪误差可控，适合观察创新药修复。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
8	2026-04-21	f4	{"month1": 9.6, "month3": 18.7, "month6": 12.4}	{"volatility": 29.2, "maxDrawdown": -15.4}	1.2000	11.3000	2024-06-28	["中际旭创", "新易盛", "寒武纪"]	中高	主动管理，不适用指数跟踪误差。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
15	2026-04-21	ai-infra-3	{"month1": 0.0, "month3": 0.0, "month6": 0.0}	{"volatility": 0.0, "maxDrawdown": 0.0}	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:512930	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-22 09:55:01.613588
16	2026-04-21	ai-infra-4	{"month1": 0.0, "month3": 0.0, "month6": 0.0}	{"volatility": 0.0, "maxDrawdown": 0.0}	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:588790	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-22 09:55:01.613588
17	2026-04-21	ai-infra-5	{"month1": 0.0, "month3": 0.0, "month6": 0.0}	{"volatility": 0.0, "maxDrawdown": 0.0}	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:589090	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-22 09:55:01.613588
13	2026-04-21	ai-infra-1	{"month1": 7.3915, "month3": -7.2975, "month6": 4.8823}	{"volatility": 36.4922, "maxDrawdown": -20.5641}	\N	0.4443	2025-08-12	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
14	2026-04-21	ai-infra-2	{"month1": 16.65, "month3": 19.8164, "month6": 49.9158}	{"volatility": 42.9656, "maxDrawdown": -13.9163}	\N	0.3658	2025-08-19	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
18	2026-04-21	innovative-medicine-1	{"month1": 5.31, "month3": -3.3366, "month6": -7.1922}	{"volatility": 24.1735, "maxDrawdown": -24.2061}	\N	3.6100	2021-07-07	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
19	2026-04-21	innovative-medicine-2	{"month1": 5.2198, "month3": -3.31, "month6": -7.4009}	{"volatility": 23.6839, "maxDrawdown": -24.0528}	\N	1.3000	2021-12-30	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
20	2026-04-21	innovative-medicine-3	{"month1": 7.6664, "month3": -2.7622, "month6": -3.9312}	{"volatility": 28.1213, "maxDrawdown": -23.8126}	\N	0.5047	2021-11-22	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
21	2026-04-21	innovative-medicine-4	{"month1": 7.6491, "month3": -3.4897, "month6": -3.5992}	{"volatility": 29.8332, "maxDrawdown": -23.2301}	\N	3.0600	2022-05-06	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
22	2026-04-21	innovative-medicine-5	{"month1": 5.4859, "month3": -2.8778, "month6": -6.2104}	{"volatility": 23.8843, "maxDrawdown": -23.2998}	\N	1.7700	2023-11-14	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
23	2026-04-21	semiconductor-1	{"month1": 7.1837, "month3": -7.3266, "month6": 8.5845}	{"volatility": 35.8532, "maxDrawdown": -19.7672}	\N	15.6200	2019-11-22	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
24	2026-04-21	semiconductor-2	{"month1": 5.9642, "month3": -9.2024, "month6": 5.1059}	{"volatility": 36.8377, "maxDrawdown": -20.8505}	\N	37.9800	2020-06-02	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
25	2026-04-21	semiconductor-3	{"month1": 7.2382, "month3": -7.3533, "month6": 9.3845}	{"volatility": 36.2501, "maxDrawdown": -19.8169}	\N	2.5600	2021-07-21	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
26	2026-04-21	semiconductor-4	{"month1": 5.9765, "month3": -9.208, "month6": 4.7147}	{"volatility": 36.7191, "maxDrawdown": -20.7923}	\N	7.4200	2021-08-09	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
27	2026-04-21	semiconductor-5	{"month1": 7.1818, "month3": -7.4357, "month6": 8.4182}	{"volatility": 35.7004, "maxDrawdown": -19.898}	\N	1.3300	2021-08-03	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095501	manual-drop-v1	2026-04-22 09:55:01.613588	2026-04-28 15:41:43.306592
28	2026-04-24	user-017523	{"month1": 6.073, "month3": -13.0229, "month6": -6.7045}	{"volatility": 27.4626, "maxDrawdown": -23.7417}	\N	0.8986	2022-12-23	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-24-017523	akshare-user-v1	2026-04-24 21:56:53.774111	2026-04-28 15:41:43.306592
29	2026-04-29	user-008281	{"day1": -1.0226, "month1": 17.2985, "month3": 1.5741, "month6": 14.9018, "latestNav": 2.1875, "previousNav": 2.2101}	{"volatility": 32.3803, "maxDrawdown": -19.7672}	\N	14.0100	2019-11-22	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-008281	akshare-user-v1	2026-04-29 14:22:44.649934	2026-04-29 14:22:44.649934
30	2026-04-29	user-008887	{"day1": -1.042, "month1": 17.1082, "month3": 0.0174, "month6": 11.5673, "latestNav": 1.7284, "previousNav": 1.7466}	{"volatility": 33.217, "maxDrawdown": -20.8505}	\N	34.5600	2020-06-02	["海光信息", "北方华创", "中芯国际", "兆易创新", "寒武纪", "中微公司", "澜起科技", "豪威集团", "芯原股份", "拓荆科技"]	前十大占净值 1.79%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-008887	akshare-user-v1	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
31	2026-04-29	user-012552	{"day1": -1.241, "month1": 17.6296, "month3": 1.8813, "month6": 15.2406, "latestNav": 1.3051, "previousNav": 1.3215}	{"volatility": 32.7448, "maxDrawdown": -19.8169}	\N	2.4900	2021-07-21	["海光信息", "北方华创", "中芯国际", "寒武纪", "兆易创新", "澜起科技", "中微公司", "豪威集团", "芯原股份", "佰维存储"]	前十大占净值 2.65%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012552	akshare-user-v1	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
32	2026-04-29	user-012629	{"day1": -1.0309, "month1": 17.0615, "month3": 0.0085, "month6": 11.1301, "latestNav": 1.1712, "previousNav": 1.1834}	{"volatility": 33.0971, "maxDrawdown": -20.7923}	\N	6.4100	2021-08-09	["北方华创", "紫光国微", "通富微电", "圣邦股份", "卓胜微", "华天科技", "华大九天", "晶盛机电", "北京君正", "景嘉微"]	前十大占净值 0.01%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012629	akshare-user-v1	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
33	2026-04-29	user-012837	{"day1": -1.0304, "month1": 17.0127, "month3": 1.2095, "month6": 14.4545, "latestNav": 1.1046, "previousNav": 1.1161}	{"volatility": 32.2495, "maxDrawdown": -19.898}	\N	1.2500	2021-08-03	["海光信息", "北方华创", "中芯国际", "寒武纪", "兆易创新", "澜起科技", "中微公司", "豪威集团", "芯原股份", "佰维存储"]	前十大占净值 52.37%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012837	akshare-user-v1	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
34	2026-04-29	user-159995	{"day1": -1.08, "month1": 0.0, "month3": 0.0, "month6": 0.0, "latestNav": 1.9824, "previousNav": 2.004}	{"volatility": 0.0, "maxDrawdown": 0.0}	\N	\N	\N	["海光信息", "北方华创", "中芯国际", "兆易创新", "寒武纪", "中微公司", "澜起科技", "豪威集团", "芯原股份", "拓荆科技"]	前十大占净值 68.87%	场内 ETF 按历史行情估算区间收益与风险，适用于盘后对比观察。	akshare-user-2026-04-29-159995	akshare-user-v1	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
38	2026-04-29	user-017524	{"day1": -2.512, "month1": 4.7787, "month3": -13.0432, "month6": -15.7102, "latestNav": 1.2147, "previousNav": 1.246}	{"volatility": 27.2725, "maxDrawdown": -23.8678}	\N	2.2500	2022-12-23	["贝特瑞", "锦波生物", "纳科诺尔", "并行科技", "同力股份", "连城数控", "诺思兰德", "星图测控", "曙光数创", "吉林碳谷"]	前十大占净值 38.95%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-017524	akshare-user-v1	2026-04-29 15:50:30.178837	2026-04-29 16:41:17.880487
44	2026-04-29	user-012922	{"day1": 0.1291, "month1": 30.0324, "month3": 28.9995, "month6": 43.4116, "latestNav": 3.4915, "previousNav": 3.487}	{"volatility": 26.1729, "maxDrawdown": -8.8454}	\N	61.6100	2022-01-11	["台积电", "Lumentum Holdings Inc", "新易盛", "康宁", "AXT Inc", "中际旭创", "源杰科技", "Tower半导体", "谷歌-A", "东山精密"]	前十大占净值 51.83%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-012922	akshare-user-v1	2026-04-29 15:52:17.121126	2026-04-29 16:40:07.057451
35	2026-04-29	user-016874	{"day1": -0.9404, "month1": 18.8121, "month3": 38.0117, "month6": 95.4298, "latestNav": 1.8644, "previousNav": 1.8821}	{"volatility": 38.9172, "maxDrawdown": -16.8604}	\N	106.5500	2022-11-22	["长飞光纤", "中天科技", "亨通光电", "协创数据", "佰维存储", "德明利", "亚翔集成", "宏景科技", "杭电股份", "国科微"]	前十大占净值 69.61%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016874	akshare-user-v1	2026-04-29 14:38:29.914802	2026-04-29 16:40:59.293469
42	2026-04-29	user-017731	{"day1": 0.9083, "month1": 33.6609, "month3": 21.6035, "month6": 37.4687, "latestNav": 3.455, "previousNav": 3.4239}	{"volatility": 25.362, "maxDrawdown": -11.9292}	\N	11.5000	2023-02-09	["博通", "美光科技", "迈威尔科技", "源杰科技", "英伟达", "阿斯麦", "寒武纪", "科磊", "台积电", "超威半导体"]	前十大占净值 40.15%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-017731	akshare-user-v1	2026-04-29 15:51:41.085226	2026-04-29 16:41:38.040858
41	2026-04-29	user-018147	{"day1": 1.5779, "month1": 30.9599, "month3": 27.3964, "month6": 43.6541, "latestNav": 2.06, "previousNav": 2.028}	{"volatility": 27.8561, "maxDrawdown": -11.2803}	\N	34.4900	2023-03-17	["台积电", "英伟达", "SK海力士", "博通", "三星电子", "闪迪", "康宁", "西部数据", "Lumentum Holdings Inc", "Monolithic Power Systems Inc"]	前十大占净值 64.33%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-018147	akshare-user-v1	2026-04-29 15:51:22.553875	2026-04-29 16:41:55.502611
43	2026-04-29	user-022328	{"day1": 1.1394, "month1": 5.0049, "month3": 1.9256, "month6": 35.3746, "latestNav": 1.7309, "previousNav": 1.7114}	{"volatility": 21.1648, "maxDrawdown": -11.0297}	\N	10.5100	2025-01-16	["万华化学", "华鲁恒升", "恒逸石化", "新凤鸣", "扬农化工", "新和成", "新疆天业", "三友化工", "中盐化工", "新乡化纤"]	前十大占净值 44.78%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-022328	akshare-user-v1	2026-04-29 15:51:57.068275	2026-04-29 16:42:49.081995
39	2026-04-29	user-024239	{"day1": -1.1519, "month1": 34.1201, "month3": 27.8104, "month6": 33.6985, "latestNav": 2.9776, "previousNav": 3.0123}	{"volatility": 29.2564, "maxDrawdown": -13.5542}	\N	13.9400	2025-05-13	["Ciena科技", "台积电", "Lumentum Holdings Inc", "Coherent Corp", "Viavi Solutions Inc", "康宁", "闪迪", "美光科技", "先进能源工业", "泰瑞达"]	前十大占净值 36.62%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-024239	akshare-user-v1	2026-04-29 15:50:46.332554	2026-04-29 16:43:26.215039
40	2026-04-29	user-025500	{"day1": -0.4444, "month1": 18.6068, "month3": 2.3342, "month6": 36.5984, "latestNav": 1.4336, "previousNav": 1.44}	{"volatility": 50.3987, "maxDrawdown": -23.318}	\N	14.9800	2025-09-12	["德明利", "江波龙", "佰维存储", "兆易创新", "香农芯创", "北京君正", "普冉股份", "恒烁股份", "精智达", "澜起科技"]	前十大占净值 77.03%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-025500	akshare-user-v1	2026-04-29 15:51:04.896204	2026-04-29 16:43:45.599194
36	2026-04-29	user-026478	{"day1": -2.4139, "month1": 1.5848, "month3": -15.234, "month6": 0.0, "latestNav": 0.9743, "previousNav": 0.9984}	{"volatility": 39.7628, "maxDrawdown": -24.8717}	\N	4.8700	2026-01-12	["红板科技"]	前十大占净值 0.01%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-026478	akshare-user-v1	2026-04-29 15:49:52.837684	2026-04-29 16:44:02.641552
48	2026-04-29	user-016371	{"day1": -1.855, "month1": 27.6772, "month3": 39.896, "month6": 62.1065, "latestNav": 2.5026, "previousNav": 2.5499}	{"volatility": 52.0873, "maxDrawdown": -19.2578}	\N	28.5000	2022-08-25	["中际旭创", "新易盛", "天孚通信", "源杰科技", "长飞光纤", "麦格米特", "长芯博创", "永鼎股份", "德科立", "东山精密"]	前十大占净值 66.2%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016371	akshare-user-v1	2026-04-29 15:53:30.82197	2026-04-29 16:40:25.537905
47	2026-04-29	user-016702	{"day1": 0.1008, "month1": 25.5537, "month3": 6.1878, "month6": 3.2207, "latestNav": 1.8877, "previousNav": 1.8858}	{"volatility": 21.0018, "maxDrawdown": -18.2036}	\N	23.0800	2023-03-15	["英伟达", "谷歌-A", "苹果", "亚马逊", "博通", "特斯拉", "美光科技", "台积电", "超威半导体", "微软"]	前十大占净值 53.8%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016702	akshare-user-v1	2026-04-29 15:53:10.098131	2026-04-29 16:40:42.327358
46	2026-04-29	user-020640	{"day1": -0.0444, "month1": 14.3649, "month3": 5.8926, "month6": 31.4885, "latestNav": 2.2499, "previousNav": 2.2509}	{"volatility": 34.3072, "maxDrawdown": -18.6955}	\N	20.4200	2024-03-05	["江化微", "中科飞测", "中船特气", "沪硅产业", "中巨芯"]	前十大占净值 0.02%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-020640	akshare-user-v1	2026-04-29 15:52:53.649988	2026-04-29 16:42:12.241947
45	2026-04-29	user-021662	{"day1": 1.3523, "month1": 30.2808, "month3": 23.7639, "month6": 46.8216, "latestNav": 2.5707, "previousNav": 2.5364}	{"volatility": 24.824, "maxDrawdown": -14.0518}	\N	12.4900	2024-09-12	["台积电", "三星电子", "阿里巴巴-W", "台积电", "SK海力士", "欢聚", "联发科", "台达电", "智邦", "揖斐电株式会社"]	前十大占净值 39.32%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-021662	akshare-user-v1	2026-04-29 15:52:34.130144	2026-04-29 16:42:31.339167
49	2026-04-29	user-023408	{"day1": -2.3365, "month1": 14.6539, "month3": 8.5485, "month6": 38.801, "latestNav": 2.1485, "previousNav": 2.1999}	{"volatility": 40.0624, "maxDrawdown": -13.6395}	\N	12.5900	2025-02-14	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-023408	akshare-user-v1	2026-04-29 15:53:53.185612	2026-04-29 16:43:10.648279
\.


--
-- Data for Name: fund_daily_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_daily_metrics (id, trade_date, fund_id, return_1m, return_3m, return_6m, max_drawdown, volatility, aum, founded_years, top_holdings_json, concentration_label, tracking_deviation_note, source_batch_id, data_version, created_at, updated_at, return_1d, latest_nav, previous_nav) FROM stdin;
5	2026-04-21	f1	8.4000	15.2000	9.1000	-12.6000	24.8000	76.2000	5	["北方华创", "中微公司", "沪硅产业"]	中	跟踪误差可控，适合主题表达。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216	\N	\N	\N
6	2026-04-21	f2	6.7000	13.6000	7.5000	-11.1000	21.4000	18.9000	3	["北方华创", "拓荆科技", "华海清科"]	中	联接基金以主题跟踪为主，适合场外观察。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216	\N	\N	\N
7	2026-04-21	f3	5.1000	11.2000	6.8000	-10.5000	19.8000	28.5000	4	["百济神州", "恒瑞医药", "信达生物"]	中	跟踪误差可控，适合观察创新药修复。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216	\N	\N	\N
8	2026-04-21	f4	9.6000	18.7000	12.4000	-15.4000	29.2000	11.3000	2	["中际旭创", "新易盛", "寒武纪"]	中高	主动管理，不适用指数跟踪误差。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216	\N	\N	\N
25	2026-04-21	ai-infra-3	\N	\N	\N	\N	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:512930	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167	\N	\N	\N
26	2026-04-21	ai-infra-4	\N	\N	\N	\N	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:588790	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167	\N	\N	\N
27	2026-04-21	ai-infra-5	\N	\N	\N	\N	\N	\N	\N	[]	待补充	AKShare 日度抓取失败，当前保留空值占位：AKShare request failed after retries: fund_etf_hist_em:589090	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167	\N	\N	\N
13	2026-04-21	semiconductor-1	7.1837	-7.3266	8.5845	-19.7672	35.8532	15.6200	7	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
14	2026-04-21	semiconductor-2	5.9642	-9.2024	5.1059	-20.8505	36.8377	37.9800	6	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
15	2026-04-21	semiconductor-3	7.2382	-7.3533	9.3845	-19.8169	36.2501	2.5600	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
16	2026-04-21	semiconductor-4	5.9765	-9.2080	4.7147	-20.7923	36.7191	7.4200	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
17	2026-04-21	semiconductor-5	7.1818	-7.4357	8.4182	-19.8980	35.7004	1.3300	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
18	2026-04-21	innovative-medicine-1	5.3100	-3.3366	-7.1922	-24.2061	24.1735	3.6100	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
19	2026-04-21	innovative-medicine-2	5.2198	-3.3100	-7.4009	-24.0528	23.6839	1.3000	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
20	2026-04-21	innovative-medicine-3	7.6664	-2.7622	-3.9312	-23.8126	28.1213	0.5047	5	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
21	2026-04-21	innovative-medicine-4	7.6491	-3.4897	-3.5992	-23.2301	29.8332	3.0600	4	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
22	2026-04-21	innovative-medicine-5	5.4859	-2.8778	-6.2104	-23.2998	23.8843	1.7700	3	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
23	2026-04-21	ai-infra-1	7.3915	-7.2975	4.8823	-20.5641	36.4922	0.4443	1	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
24	2026-04-21	ai-infra-2	16.6500	19.8164	49.9158	-13.9163	42.9656	0.3658	1	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-28 15:41:43.306592	\N	\N	\N
28	2026-04-24	user-017523	6.0730	-13.0229	-6.7045	-23.7417	27.4626	0.8986	4	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-24-017523	akshare-user-v1	2026-04-24 21:56:53.774111	2026-04-28 15:41:43.306592	\N	\N	\N
29	2026-04-29	user-008281	17.2985	1.5741	14.9018	-19.7672	32.3803	14.0100	7	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-008281	akshare-user-v1	2026-04-29 14:22:44.649934	2026-04-29 14:22:44.649934	-1.0226	2.187500	2.210100
35	2026-04-29	user-008887	17.1082	0.0174	11.5673	-20.8505	33.2170	34.5600	6	["海光信息", "北方华创", "中芯国际", "兆易创新", "寒武纪", "中微公司", "澜起科技", "豪威集团", "芯原股份", "拓荆科技"]	前十大占净值 1.79%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-008887	akshare-user-v1	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975	-1.0420	1.728400	1.746600
36	2026-04-29	user-012552	17.6296	1.8813	15.2406	-19.8169	32.7448	2.4900	5	["海光信息", "北方华创", "中芯国际", "寒武纪", "兆易创新", "澜起科技", "中微公司", "豪威集团", "芯原股份", "佰维存储"]	前十大占净值 2.65%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012552	akshare-user-v1	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911	-1.2410	1.305100	1.321500
37	2026-04-29	user-012629	17.0615	0.0085	11.1301	-20.7923	33.0971	6.4100	5	["北方华创", "紫光国微", "通富微电", "圣邦股份", "卓胜微", "华天科技", "华大九天", "晶盛机电", "北京君正", "景嘉微"]	前十大占净值 0.01%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012629	akshare-user-v1	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261	-1.0309	1.171200	1.183400
38	2026-04-29	user-012837	17.0127	1.2095	14.4545	-19.8980	32.2495	1.2500	5	["海光信息", "北方华创", "中芯国际", "寒武纪", "兆易创新", "澜起科技", "中微公司", "豪威集团", "芯原股份", "佰维存储"]	前十大占净值 52.37%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-012837	akshare-user-v1	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529	-1.0304	1.104600	1.116100
39	2026-04-29	user-159995	\N	\N	\N	\N	\N	\N	\N	["海光信息", "北方华创", "中芯国际", "兆易创新", "寒武纪", "中微公司", "澜起科技", "豪威集团", "芯原股份", "拓荆科技"]	前十大占净值 68.87%	场内 ETF 按历史行情估算区间收益与风险，适用于盘后对比观察。	akshare-user-2026-04-29-159995	akshare-user-v1	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379	-1.0800	1.982400	2.004000
47	2026-04-29	user-017731	33.6609	21.6035	37.4687	-11.9292	25.3620	11.5000	3	["博通", "美光科技", "迈威尔科技", "源杰科技", "英伟达", "阿斯麦", "寒武纪", "科磊", "台积电", "超威半导体"]	前十大占净值 40.15%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-017731	akshare-user-v1	2026-04-29 15:51:41.085226	2026-04-29 16:41:38.040858	0.9083	3.455000	3.423900
49	2026-04-29	user-012922	30.0324	28.9995	43.4116	-8.8454	26.1729	61.6100	4	["台积电", "Lumentum Holdings Inc", "新易盛", "康宁", "AXT Inc", "中际旭创", "源杰科技", "Tower半导体", "谷歌-A", "东山精密"]	前十大占净值 51.83%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-012922	akshare-user-v1	2026-04-29 15:52:17.121126	2026-04-29 16:40:07.057451	0.1291	3.491500	3.487000
53	2026-04-29	user-016371	27.6772	39.8960	62.1065	-19.2578	52.0873	28.5000	4	["中际旭创", "新易盛", "天孚通信", "源杰科技", "长飞光纤", "麦格米特", "长芯博创", "永鼎股份", "德科立", "东山精密"]	前十大占净值 66.2%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016371	akshare-user-v1	2026-04-29 15:53:30.82197	2026-04-29 16:40:25.537905	-1.8550	2.502600	2.549900
52	2026-04-29	user-016702	25.5537	6.1878	3.2207	-18.2036	21.0018	23.0800	3	["英伟达", "谷歌-A", "苹果", "亚马逊", "博通", "特斯拉", "美光科技", "台积电", "超威半导体", "微软"]	前十大占净值 53.8%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016702	akshare-user-v1	2026-04-29 15:53:10.098131	2026-04-29 16:40:42.327358	0.1008	1.887700	1.885800
40	2026-04-29	user-016874	18.8121	38.0117	95.4298	-16.8604	38.9172	106.5500	4	["长飞光纤", "中天科技", "亨通光电", "协创数据", "佰维存储", "德明利", "亚翔集成", "宏景科技", "杭电股份", "国科微"]	前十大占净值 69.61%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-016874	akshare-user-v1	2026-04-29 14:38:29.914802	2026-04-29 16:40:59.293469	-0.9404	1.864400	1.882100
43	2026-04-29	user-017524	4.7787	-13.0432	-15.7102	-23.8678	27.2725	2.2500	4	["贝特瑞", "锦波生物", "纳科诺尔", "并行科技", "同力股份", "连城数控", "诺思兰德", "星图测控", "曙光数创", "吉林碳谷"]	前十大占净值 38.95%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-017524	akshare-user-v1	2026-04-29 15:50:30.178837	2026-04-29 16:41:17.880487	-2.5120	1.214700	1.246000
46	2026-04-29	user-018147	30.9599	27.3964	43.6541	-11.2803	27.8561	34.4900	3	["台积电", "英伟达", "SK海力士", "博通", "三星电子", "闪迪", "康宁", "西部数据", "Lumentum Holdings Inc", "Monolithic Power Systems Inc"]	前十大占净值 64.33%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-018147	akshare-user-v1	2026-04-29 15:51:22.553875	2026-04-29 16:41:55.502611	1.5779	2.060000	2.028000
51	2026-04-29	user-020640	14.3649	5.8926	31.4885	-18.6955	34.3072	20.4200	2	["江化微", "中科飞测", "中船特气", "沪硅产业", "中巨芯"]	前十大占净值 0.02%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-020640	akshare-user-v1	2026-04-29 15:52:53.649988	2026-04-29 16:42:12.241947	-0.0444	2.249900	2.250900
50	2026-04-29	user-021662	30.2808	23.7639	46.8216	-14.0518	24.8240	12.4900	2	["台积电", "三星电子", "阿里巴巴-W", "台积电", "SK海力士", "欢聚", "联发科", "台达电", "智邦", "揖斐电株式会社"]	前十大占净值 39.32%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-021662	akshare-user-v1	2026-04-29 15:52:34.130144	2026-04-29 16:42:31.339167	1.3523	2.570700	2.536400
48	2026-04-29	user-022328	5.0049	1.9256	35.3746	-11.0297	21.1648	10.5100	1	["万华化学", "华鲁恒升", "恒逸石化", "新凤鸣", "扬农化工", "新和成", "新疆天业", "三友化工", "中盐化工", "新乡化纤"]	前十大占净值 44.78%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-022328	akshare-user-v1	2026-04-29 15:51:57.068275	2026-04-29 16:42:49.081995	1.1394	1.730900	1.711400
54	2026-04-29	user-023408	14.6539	8.5485	38.8010	-13.6395	40.0624	12.5900	1	[]	待补充	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-023408	akshare-user-v1	2026-04-29 15:53:53.185612	2026-04-29 16:43:10.648279	-2.3365	2.148500	2.199900
44	2026-04-29	user-024239	34.1201	27.8104	33.6985	-13.5542	29.2564	13.9400	1	["Ciena科技", "台积电", "Lumentum Holdings Inc", "Coherent Corp", "Viavi Solutions Inc", "康宁", "闪迪", "美光科技", "先进能源工业", "泰瑞达"]	前十大占净值 36.62%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-024239	akshare-user-v1	2026-04-29 15:50:46.332554	2026-04-29 16:43:26.215039	-1.1519	2.977600	3.012300
45	2026-04-29	user-025500	18.6068	2.3342	36.5984	-23.3180	50.3987	14.9800	1	["德明利", "江波龙", "佰维存储", "兆易创新", "香农芯创", "北京君正", "普冉股份", "恒烁股份", "精智达", "澜起科技"]	前十大占净值 77.03%	主动型公募按净值历史估算区间收益与风险，不适用于指数跟踪偏离比较。	akshare-user-2026-04-29-025500	akshare-user-v1	2026-04-29 15:51:04.896204	2026-04-29 16:43:45.599194	-0.4444	1.433600	1.440000
41	2026-04-29	user-026478	1.5848	-15.2340	\N	-24.8717	39.7628	4.8700	0	["红板科技"]	前十大占净值 0.01%	场外公募按净值历史估算区间收益与风险，适用于盘后观察，不代表实时表现。	akshare-user-2026-04-29-026478	akshare-user-v1	2026-04-29 15:49:52.837684	2026-04-29 16:44:02.641552	-2.4139	0.974300	0.998400
\.


--
-- Data for Name: fund_disclosed_holding; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_disclosed_holding (id, fund_id, fund_code, report_period, report_date, disclose_date, holding_name, holding_code, holding_type, weight_percent, source_name, data_quality, created_at, updated_at) FROM stdin;
1	user-008887	008887	2026年1季度股票投资明细	\N	\N	海光信息	688041	stock	0.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
2	user-008887	008887	2026年1季度股票投资明细	\N	\N	北方华创	002371	stock	0.2400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
3	user-008887	008887	2026年1季度股票投资明细	\N	\N	中芯国际	688981	stock	0.2200	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
4	user-008887	008887	2026年1季度股票投资明细	\N	\N	兆易创新	603986	stock	0.2100	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
5	user-008887	008887	2026年1季度股票投资明细	\N	\N	寒武纪	688256	stock	0.1900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
6	user-008887	008887	2026年1季度股票投资明细	\N	\N	中微公司	688012	stock	0.1900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
7	user-008887	008887	2026年1季度股票投资明细	\N	\N	澜起科技	688008	stock	0.1900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
8	user-008887	008887	2026年1季度股票投资明细	\N	\N	豪威集团	603501	stock	0.1100	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
9	user-008887	008887	2026年1季度股票投资明细	\N	\N	芯原股份	688521	stock	0.0900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
10	user-008887	008887	2026年1季度股票投资明细	\N	\N	拓荆科技	688072	stock	0.0900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
11	user-012552	012552	2026年1季度股票投资明细	\N	\N	海光信息	688041	stock	0.3700	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
12	user-012552	012552	2026年1季度股票投资明细	\N	\N	北方华创	002371	stock	0.3600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
13	user-012552	012552	2026年1季度股票投资明细	\N	\N	中芯国际	688981	stock	0.3600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
14	user-012552	012552	2026年1季度股票投资明细	\N	\N	寒武纪	688256	stock	0.3300	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
15	user-012552	012552	2026年1季度股票投资明细	\N	\N	兆易创新	603986	stock	0.3000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
16	user-012552	012552	2026年1季度股票投资明细	\N	\N	澜起科技	688008	stock	0.2700	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
17	user-012552	012552	2026年1季度股票投资明细	\N	\N	中微公司	688012	stock	0.2500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
18	user-012552	012552	2026年1季度股票投资明细	\N	\N	豪威集团	603501	stock	0.1500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
19	user-012552	012552	2026年1季度股票投资明细	\N	\N	芯原股份	688521	stock	0.1300	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
20	user-012552	012552	2026年1季度股票投资明细	\N	\N	佰维存储	688525	stock	0.1300	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
21	user-012629	012629	2025年3季度股票投资明细	\N	\N	北方华创	002371	stock	0.0100	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
22	user-012629	012629	2025年3季度股票投资明细	\N	\N	紫光国微	002049	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
23	user-012629	012629	2025年3季度股票投资明细	\N	\N	通富微电	002156	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
24	user-012629	012629	2025年3季度股票投资明细	\N	\N	圣邦股份	300661	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
25	user-012629	012629	2025年3季度股票投资明细	\N	\N	卓胜微	300782	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
26	user-012629	012629	2025年3季度股票投资明细	\N	\N	华天科技	002185	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
27	user-012629	012629	2025年3季度股票投资明细	\N	\N	华大九天	301269	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
28	user-012629	012629	2025年3季度股票投资明细	\N	\N	晶盛机电	300316	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
29	user-012629	012629	2025年3季度股票投资明细	\N	\N	北京君正	300223	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
30	user-012629	012629	2025年3季度股票投资明细	\N	\N	景嘉微	300474	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
31	user-012837	012837	2026年1季度股票投资明细	\N	\N	海光信息	688041	stock	7.2000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
32	user-012837	012837	2026年1季度股票投资明细	\N	\N	北方华创	002371	stock	7.1300	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
33	user-012837	012837	2026年1季度股票投资明细	\N	\N	中芯国际	688981	stock	6.9200	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
34	user-012837	012837	2026年1季度股票投资明细	\N	\N	寒武纪	688256	stock	6.8000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
35	user-012837	012837	2026年1季度股票投资明细	\N	\N	兆易创新	603986	stock	5.8600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
36	user-012837	012837	2026年1季度股票投资明细	\N	\N	澜起科技	688008	stock	5.2800	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
37	user-012837	012837	2026年1季度股票投资明细	\N	\N	中微公司	688012	stock	4.9400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
38	user-012837	012837	2026年1季度股票投资明细	\N	\N	豪威集团	603501	stock	2.9600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
39	user-012837	012837	2026年1季度股票投资明细	\N	\N	芯原股份	688521	stock	2.7400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
40	user-012837	012837	2026年1季度股票投资明细	\N	\N	佰维存储	688525	stock	2.5400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
41	user-159995	159995	2026年1季度股票投资明细	\N	\N	海光信息	688041	stock	10.0900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
42	user-159995	159995	2026年1季度股票投资明细	\N	\N	北方华创	002371	stock	9.1200	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
43	user-159995	159995	2026年1季度股票投资明细	\N	\N	中芯国际	688981	stock	8.5000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
44	user-159995	159995	2026年1季度股票投资明细	\N	\N	兆易创新	603986	stock	8.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
45	user-159995	159995	2026年1季度股票投资明细	\N	\N	寒武纪	688256	stock	7.3400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
46	user-159995	159995	2026年1季度股票投资明细	\N	\N	中微公司	688012	stock	7.3300	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
47	user-159995	159995	2026年1季度股票投资明细	\N	\N	澜起科技	688008	stock	7.2900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
48	user-159995	159995	2026年1季度股票投资明细	\N	\N	豪威集团	603501	stock	4.2000	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
49	user-159995	159995	2026年1季度股票投资明细	\N	\N	芯原股份	688521	stock	3.5500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
50	user-159995	159995	2026年1季度股票投资明细	\N	\N	拓荆科技	688072	stock	3.4500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
51	user-159995	159995	2026年1季度股票投资明细	\N	\N	长电科技	600584	stock	2.9600	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
52	user-159995	159995	2026年1季度股票投资明细	\N	\N	紫光国微	002049	stock	2.2900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
53	user-159995	159995	2026年1季度股票投资明细	\N	\N	三安光电	600703	stock	2.0800	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
54	user-159995	159995	2026年1季度股票投资明细	\N	\N	北京君正	300223	stock	1.9100	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
55	user-159995	159995	2026年1季度股票投资明细	\N	\N	瑞芯微	603893	stock	1.6900	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
56	user-159995	159995	2026年1季度股票投资明细	\N	\N	圣邦股份	300661	stock	1.4500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
57	user-159995	159995	2026年1季度股票投资明细	\N	\N	晶盛机电	300316	stock	1.3400	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
58	user-159995	159995	2026年1季度股票投资明细	\N	\N	晶合集成	688249	stock	1.1700	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
59	user-159995	159995	2026年1季度股票投资明细	\N	\N	景嘉微	300474	stock	1.0500	akshare-eastmoney-f10	official_disclosure	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
283	user-024239	024239	2026年1季度股票投资明细	\N	\N	Ciena科技	CIEN	stock	5.5600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
284	user-024239	024239	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	4.8700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
285	user-024239	024239	2026年1季度股票投资明细	\N	\N	Lumentum Holdings Inc	LITE	stock	4.7200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
286	user-024239	024239	2026年1季度股票投资明细	\N	\N	Coherent Corp	COHR	stock	4.5900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
287	user-024239	024239	2026年1季度股票投资明细	\N	\N	Viavi Solutions Inc	VIAV	stock	4.5200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
288	user-024239	024239	2026年1季度股票投资明细	\N	\N	康宁	GLW	stock	4.1500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
289	user-024239	024239	2026年1季度股票投资明细	\N	\N	闪迪	SNDK	stock	2.6600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
290	user-024239	024239	2026年1季度股票投资明细	\N	\N	美光科技	MU	stock	2.3000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
291	user-024239	024239	2026年1季度股票投资明细	\N	\N	先进能源工业	AEIS	stock	1.6300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
292	user-024239	024239	2026年1季度股票投资明细	\N	\N	泰瑞达	TER	stock	1.6200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:26.215039	2026-04-29 16:43:26.215039
293	user-025500	025500	2026年1季度股票投资明细	\N	\N	德明利	001309	stock	9.6600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
294	user-025500	025500	2026年1季度股票投资明细	\N	\N	江波龙	301308	stock	9.0300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
295	user-025500	025500	2026年1季度股票投资明细	\N	\N	佰维存储	688525	stock	8.8100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
296	user-025500	025500	2026年1季度股票投资明细	\N	\N	兆易创新	603986	stock	8.8000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
297	user-025500	025500	2026年1季度股票投资明细	\N	\N	香农芯创	300475	stock	8.7600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
298	user-025500	025500	2026年1季度股票投资明细	\N	\N	北京君正	300223	stock	7.9700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
299	user-025500	025500	2026年1季度股票投资明细	\N	\N	普冉股份	688766	stock	7.6100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
300	user-025500	025500	2026年1季度股票投资明细	\N	\N	恒烁股份	688416	stock	6.1400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
301	user-025500	025500	2026年1季度股票投资明细	\N	\N	精智达	688627	stock	5.2500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
302	user-025500	025500	2026年1季度股票投资明细	\N	\N	澜起科技	688008	stock	5.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:43:45.599194	2026-04-29 16:43:45.599194
303	user-026478	026478	2026年1季度股票投资明细	\N	\N	红板科技	603459	stock	0.0100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:44:02.641552	2026-04-29 16:44:02.641552
187	user-012922	012922	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	8.8800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
188	user-012922	012922	2026年1季度股票投资明细	\N	\N	Lumentum Holdings Inc	LITE	stock	8.6800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
189	user-012922	012922	2026年1季度股票投资明细	\N	\N	新易盛	300502	stock	6.0200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
190	user-012922	012922	2026年1季度股票投资明细	\N	\N	康宁	GLW	stock	4.6700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
191	user-012922	012922	2026年1季度股票投资明细	\N	\N	AXT Inc	AXTI	stock	4.6700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
192	user-012922	012922	2026年1季度股票投资明细	\N	\N	中际旭创	300308	stock	4.6700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
193	user-012922	012922	2026年1季度股票投资明细	\N	\N	源杰科技	688498	stock	4.4900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
194	user-012922	012922	2026年1季度股票投资明细	\N	\N	Tower半导体	TSEM	stock	3.7200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
195	user-012922	012922	2026年1季度股票投资明细	\N	\N	谷歌-A	GOOGL	stock	3.3600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
196	user-012922	012922	2026年1季度股票投资明细	\N	\N	东山精密	002384	stock	2.6700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:07.057451	2026-04-29 16:40:07.057451
197	user-016371	016371	2026年1季度股票投资明细	\N	\N	中际旭创	300308	stock	9.4300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
198	user-016371	016371	2026年1季度股票投资明细	\N	\N	新易盛	300502	stock	9.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
199	user-016371	016371	2026年1季度股票投资明细	\N	\N	天孚通信	300394	stock	9.1200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
200	user-016371	016371	2026年1季度股票投资明细	\N	\N	源杰科技	688498	stock	8.4300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
201	user-016371	016371	2026年1季度股票投资明细	\N	\N	长飞光纤	601869	stock	7.0600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
202	user-016371	016371	2026年1季度股票投资明细	\N	\N	麦格米特	002851	stock	4.9500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
203	user-016371	016371	2026年1季度股票投资明细	\N	\N	长芯博创	300548	stock	4.6900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
204	user-016371	016371	2026年1季度股票投资明细	\N	\N	永鼎股份	600105	stock	4.6600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
205	user-016371	016371	2026年1季度股票投资明细	\N	\N	德科立	688205	stock	4.4100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
206	user-016371	016371	2026年1季度股票投资明细	\N	\N	东山精密	002384	stock	4.1900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:25.537905	2026-04-29 16:40:25.537905
207	user-016702	016702	2026年1季度股票投资明细	\N	\N	英伟达	NVDA	stock	9.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
208	user-016702	016702	2026年1季度股票投资明细	\N	\N	谷歌-A	GOOGL	stock	8.0600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
209	user-016702	016702	2026年1季度股票投资明细	\N	\N	苹果	AAPL	stock	6.3700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
210	user-016702	016702	2026年1季度股票投资明细	\N	\N	亚马逊	AMZN	stock	5.6200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
211	user-016702	016702	2026年1季度股票投资明细	\N	\N	博通	AVGO	stock	4.6900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
212	user-016702	016702	2026年1季度股票投资明细	\N	\N	特斯拉	TSLA	stock	4.6300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
213	user-016702	016702	2026年1季度股票投资明细	\N	\N	美光科技	MU	stock	3.9200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
214	user-016702	016702	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	3.9000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
215	user-016702	016702	2026年1季度股票投资明细	\N	\N	超威半导体	AMD	stock	3.7100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
216	user-016702	016702	2026年1季度股票投资明细	\N	\N	微软	MSFT	stock	3.6400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:42.327358	2026-04-29 16:40:42.327358
217	user-016874	016874	2026年1季度股票投资明细	\N	\N	长飞光纤	601869	stock	9.2800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
218	user-016874	016874	2026年1季度股票投资明细	\N	\N	中天科技	600522	stock	8.9200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
219	user-016874	016874	2026年1季度股票投资明细	\N	\N	亨通光电	600487	stock	8.6800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
220	user-016874	016874	2026年1季度股票投资明细	\N	\N	协创数据	300857	stock	6.5000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
221	user-016874	016874	2026年1季度股票投资明细	\N	\N	佰维存储	688525	stock	6.3400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
222	user-016874	016874	2026年1季度股票投资明细	\N	\N	德明利	001309	stock	6.2900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
223	user-016874	016874	2026年1季度股票投资明细	\N	\N	亚翔集成	603929	stock	6.1100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
224	user-016874	016874	2026年1季度股票投资明细	\N	\N	宏景科技	301396	stock	6.0900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
225	user-016874	016874	2026年1季度股票投资明细	\N	\N	杭电股份	603618	stock	5.9500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
226	user-016874	016874	2026年1季度股票投资明细	\N	\N	国科微	300672	stock	5.4500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:40:59.293469	2026-04-29 16:40:59.293469
227	user-017524	017524	2026年1季度股票投资明细	\N	\N	贝特瑞	920185	stock	7.1100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
228	user-017524	017524	2026年1季度股票投资明细	\N	\N	锦波生物	920982	stock	5.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
229	user-017524	017524	2026年1季度股票投资明细	\N	\N	纳科诺尔	920522	stock	3.7600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
230	user-017524	017524	2026年1季度股票投资明细	\N	\N	并行科技	920493	stock	3.6900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
231	user-017524	017524	2026年1季度股票投资明细	\N	\N	同力股份	920599	stock	3.6100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
232	user-017524	017524	2026年1季度股票投资明细	\N	\N	连城数控	920368	stock	3.4500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
233	user-017524	017524	2026年1季度股票投资明细	\N	\N	诺思兰德	920047	stock	3.3600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
234	user-017524	017524	2026年1季度股票投资明细	\N	\N	星图测控	920116	stock	3.1200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
235	user-017524	017524	2026年1季度股票投资明细	\N	\N	曙光数创	920808	stock	3.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
236	user-017524	017524	2026年1季度股票投资明细	\N	\N	吉林碳谷	920077	stock	2.8500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:17.880487	2026-04-29 16:41:17.880487
237	user-017731	017731	2026年1季度股票投资明细	\N	\N	博通	AVGO	stock	5.3700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
238	user-017731	017731	2026年1季度股票投资明细	\N	\N	美光科技	MU	stock	4.8500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
239	user-017731	017731	2026年1季度股票投资明细	\N	\N	迈威尔科技	MRVL	stock	4.3700	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
240	user-017731	017731	2026年1季度股票投资明细	\N	\N	源杰科技	688498	stock	4.2500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
241	user-017731	017731	2026年1季度股票投资明细	\N	\N	英伟达	NVDA	stock	3.7900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
242	user-017731	017731	2026年1季度股票投资明细	\N	\N	阿斯麦	ASML	stock	3.7000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
243	user-017731	017731	2026年1季度股票投资明细	\N	\N	寒武纪	688256	stock	3.6600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
244	user-017731	017731	2026年1季度股票投资明细	\N	\N	科磊	KLAC	stock	3.4400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
245	user-017731	017731	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	3.3900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
246	user-017731	017731	2026年1季度股票投资明细	\N	\N	超威半导体	AMD	stock	3.3300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:38.040858	2026-04-29 16:41:38.040858
247	user-018147	018147	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	10.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
248	user-018147	018147	2026年1季度股票投资明细	\N	\N	英伟达	NVDA	stock	10.1400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
249	user-018147	018147	2026年1季度股票投资明细	\N	\N	SK海力士	000660	stock	8.6500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
250	user-018147	018147	2026年1季度股票投资明细	\N	\N	博通	AVGO	stock	8.5200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
251	user-018147	018147	2026年1季度股票投资明细	\N	\N	三星电子	005930	stock	6.7600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
252	user-018147	018147	2026年1季度股票投资明细	\N	\N	闪迪	SNDK	stock	4.9100	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
253	user-018147	018147	2026年1季度股票投资明细	\N	\N	康宁	GLW	stock	4.2900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
254	user-018147	018147	2026年1季度股票投资明细	\N	\N	西部数据	WDC	stock	3.7300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
255	user-018147	018147	2026年1季度股票投资明细	\N	\N	Lumentum Holdings Inc	LITE	stock	3.5800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
256	user-018147	018147	2026年1季度股票投资明细	\N	\N	Monolithic Power Systems Inc	MPWR	stock	3.4900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:41:55.502611	2026-04-29 16:41:55.502611
257	user-020640	020640	2026年1季度股票投资明细	\N	\N	江化微	603078	stock	0.0200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:12.241947	2026-04-29 16:42:12.241947
258	user-020640	020640	2026年1季度股票投资明细	\N	\N	中科飞测	688361	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:12.241947	2026-04-29 16:42:12.241947
259	user-020640	020640	2026年1季度股票投资明细	\N	\N	中船特气	688146	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:12.241947	2026-04-29 16:42:12.241947
260	user-020640	020640	2026年1季度股票投资明细	\N	\N	沪硅产业	688126	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:12.241947	2026-04-29 16:42:12.241947
261	user-020640	020640	2026年1季度股票投资明细	\N	\N	中巨芯	688549	stock	0.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:12.241947	2026-04-29 16:42:12.241947
263	user-021662	021662	2026年1季度股票投资明细	\N	\N	三星电子	005930	stock	5.2800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
264	user-021662	021662	2026年1季度股票投资明细	\N	\N	阿里巴巴-W	09988	stock	5.0300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
262	user-021662	021662	2026年1季度股票投资明细	\N	\N	台积电	TSM	stock	4.8900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
266	user-021662	021662	2026年1季度股票投资明细	\N	\N	SK海力士	000660	stock	4.3200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
267	user-021662	021662	2026年1季度股票投资明细	\N	\N	欢聚	JOYY	stock	3.0000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
268	user-021662	021662	2026年1季度股票投资明细	\N	\N	联发科	2454	stock	2.9400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
269	user-021662	021662	2026年1季度股票投资明细	\N	\N	台达电	2308	stock	2.8600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
270	user-021662	021662	2026年1季度股票投资明细	\N	\N	智邦	2345	stock	2.7900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
271	user-021662	021662	2026年1季度股票投资明细	\N	\N	揖斐电株式会社	4062JP	stock	2.7300	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
272	user-021662	021662	2026年1季度股票投资明细	\N	\N	LG新能源	373220KS	stock	2.6000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:31.339167	2026-04-29 16:42:31.339167
273	user-022328	022328	2026年1季度股票投资明细	\N	\N	万华化学	600309	stock	6.2000	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
274	user-022328	022328	2026年1季度股票投资明细	\N	\N	华鲁恒升	600426	stock	6.0900	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
275	user-022328	022328	2026年1季度股票投资明细	\N	\N	恒逸石化	000703	stock	5.8200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
276	user-022328	022328	2026年1季度股票投资明细	\N	\N	新凤鸣	603225	stock	5.0600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
277	user-022328	022328	2026年1季度股票投资明细	\N	\N	扬农化工	600486	stock	4.5200	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
278	user-022328	022328	2026年1季度股票投资明细	\N	\N	新和成	002001	stock	4.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
279	user-022328	022328	2026年1季度股票投资明细	\N	\N	新疆天业	600075	stock	3.4400	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
280	user-022328	022328	2026年1季度股票投资明细	\N	\N	三友化工	600409	stock	3.3500	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
281	user-022328	022328	2026年1季度股票投资明细	\N	\N	中盐化工	600328	stock	3.2600	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
282	user-022328	022328	2026年1季度股票投资明细	\N	\N	新乡化纤	000949	stock	2.7800	akshare-eastmoney-f10	official_disclosure	2026-04-29 16:42:49.081995	2026-04-29 16:42:49.081995
\.


--
-- Data for Name: fund_fee_rule; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_fee_rule (id, fund_id, trade_date, subscription_fee_rate, purchase_fee_rate, management_fee_rate, custodian_fee_rate, sales_service_fee_rate, fee_rule_text, source_name, source_batch_id, data_version, quality_status, created_at, updated_at) FROM stdin;
1	semiconductor-1	2026-04-22	0.1500	0.1500	0.5000	0.1000	0.0000	申购费 0.15%，管理费 0.50%，托管费 0.10%。	manual-drop	manual-20260422	manual-drop-v1	complete	2026-04-22 10:44:43.748498	2026-04-22 10:44:43.748498
\.


--
-- Data for Name: fund_holding_cost_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_holding_cost_snapshot (id, trade_date, fund_id, holding_days, subscription_cost_rate, redemption_cost_rate, management_cost_rate, custodian_cost_rate, sales_service_cost_rate, total_cost_rate, is_redemption_fee_free, matched_redemption_rule_json, calculation_methodology_json, source_batch_id, data_version, created_at, updated_at) FROM stdin;
1	2026-04-22	semiconductor-1	7	0.1500	0.5000	0.0096	0.0019	0.0000	0.6615	f	{"ruleText": "持有不少于 7 天且少于 30 天，赎回费 0.50%。", "qualityStatus": "complete", "maxHoldingDays": 29, "minHoldingDays": 7, "redemptionFeeRate": 0.5}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 7, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": 29, "minHoldingDays": 7, "isFreeThreshold": false, "redemptionFeeRate": 0.5}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
2	2026-04-22	semiconductor-1	30	0.1500	0.0000	0.0411	0.0082	0.0000	0.1993	t	{"ruleText": "持有不少于 30 天，免赎回费。", "qualityStatus": "complete", "maxHoldingDays": null, "minHoldingDays": 30, "redemptionFeeRate": 0.0}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 30, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": null, "minHoldingDays": 30, "isFreeThreshold": true, "redemptionFeeRate": 0.0}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
3	2026-04-22	semiconductor-1	90	0.1500	0.0000	0.1233	0.0247	0.0000	0.2980	t	{"ruleText": "持有不少于 30 天，免赎回费。", "qualityStatus": "complete", "maxHoldingDays": null, "minHoldingDays": 30, "redemptionFeeRate": 0.0}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 90, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": null, "minHoldingDays": 30, "isFreeThreshold": true, "redemptionFeeRate": 0.0}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
4	2026-04-22	semiconductor-1	180	0.1500	0.0000	0.2466	0.0493	0.0000	0.4459	t	{"ruleText": "持有不少于 30 天，免赎回费。", "qualityStatus": "complete", "maxHoldingDays": null, "minHoldingDays": 30, "redemptionFeeRate": 0.0}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 180, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": null, "minHoldingDays": 30, "isFreeThreshold": true, "redemptionFeeRate": 0.0}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
5	2026-04-22	semiconductor-1	365	0.1500	0.0000	0.5000	0.1000	0.0000	0.7500	t	{"ruleText": "持有不少于 30 天，免赎回费。", "qualityStatus": "complete", "maxHoldingDays": null, "minHoldingDays": 30, "redemptionFeeRate": 0.0}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 365, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": null, "minHoldingDays": 30, "isFreeThreshold": true, "redemptionFeeRate": 0.0}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
6	2026-04-22	semiconductor-1	730	0.1500	0.0000	1.0000	0.2000	0.0000	1.3500	t	{"ruleText": "持有不少于 30 天，免赎回费。", "qualityStatus": "complete", "maxHoldingDays": null, "minHoldingDays": 30, "redemptionFeeRate": 0.0}	{"version": "long-hold-cost-v1", "disclaimer": "该结果用于基金之间的相对比较，不等同于用户真实到账成本，也不构成投资建议。", "holdingDays": 730, "qualityStatus": "complete", "annualFeeProration": "annual_rate * holding_days / 365", "matchedRedemptionRule": {"maxHoldingDays": null, "minHoldingDays": 30, "isFreeThreshold": true, "redemptionFeeRate": 0.0}}	2026-04-22_104456	manual-drop-v1	2026-04-22 10:44:56.417321	2026-04-22 10:44:56.417321
\.


--
-- Data for Name: fund_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_master (id, fund_id, fund_code, fund_name, fund_type, theme, tracking_target, fund_company, tradable_on_exchange, fee_rate, inception_date, status, created_at, updated_at) FROM stdin;
46	user-016874	016874	广发远见智选混合C	混合型-偏股	自选基金	广发远见智选混合C	广发基金管理有限公司	f	\N	2022-11-22	active	2026-04-29 14:38:29.914802	2026-04-29 16:40:59.293469
2	f2	012345	半导体设备联接A	联接基金	半导体	半导体设备主题ETF联接	远见基金	f	0.6000	2023-03-15	active	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
3	f3	560880	创新药产业ETF	ETF	创新药	创新药产业指数	医疗创新基金	t	0.4500	2022-03-15	active	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
4	f4	018888	AI算力先锋混合	主动基金	AI 算力基础设施	主动配置算力基础设施产业链	前沿成长基金	f	1.2000	2024-06-28	active	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
18	innovative-medicine-1	012737	广发创新药ETF联接A	股票型-标准指数	创新药	广发创新药 ETF 联接 A	广发基金管理有限公司	f	\N	2021-07-07	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
19	innovative-medicine-2	012781	银华中证创新药产业ETF发起式联接A	股票型-标准指数	创新药	银华中证创新药产业 ETF 发起式联接 A	银华基金管理股份有限公司	f	\N	2021-12-30	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
20	innovative-medicine-3	014117	国泰中证沪港深创新药产业ETF发起联接A	股票型-标准指数	创新药	国泰创新药 ETF 联接 A	国泰基金管理有限公司	f	\N	2021-11-22	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
21	innovative-medicine-4	014564	天弘恒生沪深港创新药精选50ETF发起联接A	股票型-标准指数	创新药	天弘创新药精选 50 ETF 联接 A	天弘基金管理有限公司	f	\N	2022-05-06	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
22	innovative-medicine-5	019666	易方达中证创新药产业ETF联接发起式A	股票型-标准指数	创新药	易方达中证创新药产业 ETF 联接发起式 A	易方达基金管理有限公司	f	\N	2023-11-14	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
23	ai-infra-1	024409	鑫元科创AI指数发起式A	股票型-标准指数	AI 算力基础设施	鑫元科创 AI 指数发起式 A	鑫元基金管理有限公司	f	\N	2025-08-12	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
24	ai-infra-2	024478	鑫元创业AI指数发起式A	股票型-标准指数	AI 算力基础设施	鑫元创业 AI 指数发起式 A	鑫元基金管理有限公司	f	\N	2025-08-19	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
25	ai-infra-3	512930	AI人工智能ETF平安	指数型-股票	AI 算力基础设施	AI 人工智能 ETF 平安		t	\N	\N	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
26	ai-infra-4	588790	科创AIETF博时	指数型-股票	AI 算力基础设施	科创 AI ETF 博时		t	\N	\N	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
27	ai-infra-5	589090	科创AIETF鹏华	指数型-股票	AI 算力基础设施	科创 AI ETF 鹏华		t	\N	\N	active	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
28	user-017523	017523	南方北证50成份指数发起A	股票型-标准指数	自选基金	北证50	南方基金管理股份有限公司	f	\N	2022-12-23	active	2026-04-24 21:56:53.774111	2026-04-24 21:56:53.774111
13	user-008281	008281	国泰CES半导体芯片行业ETF联接A	股票型-标准指数	自选基金	国泰CES半导体芯片行业ETF联接A	国泰基金管理有限公司	f	\N	2019-11-22	active	2026-04-22 09:55:00.833486	2026-04-29 14:22:44.649934
14	user-008887	008887	华夏国证半导体芯片ETF联接A	股票型-标准指数	自选基金	华夏国证半导体芯片ETF联接A	华夏基金管理有限公司	f	\N	2020-06-02	active	2026-04-22 09:55:00.833486	2026-04-29 14:26:01.863975
15	user-012552	012552	天弘中证芯片指数A	股票型-标准指数	自选基金	天弘芯片产业ETF联接A	天弘基金管理有限公司	f	\N	2021-07-21	active	2026-04-22 09:55:00.833486	2026-04-29 14:26:15.895911
16	user-012629	012629	广发国证半导体芯片ETF联接A	股票型-标准指数	自选基金	广发国证半导体芯片ETF联接A	广发基金管理有限公司	f	\N	2021-08-09	active	2026-04-22 09:55:00.833486	2026-04-29 14:26:34.222261
17	user-012837	012837	华安CES半导体芯片行业指数发起A	股票型-标准指数	自选基金	华安CES半导体芯片行业指数发起A	华安基金管理有限公司	f	\N	2021-08-03	active	2026-04-22 09:55:00.833486	2026-04-29 14:26:47.727529
1	user-159995	159995	芯片ETF华夏	指数型-股票	自选基金	芯片ETF华夏		t	\N	\N	active	2026-04-21 17:06:25.604058	2026-04-29 14:28:04.646379
49	user-017524	017524	南方北证50成份指数发起C	股票型-标准指数	自选基金	北证50	南方基金管理股份有限公司	f	\N	2022-12-23	active	2026-04-29 15:50:30.178837	2026-04-29 16:41:17.880487
50	user-024239	024239	华夏全球科技先锋混合(QDII)C	QDII-混合	自选基金	华夏全球科技先锋混合(QDII)C	华夏基金管理有限公司	f	\N	2025-05-13	active	2026-04-29 15:50:46.332554	2026-04-29 16:43:26.215039
51	user-025500	025500	东方阿尔法科技智选混合发起C	混合型-偏股	自选基金	东方阿尔法科技智选混合发起C	东方阿尔法基金管理有限公司	f	\N	2025-09-12	active	2026-04-29 15:51:04.896204	2026-04-29 16:43:45.599194
47	user-026478	026478	招商中证有色金属矿业主题ETF发起式联接C	股票型-标准指数	自选基金	招商中证有色金属矿业主题ETF发起式联接C	招商基金管理有限公司	f	\N	2026-01-12	active	2026-04-29 15:49:52.837684	2026-04-29 16:44:02.641552
55	user-012922	012922	易方达全球成长精选混合（QDII）C（人民币）	QDII-混合	自选基金	易方达全球成长精选混合(QDII)人民币C	易方达基金管理有限公司	f	\N	2022-01-11	active	2026-04-29 15:52:17.121126	2026-04-29 16:40:07.057451
59	user-016371	016371	信澳业绩驱动混合C	混合型-偏股	自选基金	信澳业绩驱动混合C	信达澳亚基金管理有限公司	f	\N	2022-08-25	active	2026-04-29 15:53:30.82197	2026-04-29 16:40:25.537905
58	user-016702	016702	银华海外数字经济量化选股混合发起式(QDII)C	QDII-混合	自选基金	银华海外数字经济量化选股混合发起式(QDII)C	银华基金管理股份有限公司	f	\N	2023-03-15	active	2026-04-29 15:53:10.098131	2026-04-29 16:40:42.327358
53	user-017731	017731	嘉实全球产业升级股票发起式（QDII）C	QDII-股票	自选基金	嘉实全球产业升级	嘉实基金管理有限公司	f	\N	2023-02-09	active	2026-04-29 15:51:41.085226	2026-04-29 16:41:38.040858
52	user-018147	018147	建信新兴市场混合（QDII）C	QDII-混合	自选基金	建信新兴市场混合(QDII)C	建信基金管理有限责任公司	f	\N	2023-03-17	active	2026-04-29 15:51:22.553875	2026-04-29 16:41:55.502611
57	user-020640	020640	广发中证半导体材料设备ETF发起式联接C	股票型-标准指数	自选基金	广发半导体设备ETF联接C	广发基金管理有限公司	f	\N	2024-03-05	active	2026-04-29 15:52:53.649988	2026-04-29 16:42:12.241947
56	user-021662	021662	国富亚洲机会股票（QDII）C	QDII-股票	自选基金	国富亚洲机会股票(QDII)C	国海富兰克林基金管理有限公司	f	\N	2024-09-12	active	2026-04-29 15:52:34.130144	2026-04-29 16:42:31.339167
54	user-022328	022328	宏利高端装备股票C	股票型-普通	自选基金	宏利高端装备股票C	宏利基金管理有限公司	f	\N	2025-01-16	active	2026-04-29 15:51:57.068275	2026-04-29 16:42:49.081995
60	user-023408	023408	华宝创业板人工智能ETF发起式联接C	股票型-标准指数	自选基金	华宝创业板人工智能ETF发起式联接C	华宝基金管理有限公司	f	\N	2025-02-14	active	2026-04-29 15:53:53.185612	2026-04-29 16:43:10.648279
\.


--
-- Data for Name: fund_redemption_fee_ladder; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fund_redemption_fee_ladder (id, fund_id, trade_date, min_holding_days, max_holding_days, redemption_fee_rate, rule_text, is_free_threshold, priority_rank, source_name, source_batch_id, data_version, quality_status, created_at, updated_at) FROM stdin;
1	semiconductor-1	2026-04-22	0	6	1.5000	持有少于 7 天，赎回费 1.50%。	f	1	manual-drop	manual-20260422	manual-drop-v1	complete	2026-04-22 10:44:43.748498	2026-04-22 10:44:43.748498
2	semiconductor-1	2026-04-22	7	29	0.5000	持有不少于 7 天且少于 30 天，赎回费 0.50%。	f	2	manual-drop	manual-20260422	manual-drop-v1	complete	2026-04-22 10:44:43.748498	2026-04-22 10:44:43.748498
3	semiconductor-1	2026-04-22	30	\N	0.0000	持有不少于 30 天，免赎回费。	t	3	manual-drop	manual-20260422	manual-drop-v1	complete	2026-04-22 10:44:43.748498	2026-04-22 10:44:43.748498
\.


--
-- Data for Name: homepage_snapshot_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.homepage_snapshot_daily (id, trade_date, snapshot_key, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at) FROM stdin;
6	2026-04-21	homepage	{"industries": [{"tags": ["资金回流", "趋势强化"], "label": "趋势确认", "summary": "半导体处于趋势逐步清晰阶段，适合持续跟踪。", "fundCount": 12, "riskLevel": "中", "industryId": "semiconductor", "trendScore": 82, "focusReason": "趋势信号逐步增强，可继续观察后续资金与事件变化。", "methodology": {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}, "capitalScore": 88, "industryName": "半导体", "relatedFunds": [{"aum": 76.2, "tags": ["盘后快照", "ETF"], "theme": "半导体", "fundId": "f1", "feeRate": 0.5, "fundCode": "159995", "fundName": "国证芯片ETF", "fundType": "ETF", "return1m": 8.4, "return3m": 15.2, "return6m": 9.1, "volatility": 24.8, "fundCompany": "国证基金", "maxDrawdown": -12.6, "foundedYears": 5, "trackingTarget": "国证芯片指数", "tradableOnExchange": true}, {"aum": 18.9, "tags": ["盘后快照", "联接基金"], "theme": "半导体", "fundId": "f2", "feeRate": 0.6, "fundCode": "012345", "fundName": "半导体设备联接A", "fundType": "联接基金", "return1m": 6.7, "return3m": 13.6, "return6m": 7.5, "volatility": 21.4, "fundCompany": "远见基金", "maxDrawdown": -11.1, "foundedYears": 3, "trackingTarget": "半导体设备主题ETF联接", "tradableOnExchange": false}], "performance5d": 4.8, "performance20d": 11.6, "valuationScore": 71, "opportunityScore": 77}, {"tags": ["资金回流", "趋势强化", "拥挤度抬升"], "label": "高热观察", "summary": "AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。", "fundCount": 7, "riskLevel": "高", "industryId": "ai-infra", "trendScore": 89, "focusReason": "趋势很强但热度较高，更适合控制节奏地跟踪。", "methodology": {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}, "capitalScore": 91, "industryName": "AI 算力基础设施", "relatedFunds": [{"aum": 11.3, "tags": ["盘后快照", "主动基金"], "theme": "AI 算力基础设施", "fundId": "f4", "feeRate": 1.2, "fundCode": "018888", "fundName": "AI算力先锋混合", "fundType": "主动基金", "return1m": 9.6, "return3m": 18.7, "return6m": 12.4, "volatility": 29.2, "fundCompany": "前沿成长基金", "maxDrawdown": -15.4, "foundedYears": 2, "trackingTarget": "主动配置算力基础设施产业链", "tradableOnExchange": false}], "performance5d": 6.2, "performance20d": 14.4, "valuationScore": 58, "opportunityScore": 76}, {"tags": ["估值改善"], "label": "低位关注", "summary": "创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。", "fundCount": 9, "riskLevel": "中", "industryId": "innovative-medicine", "trendScore": 73, "focusReason": "估值位置更有吸引力，适合纳入中期观察清单。", "methodology": {"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}, "capitalScore": 75, "industryName": "创新药", "relatedFunds": [{"aum": 28.5, "tags": ["盘后快照", "ETF"], "theme": "创新药", "fundId": "f3", "feeRate": 0.45, "fundCode": "560880", "fundName": "创新药产业ETF", "fundType": "ETF", "return1m": 5.1, "return3m": 11.2, "return6m": 6.8, "volatility": 19.8, "fundCompany": "医疗创新基金", "maxDrawdown": -10.5, "foundedYears": 4, "trackingTarget": "创新药产业指数", "tradableOnExchange": true}], "performance5d": 2.4, "performance20d": 8.1, "valuationScore": 85, "opportunityScore": 73}], "marketOverview": {"summary": "当前展示基于盘后导入数据生成，适合用于下一交易日开盘前的行业与基金观察。", "lowPositionCount": 1, "strongTrendCount": 2}}	published	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
\.


--
-- Data for Name: industry_daily_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_daily_metrics (id, trade_date, industry_id, performance_5d, performance_20d, performance_60d, trend_score, capital_score, valuation_score, risk_score, risk_level, fund_count, source_batch_id, data_version, created_at, updated_at) FROM stdin;
4	2026-04-21	semiconductor	4.8000	11.6000	18.3000	82.00	88.00	71.00	63.00	中	12	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
5	2026-04-21	innovative-medicine	2.4000	8.1000	12.5000	73.00	75.00	85.00	56.00	中	9	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
6	2026-04-21	ai-infra	6.2000	14.4000	20.1000	89.00	91.00	58.00	82.00	高	7	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
10	2026-04-21	semiconductor	4.8000	11.6000	18.3000	82.00	88.00	71.00	63.00	中	12	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
11	2026-04-21	innovative-medicine	2.4000	8.1000	12.5000	73.00	75.00	85.00	56.00	中	9	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
12	2026-04-21	ai-infra	6.2000	14.4000	20.1000	89.00	91.00	58.00	82.00	高	7	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
\.


--
-- Data for Name: industry_detail_snapshot_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_detail_snapshot_daily (id, trade_date, industry_id, snapshot_payload, status, source_batch_id, data_version, created_at, updated_at) FROM stdin;
4	2026-04-21	semiconductor	{"headline": "趋势与产业催化共振，处于可重点跟踪区间。", "industryId": "semiconductor", "industryName": "半导体", "thesisSummary": "板块近期在算力链扩产、国产替代预期和资金回流三重驱动下走强，但仍需警惕短期交易拥挤导致的波动放大。", "timelineEvents": [{"date": "2026-04-08", "title": "设备龙头订单超预期", "summary": "提升市场对产能扩张兑现的预期。"}, {"date": "2026-04-19", "title": "ETF 资金净流入放大", "summary": "中短线资金重新回流半导体赛道。"}], "conclusionCards": [{"title": "当前判断", "value": "机会增强", "summary": "趋势与产业催化共振，处于可重点跟踪区间。"}, {"title": "趋势强度", "value": "82", "summary": "近 20 日持续跑赢宽基，均线结构向上。"}, {"title": "资金强度", "value": "88", "summary": "相关 ETF 连续多日净流入，成交活跃度抬升。"}, {"title": "估值性价比", "value": "71", "summary": "估值已离开底部区间，但仍低于阶段高位。"}, {"title": "拥挤度风险", "value": "63", "summary": "热点集中度抬升，适合分批观察而非盲目追高。"}], "opportunityLabel": "机会增强"}	published	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
5	2026-04-21	innovative-medicine	{"headline": "估值修复阶段具备观察价值，适合中期跟踪。", "industryId": "innovative-medicine", "industryName": "创新药", "thesisSummary": "板块受益于政策环境改善与创新成果释放，估值仍具备修复空间，但资金趋势尚未完全强化。", "timelineEvents": [{"date": "2026-04-17", "title": "重点公司海外授权进展", "summary": "增强创新药商业化预期。"}], "conclusionCards": [{"title": "当前判断", "value": "低位关注", "summary": "估值修复阶段具备观察价值，适合中期跟踪。"}, {"title": "趋势强度", "value": "73", "summary": "修复趋势已形成，但尚未进入强趋势区间。"}, {"title": "资金强度", "value": "75", "summary": "资金回流较温和，偏向中线资金布局。"}, {"title": "估值性价比", "value": "85", "summary": "行业估值处于更有吸引力的位置。"}, {"title": "拥挤度风险", "value": "56", "summary": "受政策与临床事件影响，个股层面波动仍大。"}], "opportunityLabel": "低位关注"}	published	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
6	2026-04-21	ai-infra	{"headline": "趋势最强，但短期风险同步抬升。", "industryId": "ai-infra", "industryName": "AI 算力基础设施", "thesisSummary": "板块在景气预期和资金共振下表现突出，但估值抬升与交易拥挤度已经成为主要约束。", "timelineEvents": [{"date": "2026-04-18", "title": "板块成交创阶段新高", "summary": "主题热度显著上升。"}], "conclusionCards": [{"title": "当前判断", "value": "高热观察", "summary": "趋势最强，但短期风险同步抬升。"}, {"title": "趋势强度", "value": "89", "summary": "短期趋势显著，占据市场主线。"}, {"title": "资金强度", "value": "91", "summary": "资金加速流入，成交金额显著放大。"}, {"title": "估值性价比", "value": "58", "summary": "估值已处于相对偏高区间。"}, {"title": "拥挤度风险", "value": "82", "summary": "高热主题交易拥挤，波动放大风险高。"}], "opportunityLabel": "高热观察"}	published	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
17	2026-04-21	ai-infra	{"headline": "AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。", "disclaimer": "当前页面基于盘后快照生成，仅用于信息整理与观察，不构成投资建议。", "industryId": "ai-infra", "chartSeries": [{"label": "趋势", "value": 89}, {"label": "资金", "value": 91}, {"label": "估值", "value": 58}, {"label": "机会", "value": 76}], "riskMetrics": [{"name": "拥挤度风险", "score": 82, "summary": "风险分越高，越需要注意短期波动。"}], "industryName": "AI 算力基础设施", "relatedFunds": [{"aum": 11.3, "tags": ["盘后快照", "主动基金"], "theme": "AI 算力基础设施", "fundId": "f4", "feeRate": 1.2, "fundCode": "018888", "fundName": "AI算力先锋混合", "fundType": "主动基金", "return1m": 9.6, "return3m": 18.7, "return6m": 12.4, "volatility": 29.2, "fundCompany": "前沿成长基金", "maxDrawdown": -15.4, "foundedYears": 2, "trackingTarget": "主动配置算力基础设施产业链", "tradableOnExchange": false}], "trendMetrics": [{"name": "趋势强度", "score": 89, "summary": "近阶段趋势评分较高。"}], "thesisSummary": "AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。", "capitalMetrics": [{"name": "资金强度", "score": 91, "summary": "盘后资金热度代理指标较强。"}], "timelineEvents": [{"date": "2026-04-18", "title": "板块成交创阶段新高", "summary": "主题热度显著上升"}], "conclusionCards": [{"title": "当前判断", "value": "高热观察", "summary": "AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。"}, {"title": "趋势强度", "value": "89", "summary": "趋势评分来自盘后日度指标。"}, {"title": "资金强度", "value": "91", "summary": "资金评分来自热度与活跃度代理指标。"}, {"title": "估值性价比", "value": "58", "summary": "估值评分用于判断相对吸引力。"}, {"title": "拥挤度风险", "value": "82", "summary": "风险分越高，越要控制观察节奏。"}], "opportunityLabel": "高热观察", "valuationMetrics": [{"name": "估值性价比", "score": 58, "summary": "估值位置用于衡量性价比。"}]}	published	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
16	2026-04-21	semiconductor	{"headline": "半导体处于趋势逐步清晰阶段，适合持续跟踪。", "disclaimer": "当前页面基于盘后快照生成，仅用于信息整理与观察，不构成投资建议。", "industryId": "semiconductor", "chartSeries": [{"label": "趋势", "value": 82}, {"label": "资金", "value": 88}, {"label": "估值", "value": 71}, {"label": "机会", "value": 77}], "riskMetrics": [{"name": "拥挤度风险", "score": 63, "summary": "风险分越高，越需要注意短期波动。"}], "industryName": "半导体", "relatedFunds": [{"aum": 76.2, "tags": ["盘后快照", "ETF"], "theme": "半导体", "fundId": "f1", "feeRate": 0.5, "fundCode": "159995", "fundName": "国证芯片ETF", "fundType": "ETF", "return1m": 8.4, "return3m": 15.2, "return6m": 9.1, "volatility": 24.8, "fundCompany": "国证基金", "maxDrawdown": -12.6, "foundedYears": 5, "trackingTarget": "国证芯片指数", "tradableOnExchange": true}, {"aum": 18.9, "tags": ["盘后快照", "联接基金"], "theme": "半导体", "fundId": "f2", "feeRate": 0.6, "fundCode": "012345", "fundName": "半导体设备联接A", "fundType": "联接基金", "return1m": 6.7, "return3m": 13.6, "return6m": 7.5, "volatility": 21.4, "fundCompany": "远见基金", "maxDrawdown": -11.1, "foundedYears": 3, "trackingTarget": "半导体设备主题ETF联接", "tradableOnExchange": false}], "trendMetrics": [{"name": "趋势强度", "score": 82, "summary": "近阶段趋势评分较高。"}], "thesisSummary": "半导体处于趋势逐步清晰阶段，适合持续跟踪。", "capitalMetrics": [{"name": "资金强度", "score": 88, "summary": "盘后资金热度代理指标较强。"}], "timelineEvents": [{"date": "2026-04-08", "title": "设备龙头订单超预期", "summary": "提升市场对产能扩张兑现的预期"}, {"date": "2026-04-19", "title": "ETF资金净流入放大", "summary": "中短线资金重新回流半导体赛道"}], "conclusionCards": [{"title": "当前判断", "value": "趋势确认", "summary": "半导体处于趋势逐步清晰阶段，适合持续跟踪。"}, {"title": "趋势强度", "value": "82", "summary": "趋势评分来自盘后日度指标。"}, {"title": "资金强度", "value": "88", "summary": "资金评分来自热度与活跃度代理指标。"}, {"title": "估值性价比", "value": "71", "summary": "估值评分用于判断相对吸引力。"}, {"title": "拥挤度风险", "value": "63", "summary": "风险分越高，越要控制观察节奏。"}], "opportunityLabel": "趋势确认", "valuationMetrics": [{"name": "估值性价比", "score": 71, "summary": "估值位置用于衡量性价比。"}]}	published	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
18	2026-04-21	innovative-medicine	{"headline": "创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。", "disclaimer": "当前页面基于盘后快照生成，仅用于信息整理与观察，不构成投资建议。", "industryId": "innovative-medicine", "chartSeries": [{"label": "趋势", "value": 73}, {"label": "资金", "value": 75}, {"label": "估值", "value": 85}, {"label": "机会", "value": 73}], "riskMetrics": [{"name": "拥挤度风险", "score": 56, "summary": "风险分越高，越需要注意短期波动。"}], "industryName": "创新药", "relatedFunds": [{"aum": 28.5, "tags": ["盘后快照", "ETF"], "theme": "创新药", "fundId": "f3", "feeRate": 0.45, "fundCode": "560880", "fundName": "创新药产业ETF", "fundType": "ETF", "return1m": 5.1, "return3m": 11.2, "return6m": 6.8, "volatility": 19.8, "fundCompany": "医疗创新基金", "maxDrawdown": -10.5, "foundedYears": 4, "trackingTarget": "创新药产业指数", "tradableOnExchange": true}], "trendMetrics": [{"name": "趋势强度", "score": 73, "summary": "近阶段趋势评分较高。"}], "thesisSummary": "创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。", "capitalMetrics": [{"name": "资金强度", "score": 75, "summary": "盘后资金热度代理指标较强。"}], "timelineEvents": [{"date": "2026-04-17", "title": "重点公司海外授权进展", "summary": "增强创新药商业化预期"}], "conclusionCards": [{"title": "当前判断", "value": "低位关注", "summary": "创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。"}, {"title": "趋势强度", "value": "73", "summary": "趋势评分来自盘后日度指标。"}, {"title": "资金强度", "value": "75", "summary": "资金评分来自热度与活跃度代理指标。"}, {"title": "估值性价比", "value": "85", "summary": "估值评分用于判断相对吸引力。"}, {"title": "拥挤度风险", "value": "56", "summary": "风险分越高，越要控制观察节奏。"}], "opportunityLabel": "低位关注", "valuationMetrics": [{"name": "估值性价比", "score": 85, "summary": "估值位置用于衡量性价比。"}]}	published	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
\.


--
-- Data for Name: industry_events_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_events_daily (id, trade_date, industry_id, event_date, event_title, event_summary, event_type, priority_rank, source_batch_id, data_version, created_at, updated_at) FROM stdin;
5	2026-04-21	semiconductor	2026-04-08	设备龙头订单超预期	提升市场对产能扩张兑现的预期。	event	1	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
6	2026-04-21	semiconductor	2026-04-19	ETF 资金净流入放大	中短线资金重新回流半导体赛道。	event	2	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
7	2026-04-21	innovative-medicine	2026-04-17	重点公司海外授权进展	增强创新药商业化预期。	event	3	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
8	2026-04-21	ai-infra	2026-04-18	板块成交创阶段新高	主题热度显著上升。	event	4	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
13	2026-04-21	semiconductor	2026-04-08	设备龙头订单超预期	提升市场对产能扩张兑现的预期	event	1	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
14	2026-04-21	semiconductor	2026-04-19	ETF资金净流入放大	中短线资金重新回流半导体赛道	event	2	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
15	2026-04-21	innovative-medicine	2026-04-17	重点公司海外授权进展	增强创新药商业化预期	event	1	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
16	2026-04-21	ai-infra	2026-04-18	板块成交创阶段新高	主题热度显著上升	event	1	2026-04-21_095307	manual-drop-v1	2026-04-22 09:53:07.880167	2026-04-22 09:53:07.880167
\.


--
-- Data for Name: industry_fund_mapping; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_fund_mapping (id, industry_id, fund_id, mapping_type, priority_rank, created_at, updated_at) FROM stdin;
1	semiconductor	f1	theme	1	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
2	semiconductor	f2	theme	2	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
3	innovative-medicine	f3	theme	1	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
4	ai-infra	f4	theme	1	2026-04-21 17:06:25.604058	2026-04-21 18:00:48.691621
13	semiconductor	semiconductor-1	theme	1	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
14	semiconductor	semiconductor-2	theme	2	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
15	semiconductor	semiconductor-3	theme	3	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
16	semiconductor	semiconductor-4	theme	4	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
17	semiconductor	semiconductor-5	theme	5	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
18	innovative-medicine	innovative-medicine-1	theme	1	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
19	innovative-medicine	innovative-medicine-2	theme	2	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
20	innovative-medicine	innovative-medicine-3	theme	3	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
21	innovative-medicine	innovative-medicine-4	theme	4	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
22	innovative-medicine	innovative-medicine-5	theme	5	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
23	ai-infra	ai-infra-1	theme	1	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
24	ai-infra	ai-infra-2	theme	2	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
25	ai-infra	ai-infra-3	theme	3	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
26	ai-infra	ai-infra-4	theme	4	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
27	ai-infra	ai-infra-5	theme	5	2026-04-22 09:55:00.833486	2026-04-22 09:55:00.833486
28	self-selected	user-017523	user-selected	0	2026-04-24 21:56:53.774111	2026-04-24 21:56:53.774111
35	self-selected	user-008281	user-selected	0	2026-04-29 14:22:44.649934	2026-04-29 14:22:44.649934
41	self-selected	user-008887	user-selected	0	2026-04-29 14:26:01.863975	2026-04-29 14:26:01.863975
42	self-selected	user-012552	user-selected	0	2026-04-29 14:26:15.895911	2026-04-29 14:26:15.895911
43	self-selected	user-012629	user-selected	0	2026-04-29 14:26:34.222261	2026-04-29 14:26:34.222261
44	self-selected	user-012837	user-selected	0	2026-04-29 14:26:47.727529	2026-04-29 14:26:47.727529
45	self-selected	user-159995	user-selected	0	2026-04-29 14:28:04.646379	2026-04-29 14:28:04.646379
55	self-selected	user-012922	user-selected	0	2026-04-29 15:52:17.121126	2026-04-29 16:40:07.057451
59	self-selected	user-016371	user-selected	0	2026-04-29 15:53:30.82197	2026-04-29 16:40:25.537905
58	self-selected	user-016702	user-selected	0	2026-04-29 15:53:10.098131	2026-04-29 16:40:42.327358
46	self-selected	user-016874	user-selected	0	2026-04-29 14:38:29.914802	2026-04-29 16:40:59.293469
49	self-selected	user-017524	user-selected	0	2026-04-29 15:50:30.178837	2026-04-29 16:41:17.880487
53	self-selected	user-017731	user-selected	0	2026-04-29 15:51:41.085226	2026-04-29 16:41:38.040858
52	self-selected	user-018147	user-selected	0	2026-04-29 15:51:22.553875	2026-04-29 16:41:55.502611
57	self-selected	user-020640	user-selected	0	2026-04-29 15:52:53.649988	2026-04-29 16:42:12.241947
56	self-selected	user-021662	user-selected	0	2026-04-29 15:52:34.130144	2026-04-29 16:42:31.339167
54	self-selected	user-022328	user-selected	0	2026-04-29 15:51:57.068275	2026-04-29 16:42:49.081995
60	self-selected	user-023408	user-selected	0	2026-04-29 15:53:53.185612	2026-04-29 16:43:10.648279
50	self-selected	user-024239	user-selected	0	2026-04-29 15:50:46.332554	2026-04-29 16:43:26.215039
51	self-selected	user-025500	user-selected	0	2026-04-29 15:51:04.896204	2026-04-29 16:43:45.599194
47	self-selected	user-026478	user-selected	0	2026-04-29 15:49:52.837684	2026-04-29 16:44:02.641552
\.


--
-- Data for Name: industry_master; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_master (id, industry_id, industry_name, display_name, sort_order, active_flag, risk_disclaimer_template, created_at, updated_at) FROM stdin;
1	semiconductor	半导体	半导体	0	t	\N	2026-04-21 17:06:25.604058	2026-04-22 21:00:48.176901
2	innovative-medicine	创新药	创新药	0	t	\N	2026-04-21 17:06:25.604058	2026-04-22 21:00:48.176901
3	ai-infra	AI算力基础设施	AI算力基础设施	0	t	\N	2026-04-21 17:06:25.604058	2026-04-22 21:00:48.176901
16	chemical	化工新材料	化工新材料	0	t	\N	2026-04-22 21:00:48.176901	2026-04-22 21:00:48.176901
17	gaming	游戏传媒	游戏传媒	0	t	\N	2026-04-22 21:00:48.176901	2026-04-22 21:00:48.176901
18	global-qdii	全球科技QDII	全球科技QDII	0	t	\N	2026-04-22 21:00:48.176901	2026-04-22 21:00:48.176901
19	self-selected	自选基金	自选基金	999	t	自选基金仅表示用户主动加入观察，不构成投资建议。	2026-04-24 21:56:53.774111	2026-04-29 16:44:02.641552
\.


--
-- Data for Name: industry_opportunity_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.industry_opportunity_daily (id, trade_date, industry_id, opportunity_score, trend_score, capital_score, valuation_score, risk_level, label, summary, tags_json, methodology_json, focus_reason, source_batch_id, data_version, created_at, updated_at) FROM stdin;
4	2026-04-21	semiconductor	86.00	82.00	88.00	71.00	中	机会增强	国产替代与算力链共振，板块出现趋势与事件的双重强化。	["产业催化", "资金回流", "高景气验证"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"}	趋势、资金与产业催化形成共振，适合作为当前重点跟踪方向。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
5	2026-04-21	innovative-medicine	79.00	73.00	75.00	85.00	中	低位关注	估值仍处历史中低位区间，适合中期观察与择机布局。	["低位修复", "估值改善", "政策友好"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"}	估值位置更有吸引力，适合结合中期观察逐步验证。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
6	2026-04-21	ai-infra	84.00	89.00	91.00	58.00	高	高热观察	市场热度高、成交活跃，但估值与拥挤度提示短期追高风险。	["强趋势", "高热度", "拥挤度抬升"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行样例展示，不构成投资建议。"}	热度较高，适合观察强趋势与风险提示之间的平衡。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
7	2026-04-21	ai-infra	76.00	89.00	91.00	58.00	高	高热观察	AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。	["资金回流", "趋势强化", "拥挤度抬升"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}	趋势很强但热度较高，更适合控制节奏地跟踪。	2026-04-21_180345	manual-drop-v1	2026-04-21 18:03:45.173265	2026-04-21 18:03:45.173265
8	2026-04-21	innovative-medicine	73.00	73.00	75.00	85.00	中	低位关注	创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。	["估值改善"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}	估值位置更有吸引力，适合纳入中期观察清单。	2026-04-21_180345	manual-drop-v1	2026-04-21 18:03:45.173265	2026-04-21 18:03:45.173265
9	2026-04-21	semiconductor	77.00	82.00	88.00	71.00	中	趋势确认	半导体处于趋势逐步清晰阶段，适合持续跟踪。	["资金回流", "趋势强化"]	{"title": "评分口径", "content": "综合趋势、资金、估值与风险因子进行盘后评分展示，不构成投资建议。"}	趋势信号逐步增强，可继续观察后续资金与事件变化。	2026-04-21_180345	manual-drop-v1	2026-04-21 18:03:45.173265	2026-04-21 18:03:45.173265
\.


--
-- Data for Name: job_run_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_run_log (id, job_name, batch_id, trade_date, run_status, started_at, ended_at, processed_count, error_message, log_path, created_at, updated_at) FROM stdin;
1	fund-metrics-ingestion	2026-04-21_180048	2026-04-21	success	2026-04-21 18:00:48.316295	2026-04-21 18:00:48.404339	4	\N	\N	2026-04-21 18:00:48.316295	2026-04-21 18:00:48.404339
3	industry-metrics-ingestion	2026-04-21_180048	2026-04-21	success	2026-04-21 18:00:48.419139	2026-04-21 18:00:48.508378	3	\N	\N	2026-04-21 18:00:48.419139	2026-04-21 18:00:48.508378
2	master-data-sync	2026-04-21_180048	2026-04-21	success	2026-04-21 18:00:48.415973	2026-04-21 18:00:48.727618	11	\N	\N	2026-04-21 18:00:48.415973	2026-04-21 18:00:48.727618
4	industry-events-ingestion	2026-04-21_180048	2026-04-21	success	2026-04-21 18:00:48.741698	2026-04-21 18:00:48.81269	4	\N	\N	2026-04-21 18:00:48.741698	2026-04-21 18:00:48.81269
5	standardize-and-load	2026-04-21_180106	2026-04-21	success	2026-04-21 18:01:06.410117	2026-04-21 18:01:06.486052	11	\N	\N	2026-04-21 18:01:06.410117	2026-04-21 18:01:06.486052
6	opportunity-score-daily	2026-04-21_180345	2026-04-21	success	2026-04-21 18:03:45.13758	2026-04-21 18:03:45.328414	3	\N	\N	2026-04-21 18:03:45.13758	2026-04-21 18:03:45.328414
8	page-snapshot-build	2026-04-21_180345	2026-04-21	failed	2026-04-21 18:03:45.281475	2026-04-21 18:03:45.370394	0	'fee_rate'	\N	2026-04-21 18:03:45.281475	2026-04-21 18:03:45.370394
9	snapshot-publish	2026-04-21_180345	2026-04-21	success	2026-04-21 18:03:45.296936	2026-04-21 18:03:45.374788	1	\N	\N	2026-04-21 18:03:45.296936	2026-04-21 18:03:45.374788
7	fund-compare-snapshot-daily	2026-04-21_180345	2026-04-21	success	2026-04-21 18:03:45.280616	2026-04-21 18:03:45.474719	4	\N	\N	2026-04-21 18:03:45.280616	2026-04-21 18:03:45.474719
10	page-snapshot-build	2026-04-21_180357	2026-04-21	failed	2026-04-21 18:03:57.592924	2026-04-21 18:03:57.678538	0	'fee_rate'	\N	2026-04-21 18:03:57.592924	2026-04-21 18:03:57.678538
11	page-snapshot-build	2026-04-21_180425	2026-04-21	failed	2026-04-21 18:04:25.465075	2026-04-21 18:04:25.554033	3	重复键违反唯一约束"homepage_snapshot_daily_snapshot_key_key"\nDETAIL:  键值"(snapshot_key)=(homepage)" 已经存在	\N	2026-04-21 18:04:25.465075	2026-04-21 18:04:25.554033
12	page-snapshot-build	2026-04-21_180438	2026-04-21	failed	2026-04-21 18:04:38.212895	2026-04-21 18:04:38.413847	3	重复键违反唯一约束"homepage_snapshot_daily_snapshot_key_key"\nDETAIL:  键值"(snapshot_key)=(homepage)" 已经存在	\N	2026-04-21 18:04:38.212895	2026-04-21 18:04:38.413847
13	page-snapshot-build	2026-04-21_180523	2026-04-21	success	2026-04-21 18:05:23.896579	2026-04-21 18:05:23.983034	6	\N	\N	2026-04-21 18:05:23.896579	2026-04-21 18:05:23.983034
14	snapshot-publish	2026-04-21_180555	2026-04-21	success	2026-04-21 18:05:55.72202	2026-04-21 18:05:55.798406	1	\N	\N	2026-04-21 18:05:55.72202	2026-04-21 18:05:55.798406
15	page-snapshot-build	2026-04-21_180626	2026-04-21	success	2026-04-21 18:06:26.362664	2026-04-21 18:06:26.552841	10	\N	\N	2026-04-21 18:06:26.362664	2026-04-21 18:06:26.552841
16	snapshot-publish	2026-04-21_180626	2026-04-21	success	2026-04-21 18:06:26.58805	2026-04-21 18:06:26.65832	1	\N	\N	2026-04-21 18:06:26.58805	2026-04-21 18:06:26.65832
17	akshare-master-fetch	2026-04-21_201739	2026-04-21	failed	2026-04-21 20:17:39.437416	2026-04-21 20:18:12.921477	0	AKShare request failed after retries: fund_individual_basic_info_xq:159995	\N	2026-04-21 20:17:39.437416	2026-04-21 20:18:12.921477
18	akshare-master-fetch	2026-04-21_212911	2026-04-21	success	2026-04-21 21:29:11.97452	2026-04-21 21:45:01.615237	15	\N	\N	2026-04-21 21:29:11.97452	2026-04-21 21:45:01.615237
19	akshare-master-fetch	2026-04-21_091913	2026-04-21	success	2026-04-22 09:19:13.362583	2026-04-22 09:22:00.251285	15	\N	\N	2026-04-22 09:19:13.362583	2026-04-22 09:22:00.251285
20	akshare-fund-daily-fetch	2026-04-21_092345	2026-04-21	failed	2026-04-22 09:23:45.183854	2026-04-22 09:25:08.378958	0	AKShare request failed after retries: fund_etf_hist_em:008281	\N	2026-04-22 09:23:45.183854	2026-04-22 09:25:08.378958
21	akshare-fund-daily-fetch	2026-04-21_092604	2026-04-21	running	2026-04-22 09:26:04.31034	\N	\N	\N	\N	2026-04-22 09:26:04.31034	2026-04-22 09:26:04.31034
22	akshare-fund-daily-fetch	2026-04-21_093734	2026-04-21	running	2026-04-22 09:37:34.322079	\N	\N	\N	\N	2026-04-22 09:37:34.322079	2026-04-22 09:37:34.322079
23	akshare-fund-daily-fetch	2026-04-21_094934	2026-04-21	success	2026-04-22 09:49:34.306413	2026-04-22 09:52:46.290213	15	\N	\N	2026-04-22 09:49:34.306413	2026-04-22 09:52:46.290213
24	master-data-sync	2026-04-21_095306	2026-04-21	failed	2026-04-22 09:53:06.128638	2026-04-22 09:53:06.330783	0	无效的类型 numeric 输入语法: ""\nCONTEXT:  unnamed portal parameter $9 = ''	\N	2026-04-22 09:53:06.128638	2026-04-22 09:53:06.330783
25	fund-metrics-ingestion	2026-04-21_095306	2026-04-21	success	2026-04-22 09:53:07.009153	2026-04-22 09:53:07.099616	15	\N	\N	2026-04-22 09:53:07.009153	2026-04-22 09:53:07.099616
26	standardize-and-load	2026-04-21_095307	2026-04-21	success	2026-04-22 09:53:07.837253	2026-04-22 09:53:07.939172	22	\N	\N	2026-04-22 09:53:07.837253	2026-04-22 09:53:07.939172
27	fund-compare-snapshot-daily	2026-04-21_095308	2026-04-21	skipped	2026-04-22 09:53:08.558704	2026-04-22 09:53:08.778419	0	\N	\N	2026-04-22 09:53:08.558704	2026-04-22 09:53:08.778419
28	akshare-master-fetch	2026-04-21_095403	2026-04-21	success	2026-04-22 09:54:04.11892	2026-04-22 09:54:59.830656	15	\N	\N	2026-04-22 09:54:04.11892	2026-04-22 09:54:59.830656
29	master-data-sync	2026-04-21_095500	2026-04-21	success	2026-04-22 09:55:00.529676	2026-04-22 09:55:00.980391	33	\N	\N	2026-04-22 09:55:00.529676	2026-04-22 09:55:00.980391
30	fund-compare-snapshot-daily	2026-04-21_095501	2026-04-21	success	2026-04-22 09:55:01.567442	2026-04-22 09:55:01.654617	15	\N	\N	2026-04-22 09:55:01.567442	2026-04-22 09:55:01.654617
31	fund-fee-rule-ingestion	2026-04-22_103623	2026-04-22	failed	2026-04-22 10:36:23.093774	2026-04-22 10:36:23.126526	0	[WinError 5] 拒绝访问。: 'E:\\\\game\\\\runtime\\\\data-archive\\\\raw\\\\2026-04-22'	\N	2026-04-22 10:36:23.093774	2026-04-22 10:36:23.126526
32	fund-fee-rule-ingestion	2026-04-22_103648	2026-04-22	failed	2026-04-22 10:36:48.471492	2026-04-22 10:36:48.50546	0	[Errno 13] Permission denied: 'E:\\\\game\\\\runtime\\\\data-archive\\\\raw\\\\2026-04-22\\\\master\\\\fund_fee_rule.csv'	\N	2026-04-22 10:36:48.471492	2026-04-22 10:36:48.50546
33	fund-holding-cost-snapshot-daily	2026-04-22_103648	2026-04-22	skipped	2026-04-22 10:36:48.586783	2026-04-22 10:36:48.66171	0	\N	\N	2026-04-22 10:36:48.586783	2026-04-22 10:36:48.66171
34	fund-fee-rule-ingestion	2026-04-22_103721	2026-04-22	failed	2026-04-22 10:37:21.848808	2026-04-22 10:37:21.883407	0	[Errno 13] Permission denied: 'E:\\\\game\\\\runtime\\\\data-archive\\\\raw\\\\2026-04-22\\\\master\\\\fund_fee_rule.csv'	\N	2026-04-22 10:37:21.848808	2026-04-22 10:37:21.883407
35	fund-holding-cost-snapshot-daily	2026-04-22_103721	2026-04-22	skipped	2026-04-22 10:37:21.93277	2026-04-22 10:37:22.005605	0	\N	\N	2026-04-22 10:37:21.93277	2026-04-22 10:37:22.005605
37	fund-fee-rule-ingestion	2026-04-22_103737	2026-04-22	failed	2026-04-22 10:37:37.365006	2026-04-22 10:37:37.407897	0	[Errno 13] Permission denied: 'E:\\\\game\\\\runtime\\\\data-archive\\\\raw\\\\2026-04-22\\\\master\\\\fund_fee_rule.csv'	\N	2026-04-22 10:37:37.365006	2026-04-22 10:37:37.407897
36	fund-holding-cost-snapshot-daily	2026-04-22_103737	2026-04-22	skipped	2026-04-22 10:37:37.243731	2026-04-22 10:37:37.431812	0	\N	\N	2026-04-22 10:37:37.243731	2026-04-22 10:37:37.431812
38	fund-fee-rule-ingestion	2026-04-22_104443	2026-04-22	success	2026-04-22 10:44:43.511611	2026-04-22 10:44:43.789716	4	\N	\N	2026-04-22 10:44:43.511611	2026-04-22 10:44:43.789716
39	fund-holding-cost-snapshot-daily	2026-04-22_104456	2026-04-22	success	2026-04-22 10:44:56.277993	2026-04-22 10:44:56.589793	6	\N	\N	2026-04-22 10:44:56.277993	2026-04-22 10:44:56.589793
40	master-data-sync	2026-04-22_205754	2026-04-22	failed	2026-04-22 20:57:54.536222	2026-04-22 20:57:54.614336	0	[Errno 13] Permission denied: 'E:\\\\game\\\\runtime\\\\data-archive\\\\raw\\\\2026-04-22\\\\master\\\\industry_master.csv'	\N	2026-04-22 20:57:54.536222	2026-04-22 20:57:54.614336
41	master-data-sync	2026-04-22_210047	2026-04-22	success	2026-04-22 21:00:47.886753	2026-04-22 21:00:48.224373	6	\N	\N	2026-04-22 21:00:47.886753	2026-04-22 21:00:48.224373
42	portfolio_decision_snapshot_daily	2026-04-29_104022	2026-04-29	success	2026-04-29 10:40:22.532789	2026-04-29 10:40:22.754741	0	\N	\N	2026-04-29 10:40:22.532789	2026-04-29 10:40:22.754741
43	portfolio_decision_snapshot_daily	2026-04-29_155550	2026-04-29	success	2026-04-29 15:55:50.397995	2026-04-29 15:55:50.686745	14	\N	\N	2026-04-29 15:55:50.397995	2026-04-29 15:55:50.686745
44	portfolio_decision_snapshot_daily	2026-04-29_155626	2026-04-29	success	2026-04-29 15:56:26.143394	2026-04-29 15:56:26.599581	14	\N	\N	2026-04-29 15:56:26.143394	2026-04-29 15:56:26.599581
45	portfolio_decision_snapshot_daily	2026-04-29_165051	2026-04-29	success	2026-04-29 16:50:51.446396	2026-04-29 16:50:51.61931	14	\N	\N	2026-04-29 16:50:51.446396	2026-04-29 16:50:51.61931
\.


--
-- Data for Name: portfolio_candidate_fund; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_candidate_fund (id, candidate_id, user_id, trade_date, fund_id, fund_code, fund_name, source_type, reason, metrics_json, data_quality, risk_disclaimer, created_at, updated_at) FROM stdin;
41	local-demo-2026-04-29-user-008281-same-theme	local-demo	2026-04-29	user-008281	008281	国泰CES半导体芯片行业ETF联接A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 14.01, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": -1.0226, "return3m": 1.5741, "volatility": 32.3803, "maxDrawdown": -19.7672}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
42	local-demo-2026-04-29-user-008887-same-theme	local-demo	2026-04-29	user-008887	008887	华夏国证半导体芯片ETF联接A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 34.56, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": -1.042, "return3m": 0.0174, "volatility": 33.217, "maxDrawdown": -20.8505}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
43	local-demo-2026-04-29-user-012552-same-theme	local-demo	2026-04-29	user-012552	012552	天弘中证芯片指数A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 2.49, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": -1.241, "return3m": 1.8813, "volatility": 32.7448, "maxDrawdown": -19.8169}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
44	local-demo-2026-04-29-user-012629-same-theme	local-demo	2026-04-29	user-012629	012629	广发国证半导体芯片ETF联接A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 6.41, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": -1.0309, "return3m": 0.0085, "volatility": 33.0971, "maxDrawdown": -20.7923}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
45	local-demo-2026-04-29-user-012837-same-theme	local-demo	2026-04-29	user-012837	012837	华安CES半导体芯片行业指数发起A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 1.25, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": -1.0304, "return3m": 1.2095, "volatility": 32.2495, "maxDrawdown": -19.898}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
46	local-demo-2026-04-29-user-017523-same-theme	local-demo	2026-04-29	user-017523	017523	南方北证50成份指数发起A	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": 0.8986, "theme": "自选基金", "fundType": "股票型-标准指数", "return1d": null, "return3m": -13.0229, "volatility": 27.4626, "maxDrawdown": -23.7417}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
47	local-demo-2026-04-29-user-159995-same-theme	local-demo	2026-04-29	user-159995	159995	芯片ETF华夏	same_theme_observation	同属 自选基金 主题，可作为对照观察基金；用于比较费率、回撤、波动和规模，不代表买入建议。	{"aum": null, "theme": "自选基金", "fundType": "指数型-股票", "return1d": -1.08, "return3m": null, "volatility": null, "maxDrawdown": null}	snapshot	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
\.


--
-- Data for Name: portfolio_decision_tip; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_decision_tip (id, tip_id, user_id, trade_date, tip_type, severity, title, summary, evidence_json, data_quality, risk_disclaimer, created_at, updated_at) FROM stdin;
21	local-demo-2026-04-29-tip-1	local-demo	2026-04-29	theme_concentration	high	主题集中度偏高，适合先做压力观察	自选基金 占组合约 100.0%，后续可重点观察该主题回撤、估值和拥挤度，不宜只因短期上涨继续加重集中度。	{"ratio": 100.0, "theme": "自选基金", "marketValue": 600855.85}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
22	local-demo-2026-04-29-tip-2	local-demo	2026-04-29	long_hold_overseas	low	美股/QDII 长期仓位可偏耐心复盘	华夏全球科技先锋混合(QDII)C、建信新兴市场混合(QDII)C、嘉实全球产业升级股票发起式(QDII)C 中期趋势仍强，若你的目标是长期持有，可重点观察趋势是否变坏、汇率和估值，而不是因单日波动频繁调整。	{"items": [{"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "024239", "fundName": "华夏全球科技先锋混合(QDII)C", "return1d": -1.1519, "return1m": 34.1201, "return3m": 27.8104, "trendLabel": "中期趋势仍强", "volatility": 29.2564, "marketValue": 15141.28, "maxDrawdown": -13.5542, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "018147", "fundName": "建信新兴市场混合(QDII)C", "return1d": 1.5779, "return1m": 30.9599, "return3m": 27.3964, "trendLabel": "中期趋势仍强", "volatility": 27.8561, "marketValue": 180897.82, "maxDrawdown": -11.2803, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "017731", "fundName": "嘉实全球产业升级股票发起式(QDII)C", "return1d": 0.9083, "return1m": 33.6609, "return3m": 21.6035, "trendLabel": "中期趋势仍强", "volatility": 25.362, "marketValue": 59319.08, "maxDrawdown": -11.9292, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "012922", "fundName": "易方达全球成长精选混合(QDII)人民币C", "return1d": 0.1291, "return1m": 30.0324, "return3m": 28.9995, "trendLabel": "中期趋势仍强", "volatility": 26.1729, "marketValue": 42629.07, "maxDrawdown": -8.8454, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "021662", "fundName": "国富亚洲机会股票(QDII)C", "return1d": 1.3523, "return1m": 30.2808, "return3m": 23.7639, "trendLabel": "中期趋势仍强", "volatility": 24.824, "marketValue": 41772.45, "maxDrawdown": -14.0518, "positionRatio": null}]}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
23	local-demo-2026-04-29-tip-3	local-demo	2026-04-29	high_beta_control	high	半导体/CPO/AI 等高波动主题适合控仓复盘	南方北证50成份指数发起C、广发半导体设备ETF联接C、招商中证有色金属矿业主题ETF联接C 属于高波动主题且出现转弱、回撤或波动压力；如果本来只是弹性仓位，可考虑设置减仓或控仓阈值，而不是按长期底仓处理。	{"items": [{"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "017524", "fundName": "南方北证50成份指数发起C", "return1d": -2.512, "return1m": 4.7787, "return3m": -13.0432, "trendLabel": "趋势转弱观察", "volatility": 27.2725, "marketValue": 20125.76, "maxDrawdown": -23.8678, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题暂不强势，适合小仓观察或等待趋势重新确认。", "fundCode": "020640", "fundName": "广发半导体设备ETF联接C", "return1d": -0.0444, "return1m": 14.3649, "return3m": 5.8926, "trendLabel": "波动偏高", "volatility": 34.3072, "marketValue": 40696.7, "maxDrawdown": -18.6955, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "026478", "fundName": "招商中证有色金属矿业主题ETF联接C", "return1d": -2.4139, "return1m": 1.5848, "return3m": -15.234, "trendLabel": "趋势转弱观察", "volatility": 39.7628, "marketValue": 21781.36, "maxDrawdown": -24.8717, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "023408", "fundName": "华宝创业板人工智能ETF发起式联接C", "return1d": -2.3365, "return1m": 14.6539, "return3m": 8.5485, "trendLabel": "趋势转弱观察", "volatility": 40.0624, "marketValue": 31311.13, "maxDrawdown": -13.6395, "positionRatio": null}]}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
24	local-demo-2026-04-29-tip-4	local-demo	2026-04-29	qdii_exposure	medium	QDII/海外暴露较高，注意净值延迟和汇率因素	QDII 或海外相关持仓占比约 62.43%，盘后净值可能滞后，单日收益解释需要结合海外市场和汇率。	{"qdiiRatio": 62.43}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
25	local-demo-2026-04-29-tip-5	local-demo	2026-04-29	single_position	medium	单只基金占比较高，适合设置复盘阈值	建信新兴市场混合(QDII)C 占组合约 30.11%，建议后续围绕回撤、主题暴露和费率规则做观察，不输出直接买卖指令。	{"ratio": 30.11, "fundCode": "018147", "fundName": "建信新兴市场混合(QDII)C"}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
26	local-demo-2026-04-29-tip-6	local-demo	2026-04-29	drawdown_watch	medium	部分基金历史回撤偏深，适合纳入风险复盘	南方北证50成份指数发起C、东方阿尔法科技智选混合发起C、招商中证有色金属矿业主题ETF联接C 的历史最大回撤偏深，适合结合个人风险承受能力和持有周期复核。	{"items": [{"fundCode": "017524", "maxDrawdown": -23.8678}, {"fundCode": "025500", "maxDrawdown": -23.318}, {"fundCode": "026478", "maxDrawdown": -24.8717}]}	computed	本提示仅用于持仓复盘和候选观察，不构成买入、卖出或收益承诺；请结合自身风险承受能力和基金公告复核。	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
\.


--
-- Data for Name: portfolio_diagnosis_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_diagnosis_snapshot (id, diagnosis_id, user_id, trade_date, diagnosis_json, created_at, updated_at) FROM stdin;
1	local-demo-2026-04-29-diagnosis	local-demo	2026-04-29	{"qdiiRatio": 62.43, "dataQuality": {"partialCount": 0, "enhancedCount": 14, "enhancedRatio": 100.0, "snapshotOnlyCount": 0}, "themeExposure": [{"ratio": 100.0, "theme": "自选基金", "marketValue": 600855.85}], "highBetaReview": [{"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "017524", "fundName": "南方北证50成份指数发起C", "return1d": -2.512, "return1m": 4.7787, "return3m": -13.0432, "trendLabel": "趋势转弱观察", "volatility": 27.2725, "marketValue": 20125.76, "maxDrawdown": -23.8678, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题暂不强势，适合小仓观察或等待趋势重新确认。", "fundCode": "022328", "fundName": "宏利高端装备股票C", "return1d": 1.1394, "return1m": 5.0049, "return3m": 1.9256, "trendLabel": "继续观察", "volatility": 21.1648, "marketValue": 44848.2, "maxDrawdown": -11.0297, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题暂不强势，适合小仓观察或等待趋势重新确认。", "fundCode": "020640", "fundName": "广发半导体设备ETF联接C", "return1d": -0.0444, "return1m": 14.3649, "return3m": 5.8926, "trendLabel": "波动偏高", "volatility": 34.3072, "marketValue": 40696.7, "maxDrawdown": -18.6955, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "026478", "fundName": "招商中证有色金属矿业主题ETF联接C", "return1d": -2.4139, "return1m": 1.5848, "return3m": -15.234, "trendLabel": "趋势转弱观察", "volatility": 39.7628, "marketValue": 21781.36, "maxDrawdown": -24.8717, "positionRatio": null}, {"theme": "自选基金", "action": "高波动主题已出现转弱信号，适合设置减仓/控仓观察阈值，避免越跌越集中。", "fundCode": "023408", "fundName": "华宝创业板人工智能ETF发起式联接C", "return1d": -2.3365, "return1m": 14.6539, "return3m": 8.5485, "trendLabel": "趋势转弱观察", "volatility": 40.0624, "marketValue": 31311.13, "maxDrawdown": -13.6395, "positionRatio": null}], "longHoldReview": [{"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "024239", "fundName": "华夏全球科技先锋混合(QDII)C", "return1d": -1.1519, "return1m": 34.1201, "return3m": 27.8104, "trendLabel": "中期趋势仍强", "volatility": 29.2564, "marketValue": 15141.28, "maxDrawdown": -13.5542, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "018147", "fundName": "建信新兴市场混合(QDII)C", "return1d": 1.5779, "return1m": 30.9599, "return3m": 27.3964, "trendLabel": "中期趋势仍强", "volatility": 27.8561, "marketValue": 180897.82, "maxDrawdown": -11.2803, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "017731", "fundName": "嘉实全球产业升级股票发起式(QDII)C", "return1d": 0.9083, "return1m": 33.6609, "return3m": 21.6035, "trendLabel": "中期趋势仍强", "volatility": 25.362, "marketValue": 59319.08, "maxDrawdown": -11.9292, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "012922", "fundName": "易方达全球成长精选混合(QDII)人民币C", "return1d": 0.1291, "return1m": 30.0324, "return3m": 28.9995, "trendLabel": "中期趋势仍强", "volatility": 26.1729, "marketValue": 42629.07, "maxDrawdown": -8.8454, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产趋势仍在，可继续长持观察；不因单日波动轻易改变长期仓位。", "fundCode": "021662", "fundName": "国富亚洲机会股票(QDII)C", "return1d": 1.3523, "return1m": 30.2808, "return3m": 23.7639, "trendLabel": "中期趋势仍强", "volatility": 24.824, "marketValue": 41772.45, "maxDrawdown": -14.0518, "positionRatio": null}, {"theme": "自选基金", "action": "长期资产适合按月复盘，不用被单日涨跌牵着走；重点看中期趋势和基金风格是否漂移。", "fundCode": "016702", "fundName": "银华海外数字经济量化选股混合发起式(QDII)C", "return1d": 0.1008, "return1m": 25.5537, "return3m": 6.1878, "trendLabel": "回撤压力偏高", "volatility": 21.0018, "marketValue": 35380.66, "maxDrawdown": -18.2036, "positionRatio": null}], "trendWatchList": [{"theme": "自选基金", "action": "趋势转弱时先复盘原因：是主题短期回撤、基金风格问题，还是持仓行业基本面变坏；再决定是否降低仓位。", "fundCode": "017524", "fundName": "南方北证50成份指数发起C", "return1d": -2.512, "return1m": 4.7787, "return3m": -13.0432, "trendLabel": "趋势转弱观察", "volatility": 27.2725, "marketValue": 20125.76, "maxDrawdown": -23.8678, "positionRatio": null}, {"theme": "自选基金", "action": "趋势转弱时先复盘原因：是主题短期回撤、基金风格问题，还是持仓行业基本面变坏；再决定是否降低仓位。", "fundCode": "026478", "fundName": "招商中证有色金属矿业主题ETF联接C", "return1d": -2.4139, "return1m": 1.5848, "return3m": -15.234, "trendLabel": "趋势转弱观察", "volatility": 39.7628, "marketValue": 21781.36, "maxDrawdown": -24.8717, "positionRatio": null}, {"theme": "自选基金", "action": "趋势转弱时先复盘原因：是主题短期回撤、基金风格问题，还是持仓行业基本面变坏；再决定是否降低仓位。", "fundCode": "023408", "fundName": "华宝创业板人工智能ETF发起式联接C", "return1d": -2.3365, "return1m": 14.6539, "return3m": 8.5485, "trendLabel": "趋势转弱观察", "volatility": 40.0624, "marketValue": 31311.13, "maxDrawdown": -13.6395, "positionRatio": null}], "largestPosition": {"ratio": 30.11, "fundCode": "018147", "fundName": "建信新兴市场混合(QDII)C"}, "fundTypeExposure": [{"ratio": 45.61, "fundType": "QDII-混合", "marketValue": 274048.83}, {"ratio": 18.96, "fundType": "股票型-标准指数", "marketValue": 113914.95}, {"ratio": 16.82, "fundType": "QDII-股票", "marketValue": 101091.53}, {"ratio": 11.14, "fundType": "混合型-偏股", "marketValue": 66952.34}, {"ratio": 7.46, "fundType": "股票型-普通", "marketValue": 44848.2}]}	2026-04-29 10:40:22.610276	2026-04-29 16:50:51.570291
\.


--
-- Data for Name: portfolio_position_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_position_snapshot (id, snapshot_id, user_id, position_id, fund_code, fund_name, source, market_value_snapshot, day_profit_snapshot, holding_profit_snapshot, holding_return_snapshot, units, cost_nav, data_status, data_date, created_at, updated_at) FROM stdin;
100	local-demo-code-016874	local-demo	code-016874	016874	广发远见智选混合C	alipay_screenshot	20335.7500	\N	783.7500	5.3900	\N	\N	matched	\N	2026-04-29 15:48:54.024921	2026-04-29 16:50:20.534988
157	local-demo-code-017524	local-demo	code-017524	017524	南方北证50成份指数发起C	alipay_screenshot	20125.7600	\N	-428.2400	-2.0800	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
158	local-demo-code-024239	local-demo	code-024239	024239	华夏全球科技先锋混合(QDII)C	alipay_screenshot	15141.2800	\N	141.2800	2.8300	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
159	local-demo-code-025500	local-demo	code-025500	025500	东方阿尔法科技智选混合发起C	alipay_screenshot	14832.6100	\N	569.7800	3.9900	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
160	local-demo-code-018147	local-demo	code-018147	018147	建信新兴市场混合(QDII)C	alipay_screenshot	180897.8200	\N	41820.1600	30.8800	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
105	local-demo-code-017731	local-demo	code-017731	017731	嘉实全球产业升级股票发起式(QDII)C	alipay_screenshot	59319.0800	\N	17143.6500	40.8400	\N	\N	matched	\N	2026-04-29 15:48:54.024921	2026-04-29 16:50:20.534988
162	local-demo-code-022328	local-demo	code-022328	022328	宏利高端装备股票C	alipay_screenshot	44848.2000	\N	46.7500	0.1000	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
163	local-demo-code-012922	local-demo	code-012922	012922	易方达全球成长精选混合(QDII)人民币C	alipay_screenshot	42629.0700	\N	11965.8800	39.1500	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
164	local-demo-code-021662	local-demo	code-021662	021662	国富亚洲机会股票(QDII)C	alipay_screenshot	41772.4500	\N	5883.9700	16.4000	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
165	local-demo-code-020640	local-demo	code-020640	020640	广发半导体设备ETF联接C	alipay_screenshot	40696.7000	\N	1520.0300	3.8800	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
167	local-demo-code-016371	local-demo	code-016371	016371	信澳业绩驱动混合C	alipay_screenshot	31783.9800	\N	4788.6300	21.7700	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
155	local-demo-code-026478	local-demo	code-026478	026478	招商中证有色金属矿业主题ETF联接C	alipay_screenshot	21781.3600	\N	-1322.6400	-5.7200	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
166	local-demo-code-016702	local-demo	code-016702	016702	银华海外数字经济量化选股混合发起式(QDII)C	alipay_screenshot	35380.6600	\N	3797.9700	12.7900	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
168	local-demo-code-023408	local-demo	code-023408	023408	华宝创业板人工智能ETF发起式联接C	alipay_screenshot	31311.1300	\N	-354.8700	-1.3300	\N	\N	matched	\N	2026-04-29 16:30:51.865859	2026-04-29 16:50:20.534988
\.


--
-- Data for Name: portfolio_position_valuation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_position_valuation (id, user_id, trade_date, position_id, fund_code, fund_name, theme, fund_type, latest_nav, previous_nav, return_1d, market_value, cost_value, day_profit, holding_profit, holding_return, data_mode, data_quality, created_at, updated_at) FROM stdin;
71	local-demo	2026-04-29	code-016874	016874	广发远见智选混合C	自选基金	混合型-偏股	1.864400	1.882100	-0.9404	20335.7500	19552.0000	-193.0529	783.7500	5.3900	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
72	local-demo	2026-04-29	code-017524	017524	南方北证50成份指数发起C	自选基金	股票型-标准指数	1.214700	1.246000	-2.5120	20125.7600	20554.0000	-518.5860	-428.2400	-2.0800	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
73	local-demo	2026-04-29	code-024239	024239	华夏全球科技先锋混合(QDII)C	自选基金	QDII-混合	2.977600	3.012300	-1.1519	15141.2800	15000.0000	-176.4449	141.2800	2.8300	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
74	local-demo	2026-04-29	code-025500	025500	东方阿尔法科技智选混合发起C	自选基金	混合型-偏股	1.433600	1.440000	-0.4444	14832.6100	14262.8300	-66.2104	569.7800	3.9900	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
75	local-demo	2026-04-29	code-018147	018147	建信新兴市场混合(QDII)C	自选基金	QDII-混合	2.060000	2.028000	1.5779	180897.8200	139077.6600	2810.0470	41820.1600	30.8800	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
76	local-demo	2026-04-29	code-017731	017731	嘉实全球产业升级股票发起式(QDII)C	自选基金	QDII-股票	3.455000	3.423900	0.9083	59319.0800	42175.4300	533.9454	17143.6500	40.8400	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
77	local-demo	2026-04-29	code-022328	022328	宏利高端装备股票C	自选基金	股票型-普通	1.730900	1.711400	1.1394	44848.2000	44801.4500	505.2436	46.7500	0.1000	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
78	local-demo	2026-04-29	code-012922	012922	易方达全球成长精选混合(QDII)人民币C	自选基金	QDII-混合	3.491500	3.487000	0.1291	42629.0700	30663.1900	54.9632	11965.8800	39.1500	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
79	local-demo	2026-04-29	code-021662	021662	国富亚洲机会股票(QDII)C	自选基金	QDII-股票	2.570700	2.536400	1.3523	41772.4500	35888.4800	557.3518	5883.9700	16.4000	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
80	local-demo	2026-04-29	code-020640	020640	广发半导体设备ETF联接C	自选基金	股票型-标准指数	2.249900	2.250900	-0.0444	40696.7000	39176.6700	-18.0774	1520.0300	3.8800	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
81	local-demo	2026-04-29	code-016371	016371	信澳业绩驱动混合C	自选基金	混合型-偏股	2.502600	2.549900	-1.8550	31783.9800	26995.3500	-600.7365	4788.6300	21.7700	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
82	local-demo	2026-04-29	code-026478	026478	招商中证有色金属矿业主题ETF联接C	自选基金	股票型-标准指数	0.974300	0.998400	-2.4139	21781.3600	23104.0000	-538.7860	-1322.6400	-5.7200	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
83	local-demo	2026-04-29	code-016702	016702	银华海外数字经济量化选股混合发起式(QDII)C	自选基金	QDII-混合	1.887700	1.885800	0.1008	35380.6600	31582.6900	35.6278	3797.9700	12.7900	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
84	local-demo	2026-04-29	code-023408	023408	华宝创业板人工智能ETF发起式联接C	自选基金	股票型-标准指数	2.148500	2.199900	-2.3365	31311.1300	31666.0000	-749.0870	-354.8700	-1.3300	snapshot_nav	enhanced	2026-04-29 16:50:51.570291	2026-04-29 16:50:51.570291
\.


--
-- Data for Name: portfolio_valuation_snapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.portfolio_valuation_snapshot (id, valuation_id, user_id, trade_date, total_market_value, total_cost_value, total_day_profit, total_holding_profit, holding_count, enhanced_count, summary_json, quality_json, created_at, updated_at) FROM stdin;
1	local-demo-2026-04-29	local-demo	2026-04-29	600855.8500	514499.7500	1636.1977	86356.1000	14	14	{"method": "snapshot_or_nav_enhanced"}	{"partialCount": 0, "enhancedCount": 14, "enhancedRatio": 100.0, "snapshotOnlyCount": 0}	2026-04-29 10:40:22.610276	2026-04-29 16:50:51.570291
\.


--
-- Data for Name: source_ingestion_audit; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.source_ingestion_audit (id, source_name, batch_id, trade_date, file_path, row_count, checksum, ingestion_status, message, created_at, updated_at) FROM stdin;
1	fund-daily-metrics	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\daily\\fund_daily_metrics.csv	4	aae82f7b0319700065d835cec9cedc625c0706e554d4cbf4142dd09fc32a600d	archived	Source file copied to raw archive.	2026-04-21 18:00:48.362722	2026-04-21 18:00:48.362722
2	fund-master	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\fund_master.csv	4	295f51caedd541bf60e7168e9676888a79a51c39f9ac13b760d05f836cd92a0d	archived	Source file copied to raw archive.	2026-04-21 18:00:48.463909	2026-04-21 18:00:48.463909
3	industry-daily-metrics	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\daily\\industry_daily_metrics.csv	3	04751290e3940e0c7fd526cef809716300b413f27f27678bdd6d2e2fe2fd8a41	archived	Source file copied to raw archive.	2026-04-21 18:00:48.466208	2026-04-21 18:00:48.466208
4	industry-master	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_master.csv	3	fe75e38a38be7bc0fe1c1b81a3ac55331fe447d7f37282f7c8fc58d43bcbc757	archived	Source file copied to raw archive.	2026-04-21 18:00:48.510292	2026-04-21 18:00:48.510292
5	industry-fund-mapping	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_fund_mapping.csv	4	2e539e319551000a42cffeca897224369e3532893e30a4ec46c41a7629979154	archived	Source file copied to raw archive.	2026-04-21 18:00:48.55004	2026-04-21 18:00:48.55004
6	industry-events	2026-04-21_180048	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\daily\\industry_events.csv	4	abdc0c43bb9336f58cf9e2b441f3073bfb58113f7b95b786ffa1db52f3f745a8	archived	Source file copied to raw archive.	2026-04-21 18:00:48.778093	2026-04-21 18:00:48.778093
7	fund-master	2026-04-21_095306	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\fund_master.csv	15	15e75e4f3a815491c811a35a1e07a2fe41bb845669c82515a84b7c98f8d2e8cf	archived	Source file copied to raw archive.	2026-04-22 09:53:06.171974	2026-04-22 09:53:06.171974
8	industry-master	2026-04-21_095306	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_master.csv	3	fe75e38a38be7bc0fe1c1b81a3ac55331fe447d7f37282f7c8fc58d43bcbc757	archived	Source file copied to raw archive.	2026-04-22 09:53:06.21189	2026-04-22 09:53:06.21189
9	industry-fund-mapping	2026-04-21_095306	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_fund_mapping.csv	15	51b739b883ea5bcd6d403789bf13f72e8db7163f435ce797412aeb2597538b3a	archived	Source file copied to raw archive.	2026-04-22 09:53:06.254677	2026-04-22 09:53:06.254677
10	fund-daily-metrics	2026-04-21_095306	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\daily\\fund_daily_metrics.csv	15	d0d607aab81231875c316eaa9bc2ef849e3c1b3d5bb97e42b5a042bee32ce830	archived	Source file copied to raw archive.	2026-04-22 09:53:07.064279	2026-04-22 09:53:07.064279
11	fund-master	2026-04-21_095500	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\fund_master.csv	15	71ae8e8815550b847520c86a74676dfedf4ba447a8877c4be95a32d80df3aedb	archived	Source file copied to raw archive.	2026-04-22 09:55:00.721026	2026-04-22 09:55:00.721026
12	industry-master	2026-04-21_095500	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_master.csv	3	fe75e38a38be7bc0fe1c1b81a3ac55331fe447d7f37282f7c8fc58d43bcbc757	archived	Source file copied to raw archive.	2026-04-22 09:55:00.764595	2026-04-22 09:55:00.764595
13	industry-fund-mapping	2026-04-21_095500	2026-04-21	E:\\game\\runtime\\data-archive\\raw\\2026-04-21\\master\\industry_fund_mapping.csv	15	51b739b883ea5bcd6d403789bf13f72e8db7163f435ce797412aeb2597538b3a	archived	Source file copied to raw archive.	2026-04-22 09:55:00.800433	2026-04-22 09:55:00.800433
14	fund-fee-rule	2026-04-22_104443	2026-04-22	E:\\game\\runtime\\data-archive\\raw\\2026-04-22\\master\\fund_fee_rule.csv	1	e0685056ad28108309614ffa63860123cab6aa83a1c98f824cca1014f0439106	archived	Source file copied to raw archive.	2026-04-22 10:44:43.676464	2026-04-22 10:44:43.676464
15	fund-redemption-fee-ladder	2026-04-22_104443	2026-04-22	E:\\game\\runtime\\data-archive\\raw\\2026-04-22\\master\\fund_redemption_fee_ladder.csv	3	e6c391e710a61c0668e1cee3bdffaa440c0ac5205a5c5ce753672de9890620ea	archived	Source file copied to raw archive.	2026-04-22 10:44:43.714052	2026-04-22 10:44:43.714052
16	fund-master	2026-04-22_205754	2026-04-22	E:\\game\\runtime\\manual-drop\\2026-04-22\\master\\fund_master.csv	0	\N	missing	Source file not found in manual drop zone.	2026-04-22 20:57:54.576086	2026-04-22 20:57:54.576086
17	fund-master	2026-04-22_210047	2026-04-22	E:\\game\\runtime\\manual-drop\\2026-04-22\\master\\fund_master.csv	0	\N	missing	Source file not found in manual drop zone.	2026-04-22 21:00:47.937766	2026-04-22 21:00:47.937766
18	industry-master	2026-04-22_210047	2026-04-22	E:\\game\\runtime\\data-archive\\raw\\2026-04-22\\master\\industry_master.csv	6	57fcf0ea60c824e62b63b3bbfb857abd573d1a814167efb18770afcc32931ca4	archived	Source file copied to raw archive.	2026-04-22 21:00:48.088319	2026-04-22 21:00:48.088319
19	industry-fund-mapping	2026-04-22_210047	2026-04-22	E:\\game\\runtime\\manual-drop\\2026-04-22\\master\\industry_fund_mapping.csv	0	\N	missing	Source file not found in manual drop zone.	2026-04-22 21:00:48.135729	2026-04-22 21:00:48.135729
\.


--
-- Data for Name: watchlist_change_summary_daily; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.watchlist_change_summary_daily (id, trade_date, item_type, item_id, status_label, latest_change, watch_hint, source_batch_id, data_version, created_at, updated_at) FROM stdin;
3	2026-04-21	industry	semiconductor	机会增强	资金热度连续抬升	优先跟踪半导体相关 ETF 的资金与成交活跃度。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
4	2026-04-21	fund	f3	估值修复	近 20 日表现持续改善	结合创新药主题修复节奏，关注后续资金回流强度。	2026-04-21_170918	seed-v1	2026-04-21 17:09:18.556216	2026-04-21 17:09:18.556216
8	2026-04-21	industry	semiconductor	趋势确认	半导体处于趋势逐步清晰阶段，适合持续跟踪。	趋势信号逐步增强，可继续观察后续资金与事件变化。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
9	2026-04-21	industry	ai-infra	高热观察	AI 算力基础设施热度较高，短期需要平衡强趋势与拥挤风险。	趋势很强但热度较高，更适合控制节奏地跟踪。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
10	2026-04-21	industry	innovative-medicine	低位关注	创新药更偏估值修复与中期观察逻辑，适合等待进一步验证。	估值位置更有吸引力，适合纳入中期观察清单。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
11	2026-04-21	fund	f1	强势跟踪	国证芯片ETF近 3 月收益为 15.2%，当前适合持续观察。	结合半导体主题节奏，继续关注波动、回撤与跟踪说明的匹配度。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
12	2026-04-21	fund	f2	趋势改善	半导体设备联接A近 3 月收益为 13.6%，当前适合持续观察。	结合半导体主题节奏，继续关注波动、回撤与跟踪说明的匹配度。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
13	2026-04-21	fund	f3	趋势改善	创新药产业ETF近 3 月收益为 11.2%，当前适合持续观察。	结合创新药主题节奏，继续关注波动、回撤与跟踪说明的匹配度。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
14	2026-04-21	fund	f4	强势跟踪	AI算力先锋混合近 3 月收益为 18.7%，当前适合持续观察。	结合AI 算力基础设施主题节奏，继续关注波动、回撤与跟踪说明的匹配度。	2026-04-21_180626	manual-drop-v1	2026-04-21 18:06:26.402979	2026-04-21 18:06:26.402979
\.


--
-- Name: data_publish_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.data_publish_batch_id_seq', 5, true);


--
-- Name: data_quality_result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.data_quality_result_id_seq', 1, false);


--
-- Name: fund_candidate_request_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_candidate_request_id_seq', 5, true);


--
-- Name: fund_collection_task_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_collection_task_id_seq', 3, true);


--
-- Name: fund_compare_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_compare_daily_id_seq', 63, true);


--
-- Name: fund_daily_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_daily_metrics_id_seq', 68, true);


--
-- Name: fund_disclosed_holding_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_disclosed_holding_id_seq', 303, true);


--
-- Name: fund_fee_rule_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_fee_rule_id_seq', 1, true);


--
-- Name: fund_holding_cost_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_holding_cost_snapshot_id_seq', 6, true);


--
-- Name: fund_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_master_id_seq', 74, true);


--
-- Name: fund_redemption_fee_ladder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fund_redemption_fee_ladder_id_seq', 3, true);


--
-- Name: homepage_snapshot_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.homepage_snapshot_daily_id_seq', 6, true);


--
-- Name: industry_daily_metrics_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_daily_metrics_id_seq', 12, true);


--
-- Name: industry_detail_snapshot_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_detail_snapshot_daily_id_seq', 18, true);


--
-- Name: industry_events_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_events_daily_id_seq', 16, true);


--
-- Name: industry_fund_mapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_fund_mapping_id_seq', 74, true);


--
-- Name: industry_master_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_master_id_seq', 65, true);


--
-- Name: industry_opportunity_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.industry_opportunity_daily_id_seq', 9, true);


--
-- Name: job_run_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.job_run_log_id_seq', 45, true);


--
-- Name: portfolio_candidate_fund_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_candidate_fund_id_seq', 47, true);


--
-- Name: portfolio_decision_tip_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_decision_tip_id_seq', 26, true);


--
-- Name: portfolio_diagnosis_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_diagnosis_snapshot_id_seq', 7, true);


--
-- Name: portfolio_position_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_position_snapshot_id_seq', 224, true);


--
-- Name: portfolio_position_valuation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_position_valuation_id_seq', 84, true);


--
-- Name: portfolio_valuation_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.portfolio_valuation_snapshot_id_seq', 7, true);


--
-- Name: source_ingestion_audit_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.source_ingestion_audit_id_seq', 19, true);


--
-- Name: watchlist_change_summary_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.watchlist_change_summary_daily_id_seq', 14, true);


--
-- Name: data_publish_batch data_publish_batch_batch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_publish_batch
    ADD CONSTRAINT data_publish_batch_batch_id_key UNIQUE (batch_id);


--
-- Name: data_publish_batch data_publish_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_publish_batch
    ADD CONSTRAINT data_publish_batch_pkey PRIMARY KEY (id);


--
-- Name: data_quality_result data_quality_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_quality_result
    ADD CONSTRAINT data_quality_result_pkey PRIMARY KEY (id);


--
-- Name: fund_candidate_request fund_candidate_request_fund_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_candidate_request
    ADD CONSTRAINT fund_candidate_request_fund_code_key UNIQUE (fund_code);


--
-- Name: fund_candidate_request fund_candidate_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_candidate_request
    ADD CONSTRAINT fund_candidate_request_pkey PRIMARY KEY (id);


--
-- Name: fund_candidate_request fund_candidate_request_request_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_candidate_request
    ADD CONSTRAINT fund_candidate_request_request_id_key UNIQUE (request_id);


--
-- Name: fund_collection_task fund_collection_task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_collection_task
    ADD CONSTRAINT fund_collection_task_pkey PRIMARY KEY (id);


--
-- Name: fund_collection_task fund_collection_task_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_collection_task
    ADD CONSTRAINT fund_collection_task_task_id_key UNIQUE (task_id);


--
-- Name: fund_compare_daily fund_compare_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_compare_daily
    ADD CONSTRAINT fund_compare_daily_pkey PRIMARY KEY (id);


--
-- Name: fund_compare_daily fund_compare_daily_trade_date_fund_id_data_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_compare_daily
    ADD CONSTRAINT fund_compare_daily_trade_date_fund_id_data_version_key UNIQUE (trade_date, fund_id, data_version);


--
-- Name: fund_daily_metrics fund_daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_daily_metrics
    ADD CONSTRAINT fund_daily_metrics_pkey PRIMARY KEY (id);


--
-- Name: fund_daily_metrics fund_daily_metrics_trade_date_fund_id_data_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_daily_metrics
    ADD CONSTRAINT fund_daily_metrics_trade_date_fund_id_data_version_key UNIQUE (trade_date, fund_id, data_version);


--
-- Name: fund_disclosed_holding fund_disclosed_holding_fund_code_report_period_holding_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_disclosed_holding
    ADD CONSTRAINT fund_disclosed_holding_fund_code_report_period_holding_name_key UNIQUE (fund_code, report_period, holding_name);


--
-- Name: fund_disclosed_holding fund_disclosed_holding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_disclosed_holding
    ADD CONSTRAINT fund_disclosed_holding_pkey PRIMARY KEY (id);


--
-- Name: fund_fee_rule fund_fee_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_fee_rule
    ADD CONSTRAINT fund_fee_rule_pkey PRIMARY KEY (id);


--
-- Name: fund_fee_rule fund_fee_rule_trade_date_fund_id_data_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_fee_rule
    ADD CONSTRAINT fund_fee_rule_trade_date_fund_id_data_version_key UNIQUE (trade_date, fund_id, data_version);


--
-- Name: fund_holding_cost_snapshot fund_holding_cost_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_holding_cost_snapshot
    ADD CONSTRAINT fund_holding_cost_snapshot_pkey PRIMARY KEY (id);


--
-- Name: fund_holding_cost_snapshot fund_holding_cost_snapshot_trade_date_fund_id_holding_days__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_holding_cost_snapshot
    ADD CONSTRAINT fund_holding_cost_snapshot_trade_date_fund_id_holding_days__key UNIQUE (trade_date, fund_id, holding_days, data_version);


--
-- Name: fund_master fund_master_fund_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_master
    ADD CONSTRAINT fund_master_fund_code_key UNIQUE (fund_code);


--
-- Name: fund_master fund_master_fund_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_master
    ADD CONSTRAINT fund_master_fund_id_key UNIQUE (fund_id);


--
-- Name: fund_master fund_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_master
    ADD CONSTRAINT fund_master_pkey PRIMARY KEY (id);


--
-- Name: fund_redemption_fee_ladder fund_redemption_fee_ladder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fund_redemption_fee_ladder
    ADD CONSTRAINT fund_redemption_fee_ladder_pkey PRIMARY KEY (id);


--
-- Name: homepage_snapshot_daily homepage_snapshot_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_snapshot_daily
    ADD CONSTRAINT homepage_snapshot_daily_pkey PRIMARY KEY (id);


--
-- Name: homepage_snapshot_daily homepage_snapshot_daily_snapshot_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.homepage_snapshot_daily
    ADD CONSTRAINT homepage_snapshot_daily_snapshot_key_key UNIQUE (snapshot_key);


--
-- Name: industry_daily_metrics industry_daily_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_daily_metrics
    ADD CONSTRAINT industry_daily_metrics_pkey PRIMARY KEY (id);


--
-- Name: industry_daily_metrics industry_daily_metrics_trade_date_industry_id_data_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_daily_metrics
    ADD CONSTRAINT industry_daily_metrics_trade_date_industry_id_data_version_key UNIQUE (trade_date, industry_id, data_version);


--
-- Name: industry_detail_snapshot_daily industry_detail_snapshot_dail_trade_date_industry_id_data_v_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_detail_snapshot_daily
    ADD CONSTRAINT industry_detail_snapshot_dail_trade_date_industry_id_data_v_key UNIQUE (trade_date, industry_id, data_version);


--
-- Name: industry_detail_snapshot_daily industry_detail_snapshot_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_detail_snapshot_daily
    ADD CONSTRAINT industry_detail_snapshot_daily_pkey PRIMARY KEY (id);


--
-- Name: industry_events_daily industry_events_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_events_daily
    ADD CONSTRAINT industry_events_daily_pkey PRIMARY KEY (id);


--
-- Name: industry_fund_mapping industry_fund_mapping_industry_id_fund_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_fund_mapping
    ADD CONSTRAINT industry_fund_mapping_industry_id_fund_id_key UNIQUE (industry_id, fund_id);


--
-- Name: industry_fund_mapping industry_fund_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_fund_mapping
    ADD CONSTRAINT industry_fund_mapping_pkey PRIMARY KEY (id);


--
-- Name: industry_master industry_master_industry_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_master
    ADD CONSTRAINT industry_master_industry_id_key UNIQUE (industry_id);


--
-- Name: industry_master industry_master_industry_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_master
    ADD CONSTRAINT industry_master_industry_name_key UNIQUE (industry_name);


--
-- Name: industry_master industry_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_master
    ADD CONSTRAINT industry_master_pkey PRIMARY KEY (id);


--
-- Name: industry_opportunity_daily industry_opportunity_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_opportunity_daily
    ADD CONSTRAINT industry_opportunity_daily_pkey PRIMARY KEY (id);


--
-- Name: job_run_log job_run_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_run_log
    ADD CONSTRAINT job_run_log_pkey PRIMARY KEY (id);


--
-- Name: portfolio_candidate_fund portfolio_candidate_fund_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_candidate_fund
    ADD CONSTRAINT portfolio_candidate_fund_candidate_id_key UNIQUE (candidate_id);


--
-- Name: portfolio_candidate_fund portfolio_candidate_fund_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_candidate_fund
    ADD CONSTRAINT portfolio_candidate_fund_pkey PRIMARY KEY (id);


--
-- Name: portfolio_candidate_fund portfolio_candidate_fund_user_id_trade_date_fund_id_source__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_candidate_fund
    ADD CONSTRAINT portfolio_candidate_fund_user_id_trade_date_fund_id_source__key UNIQUE (user_id, trade_date, fund_id, source_type);


--
-- Name: portfolio_decision_tip portfolio_decision_tip_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_decision_tip
    ADD CONSTRAINT portfolio_decision_tip_pkey PRIMARY KEY (id);


--
-- Name: portfolio_decision_tip portfolio_decision_tip_tip_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_decision_tip
    ADD CONSTRAINT portfolio_decision_tip_tip_id_key UNIQUE (tip_id);


--
-- Name: portfolio_diagnosis_snapshot portfolio_diagnosis_snapshot_diagnosis_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_diagnosis_snapshot
    ADD CONSTRAINT portfolio_diagnosis_snapshot_diagnosis_id_key UNIQUE (diagnosis_id);


--
-- Name: portfolio_diagnosis_snapshot portfolio_diagnosis_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_diagnosis_snapshot
    ADD CONSTRAINT portfolio_diagnosis_snapshot_pkey PRIMARY KEY (id);


--
-- Name: portfolio_diagnosis_snapshot portfolio_diagnosis_snapshot_user_id_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_diagnosis_snapshot
    ADD CONSTRAINT portfolio_diagnosis_snapshot_user_id_trade_date_key UNIQUE (user_id, trade_date);


--
-- Name: portfolio_position_snapshot portfolio_position_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_snapshot
    ADD CONSTRAINT portfolio_position_snapshot_pkey PRIMARY KEY (id);


--
-- Name: portfolio_position_snapshot portfolio_position_snapshot_snapshot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_snapshot
    ADD CONSTRAINT portfolio_position_snapshot_snapshot_id_key UNIQUE (snapshot_id);


--
-- Name: portfolio_position_snapshot portfolio_position_snapshot_user_id_position_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_snapshot
    ADD CONSTRAINT portfolio_position_snapshot_user_id_position_id_key UNIQUE (user_id, position_id);


--
-- Name: portfolio_position_valuation portfolio_position_valuation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_valuation
    ADD CONSTRAINT portfolio_position_valuation_pkey PRIMARY KEY (id);


--
-- Name: portfolio_position_valuation portfolio_position_valuation_user_id_trade_date_position_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_position_valuation
    ADD CONSTRAINT portfolio_position_valuation_user_id_trade_date_position_id_key UNIQUE (user_id, trade_date, position_id);


--
-- Name: portfolio_valuation_snapshot portfolio_valuation_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_valuation_snapshot
    ADD CONSTRAINT portfolio_valuation_snapshot_pkey PRIMARY KEY (id);


--
-- Name: portfolio_valuation_snapshot portfolio_valuation_snapshot_user_id_trade_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_valuation_snapshot
    ADD CONSTRAINT portfolio_valuation_snapshot_user_id_trade_date_key UNIQUE (user_id, trade_date);


--
-- Name: portfolio_valuation_snapshot portfolio_valuation_snapshot_valuation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_valuation_snapshot
    ADD CONSTRAINT portfolio_valuation_snapshot_valuation_id_key UNIQUE (valuation_id);


--
-- Name: source_ingestion_audit source_ingestion_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_ingestion_audit
    ADD CONSTRAINT source_ingestion_audit_pkey PRIMARY KEY (id);


--
-- Name: watchlist_change_summary_daily watchlist_change_summary_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_change_summary_daily
    ADD CONSTRAINT watchlist_change_summary_daily_pkey PRIMARY KEY (id);


--
-- Name: idx_fund_candidate_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_candidate_code ON public.fund_candidate_request USING btree (fund_code);


--
-- Name: idx_fund_candidate_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_candidate_status ON public.fund_candidate_request USING btree (request_status);


--
-- Name: idx_fund_collection_task_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_collection_task_code ON public.fund_collection_task USING btree (fund_code);


--
-- Name: idx_fund_collection_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_collection_task_status ON public.fund_collection_task USING btree (task_status);


--
-- Name: idx_fund_daily_fund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_daily_fund_id ON public.fund_daily_metrics USING btree (fund_id);


--
-- Name: idx_fund_daily_trade_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_daily_trade_date ON public.fund_daily_metrics USING btree (trade_date);


--
-- Name: idx_fund_disclosed_holding_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_disclosed_holding_code ON public.fund_disclosed_holding USING btree (fund_code);


--
-- Name: idx_fund_disclosed_holding_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_disclosed_holding_period ON public.fund_disclosed_holding USING btree (report_period);


--
-- Name: idx_fund_fee_rule_fund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_fee_rule_fund_id ON public.fund_fee_rule USING btree (fund_id);


--
-- Name: idx_fund_fee_rule_trade_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_fee_rule_trade_date ON public.fund_fee_rule USING btree (trade_date);


--
-- Name: idx_fund_master_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_master_company ON public.fund_master USING btree (fund_company);


--
-- Name: idx_fund_master_fund_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_master_fund_type ON public.fund_master USING btree (fund_type);


--
-- Name: idx_fund_master_theme; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fund_master_theme ON public.fund_master USING btree (theme);


--
-- Name: idx_holding_cost_fund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holding_cost_fund_id ON public.fund_holding_cost_snapshot USING btree (fund_id);


--
-- Name: idx_holding_cost_holding_days; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holding_cost_holding_days ON public.fund_holding_cost_snapshot USING btree (holding_days);


--
-- Name: idx_holding_cost_trade_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holding_cost_trade_date ON public.fund_holding_cost_snapshot USING btree (trade_date);


--
-- Name: idx_industry_events_industry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_events_industry_id ON public.industry_events_daily USING btree (industry_id);


--
-- Name: idx_industry_events_trade_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_events_trade_date ON public.industry_events_daily USING btree (trade_date);


--
-- Name: idx_portfolio_candidate_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_candidate_user_date ON public.portfolio_candidate_fund USING btree (user_id, trade_date DESC);


--
-- Name: idx_portfolio_position_fund_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_position_fund_code ON public.portfolio_position_snapshot USING btree (fund_code);


--
-- Name: idx_portfolio_position_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_position_user ON public.portfolio_position_snapshot USING btree (user_id);


--
-- Name: idx_portfolio_position_valuation_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_position_valuation_user_date ON public.portfolio_position_valuation USING btree (user_id, trade_date DESC);


--
-- Name: idx_portfolio_tip_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_tip_user_date ON public.portfolio_decision_tip USING btree (user_id, trade_date DESC);


--
-- Name: idx_portfolio_valuation_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_valuation_user_date ON public.portfolio_valuation_snapshot USING btree (user_id, trade_date DESC);


--
-- Name: idx_redemption_ladder_fund_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemption_ladder_fund_id ON public.fund_redemption_fee_ladder USING btree (fund_id);


--
-- Name: idx_redemption_ladder_trade_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemption_ladder_trade_date ON public.fund_redemption_fee_ladder USING btree (trade_date);


--
-- PostgreSQL database dump complete
--

\unrestrict hBf4ulFchnhfNrhUdZcLP3CWQwJkItmzq9tPNBqaW8rTNRJ1CcDA8ovFbphjkfq

