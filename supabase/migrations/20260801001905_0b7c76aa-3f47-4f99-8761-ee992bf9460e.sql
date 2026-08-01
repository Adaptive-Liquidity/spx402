REVOKE ALL ON public.facilitators FROM anon, authenticated;
GRANT SELECT ON public.facilitators TO anon, authenticated;
GRANT ALL ON public.facilitators TO service_role;