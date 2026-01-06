# Stranger Things E-commerce

E-commerce completo com tema Stranger Things, incluindo backend Node.js, banco de dados SQLite e painel administrativo.

## 🚀 Funcionalidades

### Frontend
- Design mobile-first responsivo
- Tema Stranger Things com efeitos neon
- Carrinho de compras (LocalStorage)
- Página de produto individual
- Menu mobile com drawer lateral
- Integração com API backend

### Backend
- API REST completa (Node.js + Express)
- Banco de dados SQLite
- Autenticação JWT para admin
- Upload de imagens para produtos
- CRUD completo de produtos
- Sistema de pedidos

### Painel Admin
- Dashboard com estatísticas
- Gerenciamento de produtos (criar, editar, deletar)
- Gerenciamento de pedidos
- Upload de imagens
- Autenticação segura

## 📦 Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor:
```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

3. Acesse:
- **Frontend:** http://localhost:3000
- **Painel Admin:** http://localhost:3000/admin.html

## 🔐 Credenciais Padrão do Admin

- **Usuário:** admin
- **Senha:** admin123

⚠️ **Importante:** Altere a senha padrão em produção!

## 📁 Estrutura do Projeto

```
.
├── server.js              # Servidor Express
├── package.json           # Dependências
├── database.sqlite        # Banco de dados (gerado automaticamente)
├── public/
│   ├── index.html         # Página inicial
│   ├── product.html       # Página de produto
│   ├── admin.html         # Painel admin
│   ├── admin.js           # JS do painel admin
│   ├── admin.css          # CSS do painel admin
│   ├── styles.css         # CSS principal
│   ├── script.js          # JS principal
│   └── uploads/           # Uploads de imagens
│       └── products/
```

## 🛠️ API Endpoints

### Públicos
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Buscar produto por ID
- `POST /api/orders` - Criar pedido

### Admin (requer autenticação)
- `POST /api/auth/login` - Login
- `GET /api/admin/stats` - Estatísticas
- `GET /api/admin/products` - Listar todos os produtos
- `POST /api/admin/products` - Criar produto
- `PUT /api/admin/products/:id` - Atualizar produto
- `DELETE /api/admin/products/:id` - Deletar produto
- `GET /api/admin/orders` - Listar pedidos
- `PUT /api/admin/orders/:id` - Atualizar status do pedido

## 🎨 Tecnologias

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express
- **Banco de Dados:** SQLite
- **Autenticação:** JWT
- **Upload:** Multer

## 📝 Notas

- O banco de dados é criado automaticamente na primeira execução
- Imagens são salvas em `public/uploads/products/`
- O carrinho usa LocalStorage do navegador
- Em produção, configure variáveis de ambiente (JWT_SECRET, etc.)
