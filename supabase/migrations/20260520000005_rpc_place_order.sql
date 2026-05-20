CREATE OR REPLACE FUNCTION rpc_place_order(
  p_customer_id UUID,
  p_product_id   UUID,
  p_notes        TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id       UUID;
  v_product_price  DECIMAL(10,2);
  v_product_active BOOLEAN;
  v_delivery_addr  TEXT;
  v_delivery_lat   FLOAT;
  v_delivery_lng   FLOAT;
  v_rows           INT;
BEGIN
  -- Autorização: somente o próprio cliente
  IF auth.uid() != p_customer_id THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0001';
  END IF;

  -- Verificar produto ativo
  SELECT price, active
  INTO v_product_price, v_product_active
  FROM products WHERE id = p_product_id;

  IF NOT FOUND OR NOT v_product_active THEN
    RAISE EXCEPTION 'product_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Snapshot do endereço no momento do pedido
  SELECT address, lat, lng
  INTO v_delivery_addr, v_delivery_lat, v_delivery_lng
  FROM profiles WHERE id = p_customer_id;

  -- Criar pedido
  INSERT INTO orders (
    customer_id, type, status, total, notes,
    delivery_address, delivery_lat, delivery_lng
  )
  VALUES (
    p_customer_id, 'fresh_credit', 'pending', 0, p_notes,
    v_delivery_addr, v_delivery_lat, v_delivery_lng
  )
  RETURNING id INTO v_order_id;

  -- Criar item do pedido (snapshot do preço)
  INSERT INTO order_items (order_id, product_id, quantity, unit_price)
  VALUES (v_order_id, p_product_id, 1, v_product_price);

  -- Debitar 1 crédito atomicamente
  UPDATE customer_credits
  SET balance = balance - 1, updated_at = now()
  WHERE customer_id = p_customer_id AND balance > 0;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE EXCEPTION 'insufficient_credits' USING ERRCODE = 'P0001';
    -- A transação inteira é revertida automaticamente pelo PostgreSQL
  END IF;

  -- Registrar movimentação de crédito
  INSERT INTO credit_transactions (customer_id, amount, reason, reference_id)
  VALUES (p_customer_id, -1, 'order_deduction', v_order_id);

  RETURN v_order_id;
END;
$$;
