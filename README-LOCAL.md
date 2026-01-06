# 🚀 Como Rodar o Projeto Localmente

## Início Rápido

### Opção 1: Usar o arquivo .bat (Windows)
1. Clique duas vezes em `start-local.bat`
2. O servidor iniciará em http://localhost:3000

### Opção 2: Usar npm
```bash
npm run local
```
ou
```bash
npm run dev
```

### Opção 3: Node direto
```bash
node dev-server.js
```
ou
```bash
node server.js
```

## 📋 Pré-requisitos

1. Node.js instalado (versão 14 ou superior)
2. Dependências instaladas:
```bash
npm install
```

## 🔧 Funcionalidades Locais

- ✅ SQLite como banco de dados (banco local `database.sqlite`)
- ✅ Todas as rotas da API funcionando
- ✅ Carrinho de compras funcional
- ✅ Página de produtos
- ✅ Admin panel em `/admin.html`

## 📁 Estrutura

- `server.js` - Servidor completo com SQLite (desenvolvimento local)
- `server-simple.js` - Servidor otimizado para Vercel (PostgreSQL)
- `dev-server.js` - Wrapper para desenvolvimento local
- `database.sqlite` - Banco de dados SQLite (criado automaticamente)

## 🛠️ Desenvolvimento

1. Faça suas edições nos arquivos
2. Se estiver usando `nodemon` (`npm run dev`), o servidor reinicia automaticamente
3. Caso contrário, pare o servidor (Ctrl+C) e inicie novamente

## 🌐 URLs Locais

- Página principal: http://localhost:3000
- Admin panel: http://localhost:3000/admin.html
- API produtos: http://localhost:3000/api/products
- API carrinho: http://localhost:3000/api/cart

## 💡 Dicas

- O banco SQLite é criado automaticamente na primeira execução
- Para resetar o banco, delete o arquivo `database.sqlite`
- Os logs aparecem no terminal onde o servidor está rodando

