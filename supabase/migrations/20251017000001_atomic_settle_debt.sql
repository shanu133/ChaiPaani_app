-- Atomic settle_group_debt function with advisory locks and optimistic locking
-- This function prevents race conditions when settling debts by:
-- 1. Using advisory locks to prevent concurrent settlements
-- 2. Validating expense splits with optimistic locking (checking is_settled = false)
-- 3. Running all operations in a single transaction
-- 4. Tracking which splits were settled atomically

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
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Validate amount is positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Settlement amount must be positive';
  END IF;

  -- Verify current user is authorized (must be either the payer or receiver)
  IF v_current_user_id != p_from_user AND v_current_user_id != p_to_user THEN
    RAISE EXCEPTION 'User not authorized to settle this debt';
  END IF;

  -- Verify both users are members of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_from_user
  ) THEN
    RAISE EXCEPTION 'From user is not a member of this group';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = p_to_user
  ) THEN
    RAISE EXCEPTION 'To user is not a member of this group';
  END IF;

  -- Acquire advisory lock to prevent concurrent settlements between these users
  -- Lock ID is based on group + from_user + to_user to allow parallel settlements for different user pairs
  PERFORM pg_advisory_xact_lock(
    hashtext(p_group_id::text || p_from_user::text || p_to_user::text)
  );

  -- Initialize remaining amount
  v_remaining_amount := p_amount;

  -- Find and settle expense splits atomically
  -- Uses a cursor approach to process splits one by one with optimistic locking
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
      AND es.is_settled = false  -- Optimistic lock: only unsettled splits
      AND e.payer_id = p_to_user
      AND e.group_id = p_group_id
    ORDER BY es.created_at ASC
    FOR UPDATE OF es SKIP LOCKED  -- Skip splits locked by other transactions
  LOOP
    -- Stop if we've settled enough
    EXIT WHEN v_remaining_amount <= 0;

    -- Only settle full splits to avoid partial settlements
    IF v_remaining_amount >= v_split_record.amount THEN
      -- Update split with optimistic locking (check is_settled = false in WHERE)
      UPDATE expense_splits
      SET 
        is_settled = true,
        settled_at = NOW()
      WHERE id = v_split_record.id
        AND is_settled = false  -- Optimistic lock: ensure still unsettled
        AND user_id = p_from_user  -- Double-check ownership
      ;
      
      -- Check if update succeeded (row wasn't modified by another transaction)
      GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
      
      IF v_rows_updated > 0 THEN
        -- Successfully settled this split
        v_settled_splits := array_append(v_settled_splits, v_split_record.id);
        v_remaining_amount := v_remaining_amount - v_split_record.amount;
        v_total_settled := v_total_settled + v_split_record.amount;
      END IF;
      -- If update failed (v_rows_updated = 0), skip this split (already settled by another transaction)
    ELSE
      -- Can't settle this split fully, stop here
      EXIT;
    END IF;
  END LOOP;

  -- Only create settlement record if we actually settled something
  IF v_total_settled > 0 THEN
    INSERT INTO settlements (group_id, payer_id, receiver_id, amount, description)
    VALUES (
      p_group_id,
      p_from_user,
      p_to_user,
      v_total_settled,
      'Settle up'
    )
    RETURNING id INTO v_settlement_id;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'settled_splits', v_settled_splits,
    'settled_amount', v_total_settled,
    'remaining_amount', v_remaining_amount,
    'settlement_id', v_settlement_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION settle_group_debt(UUID, UUID, UUID, DECIMAL) TO authenticated;

COMMENT ON FUNCTION settle_group_debt IS 
'Atomically settle debt between two users in a group. Uses advisory locks and optimistic locking to prevent race conditions. Only settles complete expense splits (no partial settlements).';
