// DEBUG SCRIPT - Testar Analytics Heartbeat
// Cole este código no console do navegador (na página principal do site, não no admin)

console.log('🔍 Iniciando teste de heartbeat...');

// Verificar se o sessionId foi criado
const sessionId = sessionStorage.getItem('analytics_session_id');
console.log('📋 Session ID:', sessionId);

// Verificar se a localização foi detectada
const userLocation = JSON.parse(localStorage.getItem('user_location_cache') || 'null');
console.log('📍 Localização:', userLocation);

// Testar envio manual de heartbeat
const testPayload = {
    sessionId: sessionId || 'test_' + Date.now(),
    page: window.location.pathname,
    title: document.title,
    action: 'test',
    location: userLocation || { city: 'São Paulo', region: 'SP', country: 'BR', lat: -23.5505, lon: -46.6333 },
    utm: { source: null, medium: null, campaign: null },
    device: 'Desktop',
    browser: 'Chrome',
    ip: null
};

console.log('📤 Enviando heartbeat de teste:', testPayload);

fetch('/api/analytics/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload)
})
    .then(res => {
        console.log('✅ Resposta status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('✅ Resposta do servidor:', data);
        if (data.success) {
            console.log('🎉 Heartbeat enviado com sucesso!');
            console.log('⏳ Aguarde 5 segundos e verifique o Live View no admin');
        }
    })
    .catch(err => {
        console.error('❌ Erro ao enviar heartbeat:', err);
    });
