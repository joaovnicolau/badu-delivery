-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('customer', 'admin');
CREATE TYPE product_type AS ENUM ('fresh', 'frozen');
CREATE TYPE order_type AS ENUM ('single', 'fresh_credit', 'frozen_pack');
CREATE TYPE order_status AS ENUM ('pending', 'accepted', 'rejected', 'dispatched');
CREATE TYPE print_status AS ENUM ('pending', 'printed', 'failed');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'expired');
CREATE TYPE credit_reason AS ENUM ('purchase', 'order_deduction', 'order_refund');
CREATE TYPE whatsapp_trigger AS ENUM ('accepted', 'rejected', 'dispatched');

-- Profiles (complementa auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  address TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  zip TEXT,
  lat FLOAT,
  lng FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  photo_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  type product_type NOT NULL DEFAULT 'fresh',
  active BOOLEAN NOT NULL DEFAULT true
);

-- Pacotes de crédito (marmitas frescas antecipadas)
CREATE TABLE fresh_credit_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  credits INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Pacotes de marmitas congeladas
CREATE TABLE frozen_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Saldo de créditos (cache denormalizado)
CREATE TABLE customer_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

-- Histórico auditável de créditos
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason credit_reason NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  delivery_address TEXT,
  delivery_lat FLOAT,
  delivery_lng FLOAT,
  print_status print_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ
);

-- Itens do pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL
);

-- Pagamentos
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  fresh_credit_pack_id UUID REFERENCES fresh_credit_packs(id),
  frozen_pack_id UUID REFERENCES frozen_packs(id),
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  pagarme_id TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT payment_single_target CHECK (
    (order_id IS NOT NULL)::int +
    (fresh_credit_pack_id IS NOT NULL)::int +
    (frozen_pack_id IS NOT NULL)::int = 1
  )
);

-- Lembretes de CRM
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Templates de WhatsApp
CREATE TABLE whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trigger whatsapp_trigger NOT NULL UNIQUE,
  message TEXT NOT NULL
);

-- Templates padrão
INSERT INTO whatsapp_templates (trigger, message) VALUES
  ('accepted', 'Olá {{nome}}! Seu pedido foi aceito e está sendo preparado. 🍱'),
  ('rejected', 'Olá {{nome}}, infelizmente não conseguimos atender seu pedido agora. Entre em contato para mais informações.'),
  ('dispatched', 'Olá {{nome}}! Seu pedido saiu para entrega. Em breve estará com você! 🚀');

-- Trigger: criar profile ao criar usuário no auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Trigger: criar customer_credits ao criar profile
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO customer_credits (customer_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (customer_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();
