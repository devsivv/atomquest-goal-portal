-- ==============================================================================
-- Migration: 006_phase5_performance_cycles.sql
-- Description: Performance Cycle Management System for Admin/HR Governance.
--              Includes tables for performance cycles and quarterly windows.
-- ==============================================================================

-- 1. Create Enums
CREATE TYPE public.cycle_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE public.quarter_label AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- 2. Create performance_cycles table
CREATE TABLE public.performance_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status public.cycle_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT valid_dates CHECK (end_date > start_date)
);

-- Ensure only one active cycle exists at a time
CREATE UNIQUE INDEX idx_one_active_cycle ON public.performance_cycles (status) WHERE status = 'active';

-- 3. Create cycle_windows table
CREATE TABLE public.cycle_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
    quarter public.quarter_label NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    submission_deadline DATE NOT NULL,
    review_deadline DATE NOT NULL,
    
    CONSTRAINT valid_window_dates CHECK (end_date > start_date),
    CONSTRAINT valid_deadlines CHECK (submission_deadline >= end_date AND review_deadline >= submission_deadline),
    UNIQUE(cycle_id, quarter)
);

-- 4. Enable Row Level Security
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_windows ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Everyone can read cycles and windows
CREATE POLICY "Anyone can view cycles" 
    ON public.performance_cycles FOR SELECT 
    USING (true);

CREATE POLICY "Anyone can view cycle windows" 
    ON public.cycle_windows FOR SELECT 
    USING (true);

-- Only Admins/HR can modify cycles and windows
-- (Assuming we identify admins by role = 'admin' or 'hr' in profiles)
CREATE POLICY "Admins can insert cycles" 
    ON public.performance_cycles FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hr')
        )
    );

CREATE POLICY "Admins can update cycles" 
    ON public.performance_cycles FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hr')
        )
    );

CREATE POLICY "Admins can insert cycle windows" 
    ON public.cycle_windows FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hr')
        )
    );

CREATE POLICY "Admins can update cycle windows" 
    ON public.cycle_windows FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'hr')
        )
    );

-- 6. Trigger for updated_at
CREATE TRIGGER update_performance_cycles_updated_at
    BEFORE UPDATE ON public.performance_cycles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 7. RPC for activating a cycle securely
-- This handles archiving the currently active cycle and activating the new one transactionally
CREATE OR REPLACE FUNCTION public.activate_performance_cycle(p_cycle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as DB owner to bypass RLS for this specific transaction
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    -- Check permissions
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    IF v_role NOT IN ('admin', 'hr') THEN
        RAISE EXCEPTION 'Unauthorized: Only admins or HR can activate cycles';
    END IF;

    -- Archive currently active cycle(s)
    UPDATE public.performance_cycles 
    SET status = 'archived', updated_at = now()
    WHERE status = 'active';

    -- Activate the requested cycle
    UPDATE public.performance_cycles 
    SET status = 'active', updated_at = now()
    WHERE id = p_cycle_id;

END;
$$;
