-- enqueue_candidate_agent is the public submit path. Only signed-in users
-- should be able to enqueue candidates — anonymous callers have no business
-- writing into the moderation queue.
REVOKE EXECUTE ON FUNCTION public.enqueue_candidate_agent(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_candidate_agent(text) TO authenticated;