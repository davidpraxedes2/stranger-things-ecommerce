#!/bin/bash

# Script para importar usando Railway CLI (alternativa à URL pública)

echo "🚂 Importando banco de dados para Railway..."
echo ""

# Verificar se Railway CLI está instalado
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI não encontrado!"
    echo ""
    echo "Instale com:"
    echo "  npm i -g @railway/cli"
    echo "  # ou"
    echo "  brew install railway"
    echo ""
    echo "Depois rode: railway login"
    exit 1
fi

# Verificar se está linkado
if ! railway status &> /dev/null; then
    echo "⚠️  Projeto não linkado ao Railway"
    echo ""
    echo "Execute primeiro:"
    echo "  railway login"
    echo "  railway link"
    echo ""
    read -p "Deseja linkar agora? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway link
    else
        exit 1
    fi
fi

# Encontrar arquivo de export
EXPORT_FILE=$(ls -t database-export-*.sql 2>/dev/null | head -1)

if [ -z "$EXPORT_FILE" ]; then
    echo "❌ Arquivo database-export-*.sql não encontrado!"
    echo "Execute primeiro: node export-db.js"
    exit 1
fi

echo "📁 Arquivo: $EXPORT_FILE"
echo "📊 Tamanho: $(du -h "$EXPORT_FILE" | cut -f1)"
echo ""
echo "Importando para Railway..."
echo ""

# Importar
railway run psql < "$EXPORT_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Importação concluída!"
    echo ""
    echo "Verificando dados..."
    railway run psql -c "SELECT 
        (SELECT COUNT(*) FROM products) as produtos,
        (SELECT COUNT(*) FROM collections) as colecoes,
        (SELECT COUNT(*) FROM orders) as pedidos,
        (SELECT COUNT(*) FROM users) as usuarios;"
    echo ""
    echo "🎉 Banco de dados migrado com sucesso!"
else
    echo ""
    echo "❌ Erro na importação!"
    echo ""
    echo "Tente manualmente:"
    echo "  railway run psql < $EXPORT_FILE"
fi
