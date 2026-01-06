# 🗄️ Configurar PostgreSQL na Vercel

## Passo a Passo

### 1. Instalar Vercel Postgres no projeto

Na Vercel Dashboard:
1. Vá para o seu projeto
2. Clique em **Storage** (ou **Data**)
3. Clique em **Create Database**
4. Selecione **Postgres**
5. Dê um nome (ex: `stranger-things-db`)
6. Selecione o plano (Free tier está disponível)
7. Clique em **Create**

### 2. Conectar ao Projeto

A Vercel automaticamente adiciona as variáveis de ambiente:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`

### 3. Deploy

Faça o deploy novamente. O código já está preparado para:
- Usar **PostgreSQL** se as variáveis de ambiente estiverem presentes
- Usar **SQLite** localmente se não estiverem

### 4. Verificar

Após o deploy, os produtos de exemplo serão criados automaticamente quando o banco estiver vazio.

## ✅ Pronto!

O projeto agora usa PostgreSQL na Vercel e SQLite localmente, automaticamente!

