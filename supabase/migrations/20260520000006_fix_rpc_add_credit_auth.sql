-- Restringir rpc_add_credit: somente service role (webhook) ou admin podem chamar.
-- auth.uid() é NULL para chamadas com service role key — isso é o que o webhook usa.
-- Clientes autenticados no browser não podem auto-creditar.

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
  -- Somente service role (auth.uid() = NULL) ou admin podem adicionar créditos.
  -- Clientes autenticados no browser (auth.uid() != NULL e não admin) são bloqueados.
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
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
