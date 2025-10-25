-- Migration: Add expense notifications and email triggers
-- Date: 2025-01-26
-- Purpose: Send in-app and email notifications when expenses are created

-- 1) Function to create in-app notifications when an expense is added
CREATE OR REPLACE FUNCTION public.create_expense_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payer_name TEXT;
  v_group_name TEXT;
  v_split_record RECORD;
  v_split_amount DECIMAL;
BEGIN
  -- Get payer display name
  SELECT COALESCE(display_name, full_name, split_part(email, '@', 1))
  INTO v_payer_name
  FROM public.profiles
  WHERE id = NEW.payer_id;

  -- Get group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = NEW.group_id;

  -- Create notifications for all users with expense splits (except the payer)
  FOR v_split_record IN
    SELECT es.user_id, es.amount
    FROM public.expense_splits es
    WHERE es.expense_id = NEW.id
      AND es.user_id != NEW.payer_id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      is_read,
      created_at,
      metadata
    )
    VALUES (
      v_split_record.user_id,
      'expense_added',
      'New Expense Added',
      format('%s paid ₹%s for "%s". You owe ₹%s',
        v_payer_name,
        NEW.amount,
        NEW.description,
        v_split_record.amount
      ),
      false,
      NOW(),
      jsonb_build_object(
        'expense_id', NEW.id,
        'group_id', NEW.group_id,
        'group_name', v_group_name,
        'amount', v_split_record.amount,
        'total_amount', NEW.amount,
        'payer_id', NEW.payer_id,
        'payer_name', v_payer_name,
        'description', NEW.description,
        'category', NEW.category
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 2) Create trigger to fire after expense and splits are inserted
-- Note: This will fire after the expense is created
DROP TRIGGER IF EXISTS create_expense_notifications_trigger ON public.expenses;
CREATE TRIGGER create_expense_notifications_trigger
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_expense_notifications();

-- 3) Function to create notification when an expense split is inserted
-- This handles the case where splits might be added after the expense
CREATE OR REPLACE FUNCTION public.notify_expense_split()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payer_id UUID;
  v_payer_name TEXT;
  v_group_id UUID;
  v_group_name TEXT;
  v_expense_description TEXT;
  v_expense_amount DECIMAL;
  v_expense_category TEXT;
BEGIN
  -- Only create notification if this is a new split (not the payer's own split)
  -- and only if a notification hasn't been created yet
  SELECT payer_id, group_id, description, amount, category
  INTO v_payer_id, v_group_id, v_expense_description, v_expense_amount, v_expense_category
  FROM public.expenses
  WHERE id = NEW.expense_id;

  -- Skip if the split is for the payer (they don't need to be notified of their own expense)
  IF NEW.user_id = v_payer_id THEN
    RETURN NEW;
  END IF;

  -- Check if notification already exists for this expense and user
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = NEW.user_id
      AND type = 'expense_added'
      AND metadata->>'expense_id' = NEW.expense_id::text
  ) THEN
    RETURN NEW;
  END IF;

  -- Get payer name
  SELECT COALESCE(display_name, full_name, split_part(email, '@', 1))
  INTO v_payer_name
  FROM public.profiles
  WHERE id = v_payer_id;

  -- Get group name
  SELECT name INTO v_group_name
  FROM public.groups
  WHERE id = v_group_id;

  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    is_read,
    created_at,
    metadata
  )
  VALUES (
    NEW.user_id,
    'expense_added',
    'New Expense Added',
    format('%s paid ₹%s for "%s". You owe ₹%s',
      v_payer_name,
      v_expense_amount,
      v_expense_description,
      NEW.amount
    ),
    false,
    NOW(),
    jsonb_build_object(
      'expense_id', NEW.expense_id,
      'group_id', v_group_id,
      'group_name', v_group_name,
      'amount', NEW.amount,
      'total_amount', v_expense_amount,
      'payer_id', v_payer_id,
      'payer_name', v_payer_name,
      'description', v_expense_description,
      'category', v_expense_category
    )
  );

  RETURN NEW;
END;
$$;

-- Create trigger for expense splits
DROP TRIGGER IF EXISTS notify_expense_split_trigger ON public.expense_splits;
CREATE TRIGGER notify_expense_split_trigger
  AFTER INSERT ON public.expense_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_expense_split();

-- 4) Add comment for documentation
COMMENT ON FUNCTION public.create_expense_notifications() IS 
'Creates in-app notifications for all group members when a new expense is added (except the payer)';

COMMENT ON FUNCTION public.notify_expense_split() IS 
'Creates in-app notifications when expense splits are added, handles cases where splits are added after expense creation';
