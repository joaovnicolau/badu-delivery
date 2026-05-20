# Configuração do Supabase

## Pré-requisitos

1. Criar um projeto em [supabase.com](https://supabase.com)
2. Copiar as credenciais em **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. Colar os valores em `.env.local`

## Aplicar as Migrations

Abrir o **SQL Editor** no dashboard do Supabase e executar os arquivos na ordem:

1. `supabase/migrations/20260520000001_schema.sql` — tabelas e enums
2. `supabase/migrations/20260520000002_rls.sql` — políticas de acesso
3. `supabase/migrations/20260520000003_rpc.sql` — funções de crédito

## Criar usuário admin

Após criar sua conta no site, executar no SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
```

## Gerar tipos TypeScript (opcional, requer Supabase CLI)

```bash
npm install -g supabase
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase gen types typescript --linked > src/types/database.ts
```

O `PROJECT_REF` está na URL do seu projeto: `https://supabase.com/dashboard/project/SEU_PROJECT_REF`
