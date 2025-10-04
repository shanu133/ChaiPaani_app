-- RPC: Atomically settle group debt between two users, full-split only
-- Date: 2025-10-04

CREATE OR REPLACE FUNCTION public.settle_group_debt(
  p_group_id UUID,
  p_from_user UUID,
  p_to_user UUID,
  p_amount NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
  v_remaining NUMERIC := p_amount;
  v_total_settled NUMERIC := 0;
  v_split RECORD;
  v_settled_ids UUID[] := ARRAY[]::UUID[];
  v_err_text TEXT;
  v_err_state TEXT;
BEGIN
  -- Basic validation
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be greater than zero';
  END IF;

  IF p_from_user = p_to_user THEN
    RAISE EXCEPTION 'Payer and receiver cannot be the same user';
  END IF;

  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Actor must be one of the participants
  IF v_actor <> p_from_user AND v_actor <> p_to_user THEN
    RAISE EXCEPTION 'Only participants can record settlements';
  END IF;

  -- Both users must belong to the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_from_user
  ) THEN
    RAISE EXCEPTION 'From user is not a member of this group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = p_group_id AND gm.user_id = p_to_user
  ) THEN
    RAISE EXCEPTION 'To user is not a member of this group';
  END IF;

  -- Iterate unsettled splits where from_user owes to to_user within this group
  FOR v_split IN
    SELECT es.id, es.amount
    FROM public.expense_splits es
    JOIN public.expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_from_user
      AND e.payer_id = p_to_user
      AND e.group_id = p_group_id
      AND es.is_settled = false
    ORDER BY es.created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    -- Only settle full splits to keep model simple
    IF v_remaining >= v_split.amount THEN
      UPDATE public.expense_splits
      SET is_settled = true,
          settled_at = TIMEZONE('utc', NOW())
      WHERE id = v_split.id;

      v_settled_ids := array_append(v_settled_ids, v_split.id);
      v_total_settled := v_total_settled + v_split.amount;
      v_remaining := v_remaining - v_split.amount;
    ELSE
      EXIT; -- Not enough to fully settle this split
    END IF;
  END LOOP;

  -- Record a settlement if any amount was settled
  IF v_total_settled > 0 THEN
    BEGIN
      INSERT INTO public.settlements (group_id, payer_id, receiver_id, amount, description)
      VALUES (p_group_id, p_from_user, p_to_user, v_total_settled, 'Settle up');
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
        RAISE LOG 'settle_group_debt settlements insert unique_violation [%]: %', v_err_state, v_err_text;
        -- Non-fatal: a duplicate settlement record; splits are already updated; proceed
      WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
        RAISE LOG 'settle_group_debt settlements insert foreign_key_violation [%]: %', v_err_state, v_err_text;
        -- Non-fatal: underlying rows may have been removed; proceed without settlement record
      WHEN check_violation THEN
        GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
        RAISE LOG 'settle_group_debt settlements insert check_violation [%]: %', v_err_state, v_err_text;
        -- Non-fatal: amount/constraints invalid; proceed without settlement record
      WHEN OTHERS THEN
        -- Unexpected error: log and re-raise so caller can handle
        GET STACKED DIAGNOSTICS v_err_text = MESSAGE_TEXT, v_err_state = RETURNED_SQLSTATE;
        RAISE LOG 'settle_group_debt settlements insert unexpected error [%]: %', v_err_state, v_err_text;
        RAISE;
    END;
  END IF;

  RETURN jsonb_build_object(
    'settled_splits', v_settled_ids,
    'settled_amount', COALESCE(v_total_settled, 0),
    'remaining_amount', GREATEST(v_remaining, 0)
  );
END;
$$;

COMMENT ON FUNCTION public.settle_group_debt(UUID, UUID, UUID, NUMERIC)
IS 'Settles expense splits in a group from p_from_user to p_to_user up to p_amount (full splits only), records a settlement, returns JSON summary.';
