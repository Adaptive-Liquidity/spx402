UPDATE public.candidate_agents
SET status = 'pending',
    check_attempts = 0,
    rejection_reason = NULL,
    last_checked_at = NULL,
    updated_at = now()
WHERE discovered_via = 'curated_seed';