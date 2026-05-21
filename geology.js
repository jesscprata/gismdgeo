/**
 * Geologia do Brasil: cores do QGIS (SLD) + GeoJSON local.
 */
(function () {
    const cfg = window.MDGEO_MAP_UI;
    if (!cfg) return;

    const { map } = cfg;
    const LOCAL_GEOLOGY_URL = 'data/geologia_brasil.geojson';
    const COLORS_URL = 'data/geologia_cores.json';
    const SGB_MAPSERVER =
        'https://geoportal.sgb.gov.br/server/rest/services/geologia/litoestratigrafia_2500000/MapServer';

    const DEFAULT_GEOLOGY_COLOR = '#b8b0a8';
    let colorBySigla = {};
    let colorsReady = false;

    async function loadColorMap() {
        if (colorsReady) return colorBySigla;
        try {
            const res = await fetch(COLORS_URL);
            if (res.ok) {
                colorBySigla = await res.json();
            }
        } catch (err) {
            console.warn('Mapa de cores da geologia não carregado:', err);
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

    function bindGeologyPopup(feature, layer) {
        const p = feature.properties || {};
        const nome = p.NOME_UNIDA || p.NOME_UNID || p.NOME || 'Unidade geológica';
        const sigla = p.SIGLA_UNID || p.SIGLA || '';
        const idadeMax = p.IDADE_MAX;
        const idadeMin = p.IDADE_MIN;
        const eon = p.EON_IDAD_M || p.EON_IDAD_1 || '';
        let idadeTxt = '';
        if (idadeMax || idadeMin) {
            idadeTxt = `${idadeMin || '?'} – ${idadeMax || '?'} Ma`;
        }
        layer.bindPopup(
            `<strong>${nome}</strong>` +
                (sigla ? `<br><em>${sigla}</em>` : '') +
                (eon ? `<br>${eon}` : '') +
                (idadeTxt ? `<br>Idade: ${idadeTxt}` : '')
        );
    }

    let onlineLayer = null;
    let localLayer = null;
    let localLoadAttempted = false;
    let localAvailable = false;

    if (typeof L.esri !== 'undefined' && L.esri.dynamicMapLayer) {
        onlineLayer = L.esri.dynamicMapLayer({
            url: SGB_MAPSERVER,
            opacity: 0.72,
            attribution: '&copy; <a href="https://www.sgb.gov.br/" target="_blank" rel="noopener">SGB/CPRM</a>'
        });
    }

    loadColorMap();

    async function ensureLocalLayer() {
        if (localLayer) return localLayer;
        if (localLoadAttempted) return null;
        localLoadAttempted = true;

        await loadColorMap();

        try {
            const res = await fetch(LOCAL_GEOLOGY_URL);
            if (!res.ok) return null;

            const data = await res.json();
            localLayer = L.geoJSON(data, {
                style: geologyStyle,
                onEachFeature: bindGeologyPopup
            });
            localAvailable = true;
            return localLayer;
        } catch (err) {
            console.warn('Geologia local não carregada:', err);
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
        hasOnline: () => !!onlineLayer,
        hasLocal: () => localAvailable,
        getOnlineLayer: () => onlineLayer,
        ensureLocalLayer,
        bringProjectsToFront,
        localFilePath: LOCAL_GEOLOGY_URL,
        colorCount: () => Object.keys(colorBySigla).length
    };
})();
