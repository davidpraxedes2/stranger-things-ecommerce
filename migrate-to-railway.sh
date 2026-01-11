#!/bin/bash

# Script para exportar banco Vercel e importar no Railway
# Usage: ./migrate-to-railway.sh

echo "🚂 Migração Vercel → Railway"
echo "=============================="
echo ""

# Passo 1: Exportar Vercel
echo "📊 Passo 1: Exportar banco do Vercel"
echo "Cole a DATABASE_URL do Vercel Postgres:"
read -r VERCEL_DB_URL

export POSTGRES_URL="$VERCEL_DB_URL"
echo "Exportando..."
node export-db.js

if [ $? -ne 0 ]; then
    echo "❌ Erro ao exportar. Verifique a URL do banco."
    exit 1
fi

# Encontrar o arquivo exportado
EXPORT_FILE=$(ls -t database-export-*.sql 2>/dev/null | head -1)

if [ -z "$EXPORT_FILE" ]; then
    echo "❌ Arquivo de export não encontrado!"
    exit 1
fi

echo "✅ Exportado para: $EXPORT_FILE"
echo ""

# Passo 2: Importar Railway
echo "📥 Passo 2: Importar para Railway"
echo "Cole a DATABASE_URL do Railway Postgres:"
read -r RAILWAY_DB_URL

echo "Importando $EXPORT_FILE..."
psql "$RAILWAY_DB_URL" < "$EXPORT_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Erro ao importar. Verifique:"
    echo "  1. psql está instalado? (brew install postgresql)"
    echo "  2. DATABASE_URL do Railway está correta?"
    echo ""
    echo "Alternativa: Use o Railway CLI:"
    echo "  railway link"
    echo "  railway run psql < $EXPORT_FILE"
    exit 1
fi

echo ""
echo "✅ Migração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure as variáveis de ambiente no Railway"
echo "2. Faça deploy: git push ou railway up"
echo "3. Teste o site"
echo ""
echo "Veja RAILWAY_SETUP.md para mais detalhes"
