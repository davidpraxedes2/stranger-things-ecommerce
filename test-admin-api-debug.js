// DEBUG SCRIPT - Testar Admin API
// Cole este código no console do admin (página /admin.html)

console.log('🔍 Testando endpoints do Admin...');

const token = localStorage.getItem('admin_token');
console.log('🔑 Token:', token ? 'Presente' : 'AUSENTE');

if (!token) {
    console.error('❌ Token não encontrado! Faça login novamente.');
} else {
    const API_URL = window.location.origin + '/api/admin';

    // Teste 1: Online Count
    console.log('📊 Testando /analytics/online-count...');
    fetch(`${API_URL}/analytics/online-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => console.log('✅ Online Count:', data))
        .catch(err => console.error('❌ Erro Online Count:', err));

    // Teste 2: Active Sessions
    console.log('👥 Testando /sessions/active...');
    fetch(`${API_URL}/sessions/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            console.log('✅ Active Sessions:', data);
            console.log('📊 Total de sessões:', data.length);
            if (data.length > 0) {
                console.log('🎉 Primeira sessão:', data[0]);
            } else {
                console.warn('⚠️ Nenhuma sessão ativa encontrada!');
            }
        })
        .catch(err => console.error('❌ Erro Active Sessions:', err));

    // Teste 3: Visitor Locations
    console.log('🗺️ Testando /analytics/visitor-locations...');
    fetch(`${API_URL}/analytics/visitor-locations`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            console.log('✅ Visitor Locations:', data);
            console.log('📍 Total de localizações:', data.length);
        })
        .catch(err => console.error('❌ Erro Visitor Locations:', err));
}
