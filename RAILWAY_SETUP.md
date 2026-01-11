# 🚂 Railway Setup Guide - Stranger Things E-commerce

## Passo 1: Exportar Banco de Dados do Vercel

```bash
# Exportar dados do Vercel Postgres
node export-db.js
```

Isso vai criar um arquivo `database-export-XXXXX.sql` com todos os dados.

## Passo 2: Configurar Railway Postgres

1. No Railway, adicione um **Postgres Database** ao seu projeto
2. Após criar, copie a **DATABASE_URL** (Connection String)
3. Anote para usar no próximo passo

## Passo 3: Importar Dados para Railway

```bash
# Substituir pela sua DATABASE_URL do Railway
export DATABASE_URL="postgresql://postgres:senha@containers-us-west-XXX.railway.app:XXXX/railway"

# Importar o dump
psql $DATABASE_URL < database-export-XXXXX.sql
```

**OU** use o Railway CLI:

```bash
railway link
railway run psql < database-export-XXXXX.sql
```

## Passo 4: Configurar Variáveis de Ambiente no Railway

No painel do Railway, adicione estas variáveis:

### Obrigatórias:
```
DATABASE_URL=postgresql://... (já configurado automaticamente pelo Railway)
POSTGRES_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
```

### Opcionais (se você usa):
```
JWT_SECRET=seu_secret_aqui
ADMIN_USERNAME=admin
ADMIN_PASSWORD=sua_senha
BESTFY_API_KEY=sua_key (se usar gateway)
META_PIXEL_ID=seu_pixel (se usar Meta Pixel)
```

## Passo 5: Deploy

O Railway vai fazer deploy automaticamente quando você fizer push para o repositório conectado.

**OU** use o Railway CLI:

```bash
railway up
```

## Passo 6: Verificar

1. Acesse a URL do Railway (ex: `https://seu-app.up.railway.app`)
2. Teste:
   - Home page carrega produtos
   - Adicionar ao carrinho funciona
   - Admin panel funciona (`/admin.html`)

## Troubleshooting

### Produtos não aparecem?
```bash
# Conectar ao banco Railway
railway run psql

# Verificar produtos
SELECT COUNT(*) FROM products;
SELECT * FROM products LIMIT 5;
```

### Erro de conexão?
- Verifique se `DATABASE_URL` está configurado
- Verifique se o Postgres está rodando no Railway
- Veja os logs: `railway logs`

### Tabelas não existem?
```bash
# Rodar migrations manualmente
railway run node -e "require('./db-helper.js')"
```

## Diferenças Vercel vs Railway

| Feature | Vercel | Railway |
|---------|--------|---------|
| Postgres | Neon (pooling) | Railway Postgres |
| Variáveis | `POSTGRES_URL_NON_POOLING` | `DATABASE_URL` |
| Deploy | Git push | Git push ou CLI |
| Logs | Vercel Dashboard | `railway logs` |

## Comandos Úteis Railway

```bash
# Ver logs em tempo real
railway logs

# Conectar ao banco
railway run psql

# Rodar comandos
railway run node script.js

# Ver variáveis
railway variables

# Restart
railway restart
```

## Suporte

Se algo der errado:
1. Verifique os logs: `railway logs`
2. Verifique variáveis: `railway variables`
3. Teste conexão DB: `railway run psql -c "SELECT 1"`
