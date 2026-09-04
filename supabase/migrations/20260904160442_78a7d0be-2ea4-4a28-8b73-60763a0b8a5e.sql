REVOKE EXECUTE ON FUNCTION public.get_api_key_usage(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_api_key_usage(uuid) TO authenticated, service_role;