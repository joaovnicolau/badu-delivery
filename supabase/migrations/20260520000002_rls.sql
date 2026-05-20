-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE fresh_credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE frozen_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin());

-- categories: leitura pública, escrita admin
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_admin" ON categories FOR ALL USING (is_admin());

-- products: leitura pública (ativos), escrita admin
CREATE POLICY "products_read" ON products FOR SELECT
  USING (active = true OR is_admin());
CREATE POLICY "products_admin" ON products FOR ALL USING (is_admin());

-- fresh_credit_packs: leitura pública (ativos), escrita admin
CREATE POLICY "fresh_packs_read" ON fresh_credit_packs FOR SELECT
  USING (active = true OR is_admin());
CREATE POLICY "fresh_packs_admin" ON fresh_credit_packs FOR ALL USING (is_admin());

-- frozen_packs: leitura pública (ativos), escrita admin
CREATE POLICY "frozen_packs_read" ON frozen_packs FOR SELECT
  USING (active = true OR is_admin());
CREATE POLICY "frozen_packs_admin" ON frozen_packs FOR ALL USING (is_admin());

-- customer_credits: cliente vê o próprio, admin vê todos
CREATE POLICY "credits_select" ON customer_credits FOR SELECT
  USING (auth.uid() = customer_id OR is_admin());
CREATE POLICY "credits_admin" ON customer_credits FOR ALL USING (is_admin());

-- credit_transactions: cliente vê as próprias, admin vê todas
CREATE POLICY "credit_tx_select" ON credit_transactions FOR SELECT
  USING (auth.uid() = customer_id OR is_admin());
CREATE POLICY "credit_tx_admin" ON credit_transactions FOR ALL USING (is_admin());

-- orders: cliente vê os próprios, admin vê todos
CREATE POLICY "orders_select" ON orders FOR SELECT
  USING (auth.uid() = customer_id OR is_admin());
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (is_admin());

-- order_items: acesso via order do cliente ou admin
CREATE POLICY "order_items_select" ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND (customer_id = auth.uid() OR is_admin())
    )
  );
CREATE POLICY "order_items_insert" ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id AND customer_id = auth.uid()
    )
  );

-- payments: cliente vê os próprios, admin vê todos
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (auth.uid() = customer_id OR is_admin());
CREATE POLICY "payments_admin" ON payments FOR ALL USING (is_admin());

-- reminders: somente admin
CREATE POLICY "reminders_admin" ON reminders FOR ALL USING (is_admin());

-- whatsapp_templates: somente admin
CREATE POLICY "templates_admin" ON whatsapp_templates FOR ALL USING (is_admin());
