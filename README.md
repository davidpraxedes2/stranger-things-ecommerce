# 🎬 Stranger Things E-commerce

E-commerce completo e profissional inspirado em Stranger Things com sistema de pagamentos, admin dashboard avançado, e experiência de compra moderna.

## ✨ Funcionalidades Principais

### 🛍️ **Loja Virtual**
- ✅ Catálogo de produtos com filtros e busca
- ✅ Páginas de produto com galeria de imagens
- ✅ Sistema de coleções (Grid/Carrossel)
- ✅ Carrinho de compras com backend
- ✅ Checkout completo com validação de CEP
- ✅ Loading screens temáticos

### 💳 **Sistema de Pagamento**
- ✅ **PIX**: QR Code gerado automaticamente + Código copia e cola
- ✅ **Cartão de Crédito**: Processamento com validação
- ✅ Timer de 15min para pagamento PIX
- ✅ Páginas de sucesso personalizadas (confetes para cartão!)
- ✅ Verificação automática de pagamento

### 🎨 **Admin Dashboard Profissional**
- ✅ Gestão completa de produtos
- ✅ Gerenciamento de coleções (criar, editar, ordenar)
- ✅ Visualização de pedidos em tempo real
- ✅ Seletor de visualização padrão (Grid/Carrossel)
- ✅ Analytics e estatísticas
- ✅ Sistema de autenticação JWT

### 📱 **Experiência do Usuário**
- ✅ Design mobile-first totalmente responsivo
- ✅ Animações suaves e profissionais
- ✅ Loading spinners temáticos Stranger Things
- ✅ Notificações toast elegantes
- ✅ Slider de fotos na home page
- ✅ Busca em tempo real

## 📦 Tecnologias

| Categoria | Tecnologia |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (better-sqlite3) |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Pagamentos** | API REST customizada (simulado) |
| **Deploy** | Vercel-ready |
| **Fonts** | Google Fonts (Teko) |
| **Icons** | SVG inline |

## 🔧 Instalação Local

1. **Clone o repositório:**
```bash
git clone https://github.com/davidpraxedes2/stranger-things-ecommerce.git
cd stranger-things-ecommerce
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Inicie o servidor:**
```bash
npm start
```

4. **Acesse:**
- **Loja:** http://localhost:3000
- **Admin:** http://localhost:3000/admin.html
  - Usuário: `admin`
  - Senha: `admin123`

## 🌐 Deploy na Vercel

O projeto está 100% configurado para deploy automático na Vercel.

### Passo a Passo:

1. Conecte seu repositório GitHub na Vercel
2. Vercel detecta automaticamente o projeto Node.js
3. Configure as seguintes variáveis (opcional):
   - `JWT_SECRET` - chave secreta para tokens
   - `NODE_ENV` - production
4. Deploy! 🚀

**Build Settings:**
- Build Command: `npm install`
- Output Directory: `.` (raiz)
- Install Command: `npm install`

## 📂 Estrutura do Projeto

```
stranger-things-ecommerce/
├── public/
│   └── admin.html          # Painel administrativo
├── server.js               # Servidor Express + API
├── index.html              # Página inicial da loja
├── product.html            # Página de produto
├── checkout.html           # Página de checkout
├── order-success-card.html # Sucesso (Cartão)
├── order-success-pix.html  # Pagamento PIX
├── collection.html         # Página de coleção
├── styles.css              # Estilos globais
├── script.js               # JavaScript principal
├── checkout.js             # Lógica do checkout
├── product-cart.js         # Lógica do carrinho
├── admin-app.js            # App do admin
└── package.json            # Dependências

```

## 🎯 Rotas da API

### Públicas
- `GET /api/products` - Listar produtos
- `GET /api/products/:id` - Detalhes do produto
- `GET /api/collections` - Listar coleções
- `POST /api/orders` - Criar pedido
- `POST /api/payments/process` - Processar pagamento
- `GET/POST/PUT/DELETE /api/cart` - Gerenciar carrinho

### Admin (requer autenticação)
- `POST /api/admin/login` - Login
- `GET /api/admin/orders` - Listar pedidos
- `PUT /api/admin/orders/:id/status` - Atualizar status
- `GET/POST/PUT/DELETE /api/admin/products` - CRUD produtos
- `GET/POST/PUT/DELETE /api/admin/collections` - CRUD coleções
- `GET /api/admin/stats` - Estatísticas

## 🎨 Temas e Cores

```css
--netflix-red: #E50914
--dark-bg: #000000
--dark-gray: #1a1a1a
--pix-green: #00D1C1
--text-white: #FFFFFF
```

## 🔒 Segurança

- ✅ Autenticação JWT para admin
- ✅ Validação de inputs no frontend e backend
- ✅ Proteção contra SQL injection (prepared statements)
- ✅ CORS configurado
- ✅ Sanitização de dados

## 📱 Responsividade

- ✅ Mobile First (320px+)
- ✅ Tablet (768px+)
- ✅ Desktop (1024px+)
- ✅ Wide Screen (1440px+)

## 🚀 Próximas Features

- [ ] Integração com gateway de pagamento real (Stripe/PagSeguro)
- [ ] Sistema de cupons de desconto
- [ ] Avaliações de produtos
- [ ] Wishlist
- [ ] Email de confirmação automático
- [ ] Rastreamento de pedidos
- [ ] Multi-idiomas

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👤 Autor

**David Praxedes**
- GitHub: [@davidpraxedes2](https://github.com/davidpraxedes2)

---

⭐ **Se gostou do projeto, deixe uma estrela!** ⭐

- O banco de dados SQLite será recriado a cada deploy (usar banco externo em produção)

## 📝 Estrutura do Projeto

```
├── public/          # Arquivos estáticos e admin
├── server.js        # Servidor Express principal
├── index.html       # Página inicial
├── product.html     # Página de produto
├── checkout.html    # Página de checkout
├── styles.css       # Estilos principais
├── script.js        # JavaScript da loja
└── package.json     # Dependências
```

## 🎨 Recursos

- Design responsivo
- Sistema de carrinho com sessão
- Gestão completa de produtos no admin
- Gestão de clientes
- Sistema de pedidos
- Galeria de imagens em produtos
- Seletor de variantes (tamanhos)

## 📄 Licença

Este projeto é de uso pessoal/educacional.

---

Desenvolvido com ❤️ inspirado em Stranger Things
