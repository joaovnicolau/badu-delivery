-- Clientes podem criar seus próprios registros de pagamento.
-- Sem esta policy, todo fluxo de compra Pix retorna 500.
CREATE POLICY "payments_insert_owner"
  ON payments
  FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
