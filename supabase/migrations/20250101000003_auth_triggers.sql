-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile when user metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    avatar_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', avatar_url),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger to update profile on user metadata changes
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Function to validate expense splits
CREATE OR REPLACE FUNCTION validate_expense_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_splits DECIMAL(10,2);
  v_expense_amount DECIMAL(10,2);
BEGIN
  -- Get the expense amount
  SELECT amount INTO v_expense_amount
  FROM expenses
  WHERE id = NEW.expense_id;

  -- Calculate total splits for this expense
  SELECT COALESCE(SUM(amount), 0) INTO v_total_splits
  FROM expense_splits
  WHERE expense_id = NEW.expense_id;

  -- Check if splits exceed expense amount
  IF v_total_splits > v_expense_amount THEN
    RAISE EXCEPTION 'Total expense splits (%) cannot exceed expense amount (%)', v_total_splits, v_expense_amount;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to validate expense splits
CREATE OR REPLACE TRIGGER validate_expense_splits_trigger
  AFTER INSERT OR UPDATE ON expense_splits
  FOR EACH ROW EXECUTE FUNCTION validate_expense_splits();

-- Function to update group updated_at when expenses are added
CREATE OR REPLACE FUNCTION update_group_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE groups
  SET updated_at = NOW()
  WHERE id = NEW.group_id;
  RETURN NEW;
END;
$$;

-- Trigger to update group timestamp when expenses are added
CREATE OR REPLACE TRIGGER update_group_on_expense
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_group_updated_at();

-- Function to prevent self-settlements
CREATE OR REPLACE FUNCTION prevent_self_settlement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payer_id = NEW.receiver_id THEN
    RAISE EXCEPTION 'Cannot create settlement with same payer and receiver';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to prevent self-settlements
CREATE OR REPLACE TRIGGER prevent_self_settlement_trigger
  BEFORE INSERT OR UPDATE ON settlements
  FOR EACH ROW EXECUTE FUNCTION prevent_self_settlement();