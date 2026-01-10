# Importação de 40 Funkos - Instruções

## Passo 1: Preencher o Template

Abra o arquivo `funkos-template.json` e substitua os nomes de exemplo pelos nomes reais dos 40 Funkos do site funko.com.br.

**Exemplo:**
```json
{
  "name": "Boneco Funko Pop! Stranger Things - Eleven"
}
```

**Dica:** Você pode copiar e colar os nomes diretamente do site.

## Passo 2: (Opcional) Adicionar Imagens

Se quiser adicionar URLs de imagens, adicione o campo `image_url`:

```json
{
  "name": "Boneco Funko Pop! Stranger Things - Eleven",
  "image_url": "https://exemplo.com/imagem.jpg"
}
```

Se não adicionar, será usada uma imagem placeholder.

## Passo 3: Executar a Importação

```bash
cd "/Users/davidpraxedes/Downloads/Stranger Things Ecomm"
node import-funkos.js
```

## O que o script faz:

1. ✅ Conecta ao banco Postgres do Vercel
2. ✅ Cria a coleção "Stranger Things Funkos" se não existir
3. ✅ Verifica duplicatas (não importa produtos que já existem)
4. ✅ Define preço R$ 29,00 para todos
5. ✅ Gera descrição automática
6. ✅ Associa todos à coleção stranger-things-funkos
7. ✅ Define ordem de exibição

## Resultado Esperado

```
📦 Importing 40 Funkos...
✅ Connected to database
✅ Using existing collection ID 1
📊 Found 14 existing Funkos in database
✅ Imported: Boneco Funko Pop! Stranger Things - Eleven
✅ Imported: Boneco Funko Pop! Stranger Things - Mike
...
🎉 Import complete!
   ✅ Imported: 26
   ⏭️  Skipped (duplicates): 14
   📊 Total in collection: 40
```

## Após a Importação

Os 40 Funkos estarão:
- ✅ No banco de dados do Vercel
- ✅ Na coleção "Stranger Things Funkos"
- ✅ Visíveis no site em https://netflix.strangeroficial.shop/collection.html?slug=stranger-things-funkos
- ✅ Com preço R$ 29,00
