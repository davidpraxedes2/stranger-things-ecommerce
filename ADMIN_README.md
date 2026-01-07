# Admin Dashboard - Stranger Things Store

## 🎯 Visão Geral

Painel administrativo completo estilo Shopify para gerenciar o e-commerce Stranger Things Store. Sistema de SPA (Single Page Application) com autenticação, drag-and-drop para organizar coleções, e CRUD completo de produtos.

## 🚀 Como Acessar

1. **Iniciar o servidor:**
   ```bash
   node server-json.js
   ```

2. **Acessar o Admin Dashboard:**
   ```
   http://localhost:3000/admin.html
   ```

3. **Credenciais padrão:**
   - **Usuário:** `admin`
   - **Senha:** `admin123`

## 📦 Estrutura do Projeto

```
├── admin.html              # Página principal do dashboard
├── admin-app.js            # JavaScript com toda lógica do SPA
├── admin-styles.css        # Estilos completos dark theme Netflix
├── server-json.js          # Backend com endpoints de admin
├── collections.json        # Persistência de coleções
└── product-collections.json # Relação N:N produto-coleção
```

## 🎨 Funcionalidades Implementadas

### ✅ 1. Dashboard (Overview)
- **KPIs em tempo real:**
  - Vendas do dia (R$)
  - Total de pedidos
  - Usuários online agora (simulado com refresh a cada 5min)
  - Total de produtos no catálogo
- **Feed de atividades:**
  - Novos pedidos
  - Produtos adicionados ao carrinho
  - Alertas de estoque baixo

**Endpoint:** `GET /api/admin/stats`

---

### ✅ 2. Gestão de Vitrine
- **Drag & Drop com SortableJS:**
  - Arrastar coleções para reordenar exibição na home
  - Atualização automática do `sort_order` ao soltar
- **Toggle de visibilidade:**
  - Ativar/desativar coleções com um clique
  - Ícones visuais: 👁️ Visível / 🚫 Oculta
- **Contador de produtos:**
  - Mostra quantos produtos cada coleção possui

**Endpoints:**
- `GET /api/admin/collections` - listar todas
- `PUT /api/admin/collections/reorder` - atualizar ordem
- `PUT /api/admin/collections/:id` - toggle ativo/inativo

---

### ✅ 3. Produtos
- **Tabela completa com:**
  - Thumbnail da imagem
  - Nome, preço, estoque
  - Tags de coleções
  - Ações: editar ✏️, deletar 🗑️
- **Filtros:**
  - Busca por nome (live search)
  - Filtro por coleção (dropdown)
- **CRUD básico:**
  - ✏️ Editar produto (modal em desenvolvimento)
  - 🗑️ Deletar produto (confirmação)

**Endpoints:**
- `GET /api/products` - listar produtos
- `POST /api/admin/products` - criar (em desenvolvimento)
- `PUT /api/admin/products/:id` - editar (em desenvolvimento)
- `DELETE /api/admin/products/:id` - excluir (em desenvolvimento)

---

### ✅ 4. Coleções
- **Tabela administrativa:**
  - Nome, slug, contador de produtos
  - Status ativo/inativo (badge colorido)
- **CRUD completo:**
  - ➕ Criar nova coleção (modal em desenvolvimento)
  - ✏️ Editar coleção (modal em desenvolvimento)
  - 🗑️ Excluir coleção

**Endpoints:**
- `GET /api/admin/collections` - listar
- `POST /api/admin/collections` - criar
- `PUT /api/admin/collections/:id` - editar
- `DELETE /api/admin/collections/:id` - excluir

---

### ✅ 5. Pedidos
- **Em desenvolvimento:**
  - Tabela de pedidos (estrutura pronta)
  - Filtros por status (pendente, pago, enviado, entregue)
  - Integração com dados de `orders.json` (próximo passo)

---

## 🔐 Autenticação

Sistema simples de token JWT (demo):

- **Login:** `POST /api/admin/login`
  ```json
  {
    "username": "admin",
    "password": "admin123"
  }
  ```
  Retorna: `{ "token": "demo-token-admin-2024", "username": "admin" }`

- **Token armazenado em:**
  - `localStorage.admin_token`

- **Middleware de autenticação:**
  - Todos os endpoints `/api/admin/*` (exceto login) exigem header:
    ```
    Authorization: Bearer demo-token-admin-2024
    ```

---

## 🎨 Design & UI/UX

### Tema Dark Netflix
```css
--primary: #E50914          /* Netflix Red */
--bg-dark: #1a1a1a         /* Fundo escuro */
--sidebar-bg: #1f1f1f      /* Sidebar mais clara */
--text-primary: #e5e5e5    /* Texto claro */
--success: #22c55e         /* Verde */
--warning: #fbbf24         /* Amarelo */
--danger: #ef4444          /* Vermelho erro */
```

