// Servidor de desenvolvimento local
// Usa server.js que já tem tudo configurado (SQLite, rotas completas)
const app = require('./server.js');
const PORT = process.env.PORT || 3000;

// Garantir que o servidor inicia (caso não tenha iniciado automaticamente)
if (!app.listening) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📦 Ambiente: desenvolvimento local`);
        console.log(`\n✨ Abra no navegador: http://localhost:${PORT}`);
        console.log(`📦 Admin: http://localhost:${PORT}/admin.html`);
        console.log(`\n💡 Para parar o servidor, pressione Ctrl+C\n`);
    });
}
