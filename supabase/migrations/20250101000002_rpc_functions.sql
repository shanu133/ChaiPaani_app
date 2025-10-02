-- Function to create expense with splits
CREATE OR REPLACE FUNCTION create_expense_with_splits(
  p_group_id UUID,
  p_description TEXT,
  p_amount DECIMAL(10,2),
  p_category TEXT DEFAULT 'general',
  p_notes TEXT DEFAULT NULL,
  p_splits JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expense_id UUID;
  v_split_record JSONB;
  v_total_split_amount DECIMAL(10,2) := 0;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Calculate total split amount
  FOR v_split_record IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    v_total_split_amount := v_total_split_amount + (v_split_record->>'amount')::DECIMAL(10,2);
  END LOOP;

  -- Verify split amounts add up to expense amount (allow small rounding differences)
  IF ABS(v_total_split_amount - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'Split amounts must equal expense amount. Expected: %, Got: %', p_amount, v_total_split_amount;
  END IF;

  -- Create expense
  INSERT INTO expenses (group_id, payer_id, description, amount, category, notes)
  VALUES (p_group_id, v_user_id, p_description, p_amount, p_category, p_notes)
  RETURNING id INTO v_expense_id;

  -- Create expense splits
  FOR v_split_record IN SELECT * FROM jsonb_array_elements(p_splits)
  LOOP
    INSERT INTO expense_splits (expense_id, user_id, amount)
    VALUES (
      v_expense_id,
      (v_split_record->>'user_id')::UUID,
      (v_split_record->>'amount')::DECIMAL(10,2)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'expense_id', v_expense_id,
    'message', 'Expense created successfully'
  );
END;
$$;

-- Function to get user balance in a specific group
CREATE OR REPLACE FUNCTION get_user_balance_in_group(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  amount_owed DECIMAL(10,2),
  amount_owes DECIMAL(10,2),
  net_balance DECIMAL(10,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  RETURN QUERY
  WITH user_expenses AS (
    -- Expenses paid by user
    SELECT
      es.user_id,
      SUM(es.amount) as amount_owed_to_user
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND e.payer_id = v_current_user_id
      AND es.user_id != v_current_user_id
      AND es.is_settled = false
    GROUP BY es.user_id
  ),
  user_payments AS (
    -- Expenses user needs to pay
    SELECT
      e.payer_id,
      SUM(es.amount) as amount_user_owes
    FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE e.group_id = p_group_id
      AND es.user_id = v_current_user_id
      AND e.payer_id != v_current_user_id
      AND es.is_settled = false
    GROUP BY e.payer_id
  ),
  all_group_members AS (
    SELECT
      gm.user_id,
      p.full_name
    FROM group_members gm
    JOIN profiles p ON p.id = gm.user_id
    WHERE gm.group_id = p_group_id
  )
  SELECT
    agm.user_id,
    agm.full_name,
    COALESCE(ue.amount_owed_to_user, 0) as amount_owed,
    COALESCE(up.amount_user_owes, 0) as amount_owes,
    COALESCE(ue.amount_owed_to_user, 0) - COALESCE(up.amount_user_owes, 0) as net_balance
  FROM all_group_members agm
  LEFT JOIN user_expenses ue ON ue.user_id = agm.user_id
  LEFT JOIN user_payments up ON up.payer_id = agm.user_id
  WHERE agm.user_id != v_current_user_id
  ORDER BY agm.full_name;
END;
$$;

-- Function to settle expense splits
CREATE OR REPLACE FUNCTION settle_expense_split(
  p_expense_split_id UUID,
  p_settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_expense_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get expense ID and verify ownership
  SELECT expense_id INTO v_expense_id
  FROM expense_splits
  WHERE id = p_expense_split_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense split not found';
  END IF;

  -- Verify user can settle this split (either the payer or the one who owes)
  IF NOT EXISTS (
    SELECT 1 FROM expense_splits es
    JOIN expenses e ON e.id = es.expense_id
    WHERE es.id = p_expense_split_id
    AND (e.payer_id = v_user_id OR es.user_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'User cannot settle this expense split';
  END IF;

  -- Update the expense split
  UPDATE expense_splits
  SET is_settled = true, settled_at = p_settled_at
  WHERE id = p_expense_split_id;

  RETURN jsonb_build_object(
    'message', 'Expense split settled successfully',
    'expense_split_id', p_expense_split_id
  );
END;
$$;

-- Function to get group summary
CREATE OR REPLACE FUNCTION get_group_summary(p_group_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is member of the group
  IF NOT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  SELECT jsonb_build_object(
    'total_expenses', COALESCE(SUM(e.amount), 0),
    'expense_count', COUNT(DISTINCT e.id),
    'member_count', COUNT(DISTINCT gm.user_id),
    'unsettled_splits', COUNT(es.id) FILTER (WHERE es.is_settled = false),
    'total_unsettled_amount', COALESCE(SUM(es.amount) FILTER (WHERE es.is_settled = false), 0)
  ) INTO v_result
  FROM groups g
  LEFT JOIN expenses e ON e.group_id = g.id
  LEFT JOIN group_members gm ON gm.group_id = g.id
  LEFT JOIN expense_splits es ON es.expense_id = e.id
  WHERE g.id = p_group_id;

  RETURN v_result;
END;
$$;