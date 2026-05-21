/**
 * Controles do mapa: mapa base, geologia e legenda (botões separados).
 */
(function () {
    const cfg = window.MDGEO_MAP_UI;
    if (!cfg) return;

    const { map, baseMaps, overlayMaps, defaultBase } = cfg;
    const mapContainer = document.querySelector('.map-container');
    if (!mapContainer) return;

    const ICONS = {
        basemap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="3" y="3" width="8" height="8" rx="1"/>
            <rect x="13" y="3" width="8" height="8" rx="1"/>
            <rect x="3" y="13" width="8" height="8" rx="1"/>
            <rect x="13" y="13" width="8" height="8" rx="1"/>
        </svg>`,
        geology: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 3L21 8.5V9.5L12 15L3 9.5V8.5L12 3Z" opacity="0.55"/>
            <path d="M12 9L21 14.5V15.5L12 21L3 15.5V14.5L12 9Z"/>
        </svg>`,
        legend: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M5 5.5L9 5.5L7 3.5Z"/>
            <rect x="4" y="10" width="5" height="5" rx="0.5"/>
            <circle cx="6.5" cy="19" r="2.5"/>
            <rect x="12" y="4" width="9" height="2" rx="1" opacity="0.9"/>
            <rect x="12" y="11" width="9" height="2" rx="1" opacity="0.9"/>
            <rect x="12" y="18" width="9" height="2" rx="1" opacity="0.9"/>
        </svg>`
    };

    let activeBase = defaultBase;
    let openPanelId = null;

    const toolbar = document.createElement('div');
    toolbar.className = 'map-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Ferramentas do mapa');

    const panels = {};

    function bringProjectsToFront() {
        map.eachLayer((layer) => {
            if (layer instanceof L.GeoJSON) {
                layer.bringToFront();
            }
        });
    }

    function setBaseMap(layer) {
        Object.values(baseMaps).forEach((l) => {
            if (map.hasLayer(l)) map.removeLayer(l);
        });
        layer.addTo(map);
        activeBase = layer;
        bringProjectsToFront();
    }

    function createPanel(id, title, buildContent) {
        const panel = document.createElement('div');
        panel.className = 'map-tool-panel';
        panel.id = `map-panel-${id}`;
        panel.hidden = true;
        panel.innerHTML = `<h4>${title}</h4>`;
        panel.appendChild(buildContent());
        mapContainer.appendChild(panel);
        panels[id] = panel;
        return panel;
    }

    function buildBasemapPanel() {
        const wrap = document.createElement('div');
        const defaultKey = Object.keys(baseMaps).find((k) => baseMaps[k] === defaultBase) || Object.keys(baseMaps)[0];
        const groupName = 'mdgeo-basemap';

        Object.entries(baseMaps).forEach(([label, layer]) => {
            const labelEl = document.createElement('label');
            labelEl.className = 'map-tool-option';
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = groupName;
            input.value = label;
            input.checked = label === defaultKey;
            input.addEventListener('change', () => {
                if (input.checked) setBaseMap(layer);
            });
            const span = document.createElement('span');
            span.textContent = label;
            labelEl.appendChild(input);
            labelEl.appendChild(span);
            wrap.appendChild(labelEl);
        });

        return wrap;
    }

    function buildGeologyPanel() {
        const wrap = document.createElement('div');

        Object.entries(overlayMaps).forEach(([label, layer]) => {
            const labelEl = document.createElement('label');
            labelEl.className = 'map-tool-option';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.addEventListener('change', () => {
                if (input.checked) {
                    layer.addTo(map);
                } else {
                    map.removeLayer(layer);
                }
                bringProjectsToFront();
            });
            const span = document.createElement('span');
            span.textContent = label;
            labelEl.appendChild(input);
            labelEl.appendChild(span);
            wrap.appendChild(labelEl);
        });

        const note = document.createElement('p');
        note.style.cssText = 'margin-top:0.65rem;font-size:0.72rem;color:rgba(255,255,255,0.5);line-height:1.4;';
        note.textContent = 'Fonte: CPRM/SGB (WMS). Ative com zoom adequado à escala.';
        wrap.appendChild(note);

        return wrap;
    }

    function buildLegendPanel() {
        const wrap = document.createElement('div');

        wrap.innerHTML = `
            <div class="map-legend-section">
                <div class="map-legend-section-title">Projetos MDGEO</div>
                <div class="map-legend-item">
                    <span class="map-legend-symbol"><span class="legend-project-dot"></span></span>
                    <span class="map-legend-line"></span>
                    <span>Projeto</span>
                </div>
                <div class="map-legend-item">
                    <span class="map-legend-symbol" style="color:#00e676;font-weight:700;font-size:0.75rem;">●</span>
                    <span class="map-legend-line"></span>
                    <span>Situação finalizada</span>
                </div>
            </div>
            <div class="map-legend-section">
                <div class="map-legend-section-title">Geologia (CPRM/SGB)</div>
                <div class="map-legend-item">
                    <span class="map-legend-symbol"><span class="legend-geology-swatch"></span></span>
                    <span class="map-legend-line"></span>
                    <span>Unidades / domínios</span>
                </div>
                <div class="map-legend-item">
                    <span class="map-legend-symbol" style="font-size:0.7rem;">◇</span>
                    <span class="map-legend-line"></span>
                    <span>Afloramentos</span>
                </div>
            </div>
        `;

        return wrap;
    }

    createPanel('basemap', 'Mapa base', buildBasemapPanel);
    createPanel('geology', 'Geologia', buildGeologyPanel);
    createPanel('legend', 'Legenda', buildLegendPanel);

    const tools = [
        { id: 'basemap', label: 'Mapa base', icon: ICONS.basemap },
        { id: 'geology', label: 'Geologia', icon: ICONS.geology },
        { id: 'legend', label: 'Legenda', icon: ICONS.legend }
    ];

    function closeAllPanels() {
        openPanelId = null;
        Object.values(panels).forEach((p) => {
            p.classList.remove('is-open');
            p.hidden = true;
        });
        toolbar.querySelectorAll('.map-tool-btn').forEach((b) => b.classList.remove('is-active'));
    }

    function togglePanel(id) {
        if (openPanelId === id) {
            closeAllPanels();
            return;
        }
        closeAllPanels();
        openPanelId = id;
        panels[id].classList.add('is-open');
        panels[id].hidden = false;
        toolbar.querySelector(`[data-panel="${id}"]`).classList.add('is-active');
    }

    tools.forEach((tool) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'map-tool-btn';
        btn.dataset.panel = tool.id;
        btn.setAttribute('aria-label', tool.label);
        btn.setAttribute('title', tool.label);
        btn.innerHTML = tool.icon;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel(tool.id);
        });
        toolbar.appendChild(btn);
    });

    mapContainer.appendChild(toolbar);

    document.addEventListener('click', (e) => {
        if (!openPanelId) return;
        if (e.target.closest('.map-toolbar') || e.target.closest('.map-tool-panel')) return;
        closeAllPanels();
    });

    map.on('click', closeAllPanels);
})();
