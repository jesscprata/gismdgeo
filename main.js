// Map Initialization
const map = L.map('map', {
    zoomControl: false // We will add it later in a different position
}).setView([-14.235, -51.925], 4); // Centro do Brasil aprox.

// Reposition zoom control to top-right
L.control.zoom({
    position: 'topright'
}).addTo(map);

// ==========================================
// Base Maps (3 options as requested)
// ==========================================

// 1. Dark Mode Base Map (CartoDB Dark Matter)
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

// 2. Satellite Hybrid (Esri World Imagery + Labels)
// We use a group for hybrid so it contains imagery + labels
const satelliteImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19
});
const cartoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
});
const hybridMap = L.layerGroup([satelliteImagery, cartoLabels]);

// 3. Topographic / Street Map (OpenStreetMap)
const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
});

// Set default basemap
hybridMap.addTo(map);

// Base Map Control
const baseMaps = {
    "Escuro (Dark Mode)": darkMap,
    "Satélite Híbrido": hybridMap,
    "Ruas / Topográfico": streetMap
};
L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

// ==========================================
// GeoJSON Data Loading & Logic
// ==========================================

let geojsonLayer;
let allFeatures = [];

// Funções para UI
const totalProjectsEl = document.getElementById('total-projects');
const companyFilterEl = document.getElementById('company-filter');
const projectDetailsEl = document.getElementById('project-details');

function updateDetailsPanel(feature) {
    const props = feature.properties;
    
    // Animação de entrada
    projectDetailsEl.style.opacity = 0;
    
    setTimeout(() => {
        projectDetailsEl.innerHTML = `
            <div class="detail-item">
                <div class="detail-label">Projeto</div>
                <div class="detail-value" style="color: var(--primary-color)">${props.PROJETOS || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Empresa</div>
                <div class="detail-value">${props.EMPRESA || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Centro de Custo (CC)</div>
                <div class="detail-value">${props.CC || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Situação</div>
                <div class="detail-value" style="color: ${props.SITUACAO === 'Finalizado' ? '#00e676' : 'var(--text-main)'}">${props.SITUACAO || 'Em Andamento / N/A'}</div>
            </div>
        `;
        projectDetailsEl.style.opacity = 1;
    }, 150);
}

function onEachFeature(feature, layer) {
    // Popup
    const props = feature.properties;
    const popupContent = `
        <h4>${props.PROJETOS || 'Projeto Sem Nome'}</h4>
        <p><strong>Empresa:</strong> ${props.EMPRESA || '-'}</p>
        <p><strong>Situação:</strong> ${props.SITUACAO || '-'}</p>
    `;
    layer.bindPopup(popupContent);
    
    // Interactions
    layer.on({
        mouseover: function(e) {
            const layer = e.target;
            layer.setStyle({
                radius: 8,
                fillColor: "var(--secondary-color)",
                weight: 2
            });
            layer.bringToFront();
        },
        mouseout: function(e) {
            geojsonLayer.resetStyle(e.target);
        },
        click: function(e) {
            updateDetailsPanel(feature);
            map.flyTo(e.latlng, 10, { duration: 1.5 });
        }
    });
}

function loadGeoJSON() {
    try {
        const data = geojsonData; // Variável carregada do arquivos projetosData.js
        allFeatures = data.features;
        
        // Set Total Projects
        totalProjectsEl.innerText = allFeatures.length;
        
        // Populate Filter
        const companies = new Set();
        allFeatures.forEach(f => {
            if (f.properties.EMPRESA) {
                companies.add(f.properties.EMPRESA);
            }
        });
        
        Array.from(companies).sort().forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa;
            option.innerText = empresa;
            companyFilterEl.appendChild(option);
        });
        
        // Create Layer
        geojsonLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: "#6b9bb8",
                    color: "#ffffff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: onEachFeature
        }).addTo(map);
        
        // Ajustar zoom para caber todos os pontos
        if(allFeatures.length > 0) {
            map.fitBounds(geojsonLayer.getBounds(), { padding: [50, 50] });
        }
    } catch (err) {
        console.error("Erro ao carregar o GeoJSON:", err);
        totalProjectsEl.innerText = "Erro!";
    }
}

// Inicializar dados
loadGeoJSON();

// Event Listener para Filtro
companyFilterEl.addEventListener('change', function(e) {
    const selectedCompany = e.target.value;
    
    if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
    }
    
    let filteredFeatures = allFeatures;
    if (selectedCompany !== 'all') {
        filteredFeatures = allFeatures.filter(f => f.properties.EMPRESA === selectedCompany);
    }
    
    totalProjectsEl.innerText = filteredFeatures.length;
    
    geojsonLayer = L.geoJSON(filteredFeatures, {
        pointToLayer: function (feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 6,
                fillColor: "#6b9bb8",
                color: "#ffffff",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: onEachFeature
    }).addTo(map);
    
    if (filteredFeatures.length > 0) {
        map.fitBounds(geojsonLayer.getBounds(), { padding: [50, 50] });
    }
});
