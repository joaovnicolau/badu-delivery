-- RPC: debitar 1 crédito atomicamente (retorna saldo restante ou lança exceção)
CREATE OR REPLACE FUNCTION rpc_deduct_credit(
  p_customer_id UUID,
  p_order_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_updated INT;
  v_new_balance INT;
BEGIN
  -- Authorization: only the customer themselves or an admin
  IF auth.uid() != p_customer_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0001';
  END IF;

  UPDATE customer_credits
  SET balance = balance - 1, updated_at = now()
  WHERE customer_id = p_customer_id AND balance > 0;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'insufficient_credits'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT balance INTO v_new_balance
  FROM customer_credits
  WHERE customer_id = p_customer_id;

  INSERT INTO credit_transactions (customer_id, amount, reason, reference_id)
  VALUES (p_customer_id, -1, 'order_deduction', p_order_id);

  RETURN v_new_balance;
END;
$$;

-- RPC: adicionar créditos atomicamente (compra de pacote ou estorno)
CREATE OR REPLACE FUNCTION rpc_add_credit(
  p_customer_id UUID,
  p_amount INT,
  p_reason credit_reason,
  p_reference_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Authorization: only the customer themselves or an admin
  IF auth.uid() != p_customer_id AND NOT is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0001';
  END IF;

  -- Amount must be positive (negative values would poison the audit log)
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO customer_credits (customer_id, balance)
  VALUES (p_customer_id, p_amount)
  ON CONFLICT (customer_id)
  DO UPDATE SET
    balance = customer_credits.balance + p_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance
  FROM customer_credits
  WHERE customer_id = p_customer_id;

  INSERT INTO credit_transactions (customer_id, amount, reason, reference_id)
  VALUES (p_customer_id, p_amount, p_reason, p_reference_id);

  RETURN v_new_balance;
END;
$$;
