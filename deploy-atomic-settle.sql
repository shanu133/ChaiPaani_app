-- Execute this in Supabase SQL Editor to deploy the atomic settle function
-- Copy and paste the entire content into the SQL Editor and click "Run"

CREATE OR REPLACE FUNCTION settle_group_debt(
  p_group_id UUID,
  p_from_user UUID,
  p_to_user UUID,
  p_amount DECIMAL(10,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_remaining_amount DECIMAL(10,2);
  v_total_settled DECIMAL(10,2) := 0;
  v_split_record RECORD;
  v_settled_splits UUID[] := ARRAY[]::UUID[];
  v_rows_updated INTEGER;
  v_settlement_id UUID;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;

  IF v_current_user_id != p_from_user AND v_current_user_id != p_to_user THEN
    RAISE EXCEPTION 'User not authorized to settle this debt';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_from_user
  ) THEN
    RAISE EXCEPTION 'From user is not a member of this group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members WHERE group_id = p_group_id AND user_id = p_to_user
  ) THEN
    RAISE EXCEPTION 'To user is not a member of this group';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_group_id::text || p_from_user::text || p_to_user::text)
  );

  v_remaining_amount := p_amount;

  FOR v_split_record IN
    SELECT 
      es.id,
      es.amount,
      es.expense_id,
      e.payer_id,
      e.group_id
    FROM expense_splits es
    INNER JOIN expenses e ON e.id = es.expense_id
    WHERE es.user_id = p_from_user
      AND es.is_settled = false
      AND e.payer_id = p_to_user
      AND e.group_id = p_group_id
    ORDER BY es.created_at ASC
    FOR UPDATE OF es SKIP LOCKED
  LOOP
    EXIT WHEN v_remaining_amount <= 0;

    IF v_remaining_amount >= v_split_record.amount THEN
      UPDATE expense_splits
      SET 
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_record.id
        AND is_settled = false
        AND user_id = p_from_user;
      
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      
      IF v_rows_updated > 0 THEN
        v_settled_splits := array_append(v_settled_splits, v_split_record.id);
        v_remaining_amount := v_remaining_amount - v_split_record.amount;
        v_total_settled := v_total_settled + v_split_record.amount;
      END IF;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  IF v_total_settled > 0 THEN
    INSERT INTO settlements (group_id, payer_id, receiver_id, amount, description)
    VALUES (p_group_id, p_from_user, p_to_user, v_total_settled, 'Settle up')
    RETURNING id INTO v_settlement_id;
  END IF;

  RETURN jsonb_build_object(
    'settled_splits', v_settled_splits,
    'settled_amount', v_total_settled,
    'remaining_amount', v_remaining_amount,
    'settlement_id', v_settlement_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION settle_group_debt(UUID, UUID, UUID, DECIMAL) TO authenticated;