### Componentes
- **Sidebar fixa (260px):**
  - Logo ST Admin
  - Navegação com ícones SVG
  - Botão Logout no rodapé
  - Responsivo: colapsa para 70px em mobile

- **Cards de estatísticas:**
  - Ícone colorido com background transparente
  - Valor grande e bold
  - Indicador de variação (positivo em verde)

- **Tabelas:**
  - Hover effect sutil
  - Badges coloridos para status
  - Botões de ação inline

- **Drag & Drop:**
  - Cursor `grab/grabbing`
  - Ghost effect durante drag (opacidade 0.4)
  - Borda vermelha no hover

---

## 📊 Schema de Dados

### collections.json
```json
{
  "id": 1,
  "name": "Roupas Stranger Things",
  "slug": "roupas-stranger-things",
  "description": "Camisetas, moletons e acessórios oficiais",
  "sort_order": 0,
  "is_active": true,
  "product_count": 120,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### product-collections.json (Relação N:N)
```json
{
  "product_id": 1,
  "collection_id": 3,
  "sort_order": 0
}
```

---

## 🔧 Próximos Passos (Roadmap)

### Alta Prioridade
1. **Modais de criação/edição:**
   - ➕ Criar coleção com validação
   - ➕ Criar produto com upload de imagem
   - ✏️ Editar produto com seletor múltiplo de coleções (checkboxes)

2. **Integração com pedidos:**
   - Ler `orders.json` do backend
   - Exibir tabela de pedidos com status
   - Botão de atualizar status (pendente → pago → enviado → entregue)

3. **Analytics de usuários online:**
   - Criar tabela `sessions.json` para rastrear atividade
   - Endpoint `GET /api/admin/sessions/active` (últimos 5min)
   - Gráfico em tempo real no Dashboard

### Média Prioridade
4. **Seletor múltiplo de coleções:**
   - Modal de edição de produto com checkboxes
   - Atualizar `product-collections.json` ao salvar

5. **Upload de imagens:**
   - Endpoint `POST /api/admin/upload` com multer
   - Preview de imagem antes de salvar
   - Integração com Cloudinary ou AWS S3 (opcional)

6. **Filtros avançados:**
   - Ordenação por coluna (nome, preço, estoque)
   - Paginação (10, 25, 50, 100 itens)
   - Exportar CSV

### Baixa Prioridade
7. **Notificações em tempo real:**
   - WebSocket para novos pedidos
   - Toast notifications no canto da tela

8. **Dark/Light mode toggle**

9. **Auditoria:**
   - Log de ações (quem criou/editou/deletou o quê e quando)

---

## 🐛 Troubleshooting

### Erro: "Não autorizado"
- Verifique se está logado (token no localStorage)
- Se persistir, faça logout e login novamente

### Drag & Drop não funciona
- Verifique se o SortableJS carregou: `console.log(window.Sortable)`
- Recarregue a página (F5)

### Coleções não aparecem
- Verifique se `collections.json` existe na raiz do projeto
- Backend deve estar rodando: `node server-json.js`

### Produtos não aparecem na tabela
- Verifique se `netflix-shop-products.json` está carregado
- Abra console do navegador para ver erros

---

## 📝 Comandos Úteis

```bash
# Iniciar servidor
node server-json.js

# Resetar coleções (restaurar padrão)
git checkout collections.json

# Ver logs do backend em tempo real
tail -f server-json.log  # (se configurado)

# Testar endpoint de login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Testar endpoint de stats
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer demo-token-admin-2024"
```

---

## 🎯 Arquitetura Técnica

### Frontend (SPA)
- **Vanilla JavaScript** (sem frameworks)
- **Roteamento via hash:** `#dashboard`, `#vitrine`, `#products`, etc.
- **State management:** Variáveis globais (`collections`, `products`, `stats`)
- **Fetch API** para requisições HTTP

### Backend (Node.js + Express)
- **JSON files** para persistência (ao invés de SQLite)
- **Middleware de autenticação** simples com token
- **CORS habilitado** para desenvolvimento

### Bibliotecas Externas
- **SortableJS 1.15.0** (drag & drop)
- **Google Fonts Inter** (tipografia)

---

## 🚀 Deploy (Produção)

Para deploy em produção, considere:

1. **Banco de dados real:**
   - Migrar de JSON files para PostgreSQL/MongoDB
   - Implementar relações com Foreign Keys

2. **Autenticação robusta:**
   - JWT com secret seguro (variável de ambiente)
   - Hash de senhas com bcrypt
   - Refresh tokens

3. **Upload de imagens:**
   - Cloudinary, AWS S3, ou similar
   - Compressão automática

4. **HTTPS:**
   - Certificado SSL (Let's Encrypt)

5. **Rate limiting:**
   - Prevenir brute-force no login

---

**Desenvolvido para Stranger Things Store** 🎬  
*Made with ❤️ and ☕*
