/**
 * Geologia do Brasil — GeoJSON local + cores do QGIS (SLD).
 */
(function () {
    const cfg = window.MDGEO_MAP_UI;
    if (!cfg) return;

    const { map } = cfg;
    const LOCAL_GEOLOGY_URL = 'data/geologia_brasil.geojson';
    const COLORS_URL = 'data/geologia_cores.json';
    const DEFAULT_GEOLOGY_COLOR = '#b8b0a8';

    let colorBySigla = {};
    let colorsReady = false;
    let localLayer = null;
    let loadState = 'idle';
    let loadError = null;
    const canvasRenderer = L.canvas({ padding: 0.5 });

    async function loadColorMap() {
        if (colorsReady) return colorBySigla;
        try {
            const res = await fetch(COLORS_URL);
            if (res.ok) colorBySigla = await res.json();
        } catch (err) {
            console.warn('Mapa de cores da geologia:', err);
        }
        colorsReady = true;
        return colorBySigla;
    }

    function getSigla(feature) {
        const p = feature.properties || {};
        return String(p.SIGLA_UNID || p.SIGLA || '').trim();
    }

    function geologyStyle(feature) {
        const sigla = getSigla(feature);
        const fill = (sigla && colorBySigla[sigla]) || DEFAULT_GEOLOGY_COLOR;
        return {
            fillColor: fill,
            weight: 0.4,
            opacity: 0.9,
            color: 'rgba(50, 50, 50, 0.35)',
            fillOpacity: 0.72
        };
    }

    function formatGeologyTitle(p) {
        const nome = p.NOME_UNIDA || p.NOME_UNID || p.NOME || 'Unidade geológica';
        const hierarquia = String(p.HIERARQUIA || '').trim();
        const omitirHierarquia =
            !hierarquia ||
            hierarquia.toLowerCase() === 'não definida' ||
            hierarquia.toLowerCase() === 'nao definida';

        if (omitirHierarquia) return nome;
        return `${hierarquia} ${nome}`;
    }

    function bindGeologyPopup(feature, layer) {
        const p = feature.properties || {};
        const titulo = formatGeologyTitle(p);
        const sigla = p.SIGLA_UNID || p.SIGLA || '';
        const eon = p.EON_IDAD_M || p.EON_IDAD_1 || '';
        const idadeMax = p.IDADE_MAX;
        const idadeMin = p.IDADE_MIN;
        let idadeTxt = '';
        if (idadeMax || idadeMin) {
            idadeTxt = `${idadeMin || '?'} – ${idadeMax || '?'} Ma`;
        }
        layer.bindPopup(
            `<strong>${titulo}</strong>` +
                (sigla ? `<br><em>${sigla}</em>` : '') +
                (eon ? `<br>${eon}` : '') +
                (idadeTxt ? `<br>Idade: ${idadeTxt}` : '')
        );
    }

    loadColorMap();

    async function probeLocal() {
        if (window.location.protocol === 'file:') {
            return {
                ok: false,
                message:
                    'Abra pelo atalho Abrir_Geoportal.bat (servidor local). Abrir o HTML direto não carrega o GeoJSON.'
            };
        }
        try {
            const res = await fetch(LOCAL_GEOLOGY_URL, { method: 'HEAD' });
            if (!res.ok) {
                return {
                    ok: false,
                    message: `Arquivo não encontrado: ${LOCAL_GEOLOGY_URL}`
                };
            }
            const n = Object.keys(colorBySigla).length;
            return {
                ok: true,
                message:
                    n > 0
                        ? `Pronto (${n} cores). Marque para carregar — pode levar meio minuto.`
                        : 'Arquivo encontrado. Marque para carregar no mapa.'
            };
        } catch (err) {
            return {
                ok: false,
                message: 'Não foi possível acessar o GeoJSON. Use Abrir_Geoportal.bat.'
            };
        }
    }

    async function ensureLocalLayer(onProgress) {
        if (localLayer) return localLayer;
        if (loadState === 'loading') return null;
        if (loadState === 'error') {
            loadState = 'idle';
            loadError = null;
        }

        if (window.location.protocol === 'file:') {
            loadError =
                'Abra pelo Abrir_Geoportal.bat. O navegador bloqueia arquivos locais em file://.';
            loadState = 'error';
            return null;
        }

        loadState = 'loading';
        if (onProgress) onProgress('Carregando geologia…');

        await loadColorMap();

        try {
            const res = await fetch(LOCAL_GEOLOGY_URL);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            if (onProgress) onProgress('Processando polígonos…');
            const data = await res.json();

            localLayer = L.geoJSON(data, {
                style: geologyStyle,
                onEachFeature: bindGeologyPopup,
                renderer: canvasRenderer
            });
            loadState = 'ready';
            loadError = null;
            return localLayer;
        } catch (err) {
            console.error('Geologia local:', err);
            loadState = 'error';
            loadError = err.message || 'Falha ao carregar GeoJSON';
            return null;
        }
    }

    function bringProjectsToFront() {
        map.eachLayer((layer) => {
            if (layer instanceof L.GeoJSON && layer !== localLayer) {
                layer.bringToFront();
            }
        });
    }

    window.MDGEO_GEOLOGY = {
        probeLocal,
        ensureLocalLayer,
        bringProjectsToFront,
        getLoadError: () => loadError,
        isLoading: () => loadState === 'loading',
        colorCount: () => Object.keys(colorBySigla).length
    };
})();
