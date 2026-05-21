-- Correção de idempotência: inserir log primeiro, incrementar saldo somente se inseriu.
-- Isso torna a função intrinsecamente segura contra chamadas paralelas com o mesmo reference_id.
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
  v_inserted_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_admin() THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0001';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  -- Tenta inserir o log de transação. ON CONFLICT DO NOTHING garante idempotência.
  -- Apenas se o log foi inserido (id retornado) o saldo é incrementado.
  INSERT INTO credit_transactions (customer_id, amount, reason, reference_id)
  VALUES (p_customer_id, p_amount, p_reason, p_reference_id)
  ON CONFLICT (customer_id, reference_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO customer_credits (customer_id, balance)
    VALUES (p_customer_id, p_amount)
    ON CONFLICT (customer_id)
    DO UPDATE SET
      balance = customer_credits.balance + p_amount,
      updated_at = now();
  END IF;

  SELECT balance INTO v_new_balance
  FROM customer_credits
  WHERE customer_id = p_customer_id;

  RETURN COALESCE(v_new_balance, 0);
END;
$$;
