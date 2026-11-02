-- Awards that were stored at 70x the original schedule move to 30x.
-- The points goal goes back to 500. Guideline text is left as written.
-- Earned ledger rows are not rewritten. Prisma applies this file once.

CREATE OR REPLACE FUNCTION rescale_reward_from_70_to_30(value jsonb)
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
    RETURN to_jsonb(round(((value #>> '{}')::numeric * 3) / 7)::bigint);
  ELSIF jsonb_typeof(value) = 'object' THEN
    result := '{}'::jsonb;
    FOR key, item IN SELECT * FROM jsonb_each(value)
    LOOP
      result := result || jsonb_build_object(key, rescale_reward_from_70_to_30(item));
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(value) = 'array' THEN
    result := '[]'::jsonb;
    FOR item IN SELECT * FROM jsonb_array_elements(value)
    LOOP
      result := result || jsonb_build_array(rescale_reward_from_70_to_30(item));
    END LOOP;
    RETURN result;
  ELSE
    RETURN value;
  END IF;
END;
$$;

UPDATE "PlatformSettings"
SET "rewardConfig" = jsonb_set(
  rescale_reward_from_70_to_30("rewardConfig"),
  '{target}',
  '500'::jsonb,
  true
)
WHERE "rewardConfig" IS NOT NULL
  AND jsonb_typeof("rewardConfig") = 'object';

UPDATE "Project"
SET "rewardConfig" = rescale_reward_from_70_to_30("rewardConfig")
WHERE "rewardConfig" IS NOT NULL
  AND jsonb_typeof("rewardConfig") = 'object';

DROP FUNCTION rescale_reward_from_70_to_30(jsonb);
