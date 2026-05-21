-- Garantir unicidade de reference_id por cliente em credit_transactions.
-- Isso impede double-credit no banco mesmo se a aplicação falhar em garantir idempotência.
ALTER TABLE credit_transactions
  ADD CONSTRAINT credit_tx_reference_unique
  UNIQUE (customer_id, reference_id);

-- Atualizar rpc_add_credit para usar ON CONFLICT DO NOTHING na inserção da transação,
-- evitando erro caso um segundo webhook tente inserir o mesmo reference_id.
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
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0001';
  END IF;

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

  -- ON CONFLICT DO NOTHING: segunda chamada com mesmo reference_id não duplica
  INSERT INTO credit_transactions (customer_id, amount, reason, reference_id)
  VALUES (p_customer_id, p_amount, p_reason, p_reference_id)
  ON CONFLICT (customer_id, reference_id) DO NOTHING;

  RETURN v_new_balance;
END;
$$;
