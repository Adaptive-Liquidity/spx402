-- Stable, unique, immutable slugs for x402 services.
-- A shared transcript URL must never break, so the slug is assigned once at
-- insert (with -2/-3 collision suffixes) and frozen thereafter.

CREATE OR REPLACE FUNCTION public.x402_service_base_slug(p_url text, p_pay_to text, p_id uuid)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_host text;
  v_path text;
  v_slug text;
BEGIN
  IF p_url IS NOT NULL AND length(trim(p_url)) > 0 THEN
    v_host := lower(split_part(regexp_replace(p_url, '^[a-zA-Z]+://', ''), '/', 1));
    v_host := split_part(v_host, '?', 1);
    v_path := regexp_replace(regexp_replace(p_url, '^[a-zA-Z]+://[^/]*', ''), '\?.*$', '');
    v_slug := v_host || regexp_replace(regexp_replace(v_path, '/+$', ''), '/+', '~', 'g');
  ELSIF p_pay_to IS NOT NULL AND length(trim(p_pay_to)) > 0 THEN
    v_slug := 'payee~' || lower(p_pay_to);
  ELSE
    v_slug := 'service~' || replace(p_id::text, '-', '');
  END IF;

  v_slug := regexp_replace(v_slug, '[^a-zA-Z0-9.~_-]', '-', 'g');
  v_slug := lower(regexp_replace(v_slug, '-+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^[-.~]+', '');
  v_slug := regexp_replace(v_slug, '[-.~]+$', '');
  v_slug := left(v_slug, 120);

  IF v_slug IS NULL OR length(v_slug) = 0 THEN
    v_slug := 'service~' || replace(p_id::text, '-', '');
  END IF;

  RETURN v_slug;
END;
$$;

-- Assign at insert, resolving collisions with -2, -3, ...
CREATE OR REPLACE FUNCTION public.x402_service_assign_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_candidate text;
  v_n int := 1;
BEGIN
  v_base := coalesce(nullif(trim(NEW.slug), ''),
                     public.x402_service_base_slug(NEW.url, NEW.pay_to, NEW.id));
  v_base := regexp_replace(lower(regexp_replace(v_base, '[^a-zA-Z0-9.~_-]', '-', 'g')), '-+', '-', 'g');
  v_base := left(regexp_replace(regexp_replace(v_base, '^[-.~]+', ''), '[-.~]+$', ''), 120);
  IF v_base IS NULL OR length(v_base) = 0 THEN
    v_base := 'service~' || replace(NEW.id::text, '-', '');
  END IF;

  v_candidate := v_base;
  WHILE EXISTS (SELECT 1 FROM public.x402_service s WHERE s.slug = v_candidate) LOOP
    v_n := v_n + 1;
    v_candidate := left(v_base, 120 - (length(v_n::text) + 1)) || '-' || v_n::text;
  END LOOP;

  NEW.slug := v_candidate;
  RETURN NEW;
END;
$$;

-- Frozen forever: any attempt to change the slug is ignored, not honoured.
CREATE OR REPLACE FUNCTION public.x402_service_freeze_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.slug := OLD.slug;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS x402_service_assign_slug_trg ON public.x402_service;
CREATE TRIGGER x402_service_assign_slug_trg
  BEFORE INSERT ON public.x402_service
  FOR EACH ROW EXECUTE FUNCTION public.x402_service_assign_slug();

DROP TRIGGER IF EXISTS x402_service_freeze_slug_trg ON public.x402_service;
CREATE TRIGGER x402_service_freeze_slug_trg
  BEFORE UPDATE ON public.x402_service
  FOR EACH ROW EXECUTE FUNCTION public.x402_service_freeze_slug();

-- Backfill any rows that predate the trigger.
DO $$
DECLARE
  r record;
  v_base text;
  v_candidate text;
  v_n int;
BEGIN
  FOR r IN SELECT id, url, pay_to FROM public.x402_service WHERE slug IS NULL OR trim(slug) = '' LOOP
    v_base := public.x402_service_base_slug(r.url, r.pay_to, r.id);
    v_candidate := v_base;
    v_n := 1;
    WHILE EXISTS (SELECT 1 FROM public.x402_service s WHERE s.slug = v_candidate) LOOP
      v_n := v_n + 1;
      v_candidate := left(v_base, 120 - (length(v_n::text) + 1)) || '-' || v_n::text;
    END LOOP;
    UPDATE public.x402_service SET slug = v_candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.x402_service ALTER COLUMN slug SET NOT NULL;