#!/bin/bash

echo "🔄 Reiniciando servidor..."

# Encontrar e matar processo na porta 3000
PID=$(lsof -ti:3000 | head -1)

if [ ! -z "$PID" ]; then
    echo "⏹️  Parando servidor antigo (PID: $PID)..."
    kill $PID
    sleep 2
fi

# Iniciar novo servidor
echo "🚀 Iniciando servidor atualizado..."
node server-json.js
