/**
 * Transições de página — fade-out ao clicar em link interno antes de
 * navegar, e GUARDA GLOBAL contra overlays/modais travados.
 *
 * Estrutura: dois IIFEs.
 *
 *   1) Guard de overlay (sempre roda). Limpa classes residuais do
 *      body, restaura overflow, e oferece window.closeAllOverlays().
 *
 *   2) Animação de transição (só se reduced-motion não estiver ligado).
 */

/* =====================================================================
   1) GUARD GLOBAL — sempre roda
   ===================================================================== */
(function () {
    'use strict';

    // Classes que historicamente foram usadas em projetos PHP simples
    // para sinalizar estado "aberto". Se sobrarem no body sem modal
    // realmente aberto, viram bug visual (página travada/escurecida).
    const STUCK_BODY_CLASSES = [
        'page-leaving',
        'modal-open',
        'drawer-open',
        'actions-open',
        'overlay-active',
        'is-loading',
        'no-scroll'
    ];

    function temAlgumModalAberto() {
        return !!document.querySelector(
            '.cb-modal-backdrop:not([hidden]),' +
            '.sheet-modal-backdrop:not([hidden]),' +
            '.poder-modal-backdrop:not([hidden]),' +
            '.dice-overlay.active,' +
            '.cb-action-panel:not([hidden]),' +
            '.anc-picker-backdrop:not([hidden])'
        );
    }

    function closeAllOverlays() {
        for (const cls of STUCK_BODY_CLASSES) {
            document.body.classList.remove(cls);
        }
        document.querySelectorAll('a.is-leaving').forEach(a => a.classList.remove('is-leaving'));
        if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
        if (document.body.style.opacity) document.body.style.opacity = '';
        if (document.body.style.filter)  document.body.style.filter  = '';
    }

    function limparSeNaoHaModal() {
        if (!temAlgumModalAberto()) closeAllOverlays();
    }

    // Exposto para uso manual no console (debug) e por outros scripts.
    window.closeAllOverlays = closeAllOverlays;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', limparSeNaoHaModal);
    } else {
        limparSeNaoHaModal();
    }
    window.addEventListener('pageshow',  limparSeNaoHaModal);
    window.addEventListener('popstate',  limparSeNaoHaModal);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') limparSeNaoHaModal();
    });

    // ESC global: se NADA estiver aberto, garante body limpo. Páginas
    // com handlers próprios de ESC (campo-batalha) não conflitam.
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (temAlgumModalAberto()) return;
        closeAllOverlays();
    });
})();

/* =====================================================================
   2) ANIMAÇÃO DE TRANSIÇÃO — só se motion permitido
   ===================================================================== */
(function () {
    'use strict';

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const FADE_OUT_MS = 220;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (e.button !== 0) return;
        if (link.target && link.target !== '_self') return;
        if (link.hasAttribute('download')) return;

        const href = link.getAttribute('href');
        if (!href) return;
        if (href.startsWith('#') ||
            href.startsWith('javascript:') ||
            href.startsWith('mailto:') ||
            href.startsWith('tel:')) return;

        let url;
        try { url = new URL(href, window.location.href); } catch (_) { return; }

        if (url.origin !== window.location.origin) return;
        if (url.href === window.location.href) return;
        if (url.pathname === window.location.pathname &&
            url.search === window.location.search &&
            url.hash) return;

        e.preventDefault();
        link.classList.add('is-leaving');
        document.body.classList.add('page-leaving');

        // Failsafe duplo: se a navegação não acontecer (iOS gesture, popup
        // blocker, erro de rede), volta a página ao normal em 1.5s.
        const limpeza = setTimeout(() => window.closeAllOverlays(), 1500);

        setTimeout(() => {
            clearTimeout(limpeza);
            window.location.href = url.href;
        }, FADE_OUT_MS);
    });
})();
