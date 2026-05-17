-- ==============================================================================
-- Migration: 009_phase5_demo_seed.sql
-- Description: Seeds realistic enterprise demo data across all modules
-- ==============================================================================

DO $$
DECLARE
  v_cycle_id UUID;
  v_admin_id UUID;
  v_mgr1_id UUID := gen_random_uuid();
  v_mgr2_id UUID := gen_random_uuid();
  v_emp1_id UUID := gen_random_uuid();
  v_emp2_id UUID := gen_random_uuid();
  v_emp3_id UUID := gen_random_uuid();
  v_emp4_id UUID := gen_random_uuid();
  
  v_sgoal1_id UUID := gen_random_uuid();
  v_sgoal2_id UUID := gen_random_uuid();

  v_goal_e1_1 UUID := gen_random_uuid();
  v_goal_e1_2 UUID := gen_random_uuid();
  v_goal_e2_1 UUID := gen_random_uuid();
  v_goal_e3_1 UUID := gen_random_uuid();
BEGIN
  -- Get active cycle
  SELECT id INTO v_cycle_id FROM public.goal_cycles WHERE name = 'Q1 FY2025-26' LIMIT 1;
  IF v_cycle_id IS NULL THEN RETURN; END IF;

  -- Get an admin to be the creator
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  IF v_admin_id IS NULL THEN 
    -- If no admin, fallback to creating one or aborting (we assume an admin exists)
    RETURN;
  END IF;

  -- 1. Create Profiles
  -- We must insert into auth.users first if we want them to login, but since this is just demo seed, 
  -- we can just insert into profiles (RLS doesn't block trigger if disabled, but auth.users fk might fail).
  -- Note: profiles.id references auth.users(id). 
  -- We CANNOT insert into profiles without auth.users. 
  -- In Supabase, inserting into auth.users is protected. 
  -- Thus, a pure SQL seed for auth users requires either bypassing the API or using standard raw inserts.
  -- To keep it clean and robust, we'll use a dummy UUID if auth.users has no constraint, 
  -- BUT auth.users FK is enforced. We must insert into auth.users.

  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (v_mgr1_id, 'sarah.manager@quartiq.io', '{"full_name":"Sarah Jenkins","department":"Engineering","designation":"VP of Eng","role":"manager"}'),
    (v_mgr2_id, 'david.manager@quartiq.io', '{"full_name":"David Chen","department":"Sales","designation":"Sales Director","role":"manager"}'),
    (v_emp1_id, 'alex.dev@quartiq.io', '{"full_name":"Alex Developer","department":"Engineering","designation":"Senior Frontend","role":"employee"}'),
    (v_emp2_id, 'maria.qa@quartiq.io', '{"full_name":"Maria QA","department":"Engineering","designation":"QA Lead","role":"employee"}'),
    (v_emp3_id, 'james.sales@quartiq.io', '{"full_name":"James Account","department":"Sales","designation":"Account Exec","role":"employee"}'),
    (v_emp4_id, 'lisa.sales@quartiq.io', '{"full_name":"Lisa Closer","department":"Sales","designation":"Account Exec","role":"employee"}')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Update Profiles (trigger already inserted them)
  UPDATE profiles SET manager_id = v_mgr1_id WHERE id IN (v_emp1_id, v_emp2_id);
  UPDATE profiles SET manager_id = v_mgr2_id WHERE id IN (v_emp3_id, v_emp4_id);
  -- Managers report to Admin
  UPDATE profiles SET manager_id = v_admin_id WHERE id IN (v_mgr1_id, v_mgr2_id);

  -- 3. Create Shared Goals
  INSERT INTO public.shared_goal_master (id, cycle_id, created_by_manager_id, title, description, category, thrust_area, priority, suggested_weightage, created_by)
  VALUES 
    (v_sgoal1_id, v_cycle_id, v_mgr1_id, 'Ship Quartiq V2 Core', 'Launch the new enterprise dashboard module.', 'Engineering', 'Innovation', 'high', 40, v_mgr1_id),
    (v_sgoal2_id, v_cycle_id, v_mgr2_id, 'Close $500k Q1 Pipeline', 'Aggressive outbound to land 5 enterprise deals.', 'Sales', 'Revenue', 'critical', 50, v_mgr2_id);

  -- 4. Create Employee Goals
  INSERT INTO public.goals (id, profile_id, cycle_id, title, description, category, thrust_area, priority, status, uom_type, target_value, achievement_value, weightage, is_locked, is_shared, submitted_at, approved_at, approved_by, created_by)
  VALUES
    (v_goal_e1_1, v_emp1_id, v_cycle_id, 'Ship Quartiq V2 Core', 'Frontend implementation', 'Engineering', 'Innovation', 'high', 'approved', 'percentage_max', 100, 45, 40, TRUE, TRUE, NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', v_mgr1_id, v_emp1_id),
    (v_goal_e1_2, v_emp1_id, v_cycle_id, 'Reduce Bundle Size', 'Webpack optimization', 'Engineering', 'Quality', 'medium', 'under_review', 'numeric_min', 500, NULL, 60, FALSE, FALSE, NOW() - INTERVAL '6 days', NULL, NULL, v_emp1_id),
    (v_goal_e2_1, v_emp2_id, v_cycle_id, 'Automate 80% E2E', 'Cypress tests', 'Engineering', 'Quality', 'high', 'approved', 'percentage_max', 80, 80, 100, TRUE, FALSE, NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', v_mgr1_id, v_emp2_id),
    (v_goal_e3_1, v_emp3_id, v_cycle_id, 'Close $500k Q1 Pipeline', 'Focus on EMEA', 'Sales', 'Revenue', 'critical', 'approved', 'numeric_max', 500000, 150000, 100, TRUE, TRUE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', v_mgr2_id, v_emp3_id);

  -- 5. Link Shared Goals
  INSERT INTO public.shared_goal_assignments (shared_goal_id, goal_id, profile_id, assigned_by)
  VALUES 
    (v_sgoal1_id, v_goal_e1_1, v_emp1_id, v_mgr1_id),
    (v_sgoal2_id, v_goal_e3_1, v_emp3_id, v_mgr2_id);

  -- 6. Add Check-ins
  INSERT INTO public.quarterly_checkins (goal_id, cycle_id, profile_id, quarter, progress_percentage, checkin_status, acknowledged_by, created_by)
  VALUES
    (v_goal_e1_1, v_cycle_id, v_emp1_id, 1, 45, 'acknowledged', v_mgr1_id, v_emp1_id),
    (v_goal_e2_1, v_cycle_id, v_emp2_id, 1, 80, 'acknowledged', v_mgr1_id, v_emp2_id),
    (v_goal_e3_1, v_cycle_id, v_emp3_id, 1, 30, 'submitted', NULL, v_emp3_id);

END $$;
