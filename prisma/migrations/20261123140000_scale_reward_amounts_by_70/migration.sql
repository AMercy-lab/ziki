-- Scale stored platform and project reward amounts by 70 so a saved
-- config keeps pace with the new hard-coded defaults. Guideline text is left
-- as written. Prisma applies this file once.

CREATE OR REPLACE FUNCTION scale_json_numbers(value jsonb, factor integer)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  key text;
  item jsonb;
  result jsonb;
BEGIN
  IF value IS NULL THEN
    RETURN NULL;
  ELSIF jsonb_typeof(value) = 'number' THEN
    RETURN to_jsonb((value #>> '{}')::numeric * factor);
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR key, item IN SELECT * FROM jsonb_each(value)
    LOOP
      result := result || jsonb_build_object(key, scale_json_numbers(item, factor));
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(value) = 'array' THEN
    result := '[]'::jsonb;
    FOR item IN SELECT * FROM jsonb_array_elements(value)
    LOOP
      result := result || jsonb_build_array(scale_json_numbers(item, factor));
    END LOOP;
    RETURN result;
  ELSE
    RETURN value;
  END IF;
END;
$$;

UPDATE "PlatformSettings"
SET "rewardConfig" = scale_json_numbers("rewardConfig", 70)
WHERE "rewardConfig" IS NOT NULL;

UPDATE "Project"
SET "rewardConfig" = scale_json_numbers("rewardConfig", 70)
WHERE "rewardConfig" IS NOT NULL;

DROP FUNCTION scale_json_numbers(jsonb, integer);
