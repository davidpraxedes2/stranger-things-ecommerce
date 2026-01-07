// Script para DESABILITAR todos os ajustes dinâmicos de layout
// Executar IMEDIATAMENTE para prevenir qualquer ajuste

(function() {
    'use strict';
    
    // Prevenir qualquer ajuste de padding/margin no body
    const body = document.body;
    if (body) {
        // Aplicar padding fixo IMEDIATAMENTE
        const announcementBar = document.querySelector('.announcement-bar');
        if (announcementBar && !announcementBar.classList.contains('hidden')) {
            body.style.setProperty('padding-top', '40px', 'important');
            body.classList.add('has-announcement');
            const header = document.querySelector('.header');
            if (header) {
                header.style.setProperty('top', '40px', 'important');
                header.classList.add('has-announcement');
            }
        }
        
        // Bloquear qualquer tentativa de ajustar padding-top do body
        const originalSetProperty = body.style.setProperty;
        body.style.setProperty = function(prop, value, priority) {
            if (prop === 'padding-top' || prop === 'paddingTop') {
                // Não permitir ajustes de padding-top após inicialização
                return;
            }
            return originalSetProperty.call(this, prop, value, priority);
        };
    }
})();

