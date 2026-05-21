/**
 * Painel fixo à esquerda com seta para mostrar/ocultar.
 */
(function () {
    const shell = document.getElementById('sidebar-shell');
    const toggle = document.getElementById('sidebar-toggle');

    if (!shell || !toggle) return;

    function refreshMapSize() {
        if (typeof map !== 'undefined' && map && map.invalidateSize) {
            setTimeout(() => map.invalidateSize(), 350);
        }
    }

    function setCollapsed(collapsed) {
        shell.classList.toggle('is-collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.setAttribute('aria-label', collapsed ? 'Mostrar painel' : 'Ocultar painel');
        refreshMapSize();
    }

    toggle.addEventListener('click', () => {
        setCollapsed(!shell.classList.contains('is-collapsed'));
    });

    window.addEventListener('resize', refreshMapSize);
})();
