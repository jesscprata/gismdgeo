/**
 * Controles do mapa: mapa base e geologia.
 */
(function () {
    const cfg = window.MDGEO_MAP_UI;
    if (!cfg) return;

    const { map, baseMaps, defaultBase } = cfg;
    const geo = window.MDGEO_GEOLOGY;
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
        if (geo && geo.bringProjectsToFront) {
            geo.bringProjectsToFront();
        } else {
            map.eachLayer((layer) => {
                if (layer instanceof L.GeoJSON) layer.bringToFront();
            });
        }
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
        const status = document.createElement('p');
        status.className = 'map-tool-status';
        status.style.cssText = 'margin-top:0.65rem;font-size:0.72rem;color:rgba(255,255,255,0.55);line-height:1.45;';

        if (geo && geo.hasOnline()) {
            const online = geo.getOnlineLayer();
            const labelEl = document.createElement('label');
            labelEl.className = 'map-tool-option';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.addEventListener('change', () => {
                if (input.checked) {
                    online.addTo(map);
                } else {
                    map.removeLayer(online);
                }
                bringProjectsToFront();
            });
            const span = document.createElement('span');
            span.textContent = 'Geologia do Brasil — online (SGB 1:2.500.000)';
            labelEl.appendChild(input);
            labelEl.appendChild(span);
            wrap.appendChild(labelEl);
        }

        const localLabel = document.createElement('label');
        localLabel.className = 'map-tool-option';
        const localInput = document.createElement('input');
        localInput.type = 'checkbox';
        localInput.disabled = true;
        const localSpan = document.createElement('span');
        localSpan.textContent = 'Geologia local (arquivo GeoJSON)';
        localLabel.appendChild(localInput);
        localLabel.appendChild(localSpan);
        wrap.appendChild(localLabel);

        localInput.addEventListener('change', async () => {
            if (!geo) return;
            if (localInput.checked) {
                const layer = await geo.ensureLocalLayer();
                if (layer) {
                    layer.addTo(map);
                    bringProjectsToFront();
                    status.textContent = 'Camada local carregada.';
                    status.style.color = 'rgba(125, 194, 97, 0.9)';
                } else {
                    localInput.checked = false;
                    status.textContent =
                        'Arquivo não encontrado. Baixe os dados do SGB e salve como data/geologia_brasil.geojson (veja data/README_GEOLOGIA.md).';
                    status.style.color = 'rgba(255, 180, 120, 0.95)';
                }
            } else {
                const layer = await geo.ensureLocalLayer();
                if (layer && map.hasLayer(layer)) map.removeLayer(layer);
            }
        });

        geo.ensureLocalLayer().then((layer) => {
            if (layer) {
                localInput.disabled = false;
                const n = geo.colorCount ? geo.colorCount() : 0;
                status.textContent =
                    n > 0
                        ? `Arquivo local pronto (${n} cores do QGIS). Marque para exibir.`
                        : 'Arquivo local disponível. Marque para exibir no mapa.';
            } else if (!geo.hasOnline()) {
                status.textContent =
                    'Serviço online indisponível. Use o arquivo local — instruções em data/README_GEOLOGIA.md.';
            } else {
                status.textContent =
                    'Recomendado: baixe a geologia do SGB e coloque em data/geologia_brasil.geojson (instruções no README).';
            }
        });

        wrap.appendChild(status);
        return wrap;
    }

    createPanel('basemap', 'Mapa base', buildBasemapPanel);
    createPanel('geology', 'Geologia', buildGeologyPanel);

    const tools = [
        { id: 'basemap', label: 'Mapa base', icon: ICONS.basemap },
        { id: 'geology', label: 'Geologia', icon: ICONS.geology }
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
