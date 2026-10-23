-- 007_visitor_analytics.sql
-- Privacy-friendly Visitor Analytics Schema for REclaim Lost & Found

-- 1. Visitor Sessions Table
-- Strict privacy rules: NO IP addresses, NO names, NO emails, NO browser fingerprints.
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
    session_id text PRIMARY KEY,
    visitor_type text NOT NULL CHECK (visitor_type IN ('guest', 'authenticated')) DEFAULT 'guest',
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    landing_path text NOT NULL DEFAULT '/',
    last_path text NOT NULL DEFAULT '/',
    device_type text NOT NULL DEFAULT 'Desktop' CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet', 'Unknown')),
    browser_name text NOT NULL DEFAULT 'Other',
    started_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_heartbeat_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heartbeat_count integer NOT NULL DEFAULT 1 CHECK (heartbeat_count >= 1),
    page_view_count integer NOT NULL DEFAULT 1 CHECK (page_view_count >= 1),
    is_active boolean NOT NULL DEFAULT true,
    notification_sent boolean NOT NULL DEFAULT false,
    ended_at timestamptz
);

-- 2. Visitor Analytics Events Table
CREATE TABLE IF NOT EXISTS public.visitor_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id text NOT NULL REFERENCES public.visitor_sessions(session_id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN ('session_start', 'heartbeat', 'page_view', 'auth_change')),
    path text NOT NULL DEFAULT '/',
    visitor_type text NOT NULL CHECK (visitor_type IN ('guest', 'authenticated')),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Optimal Indexes for High Performance Telemetry
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_started_at ON public.visitor_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_heartbeat ON public.visitor_sessions(last_heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_active ON public.visitor_sessions(is_active, last_heartbeat_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_type ON public.visitor_sessions(visitor_type);
CREATE INDEX IF NOT EXISTS idx_visitor_events_session_id ON public.visitor_events(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_events_created_at ON public.visitor_events(created_at DESC);

-- 4. Stored Function: Mark Inactive Sessions (Heartbeat timeout)
CREATE OR REPLACE FUNCTION public.mark_inactive_visitor_sessions(timeout_minutes integer DEFAULT 5)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count integer;
BEGIN
    UPDATE public.visitor_sessions
    SET is_active = false
    WHERE is_active = true
      AND last_heartbeat_at < (CURRENT_TIMESTAMP - (timeout_minutes || ' minutes')::interval);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- 5. Stored Function: Retention Policy (Purge aged analytics events)
CREATE OR REPLACE FUNCTION public.purge_old_visitor_analytics(retention_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.visitor_events
    WHERE created_at < (CURRENT_TIMESTAMP - (retention_days || ' days')::interval);

    DELETE FROM public.visitor_sessions
    WHERE started_at < (CURRENT_TIMESTAMP - (180 || ' days')::interval);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
