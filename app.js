document.addEventListener('DOMContentLoaded', () => {
    const centerPoint = [40.2467, -77.17220];

    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 10
    }).setView(centerPoint, 17);

    // BASE SATELLITE
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 22,
        maxNativeZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let selectedIndex = -1;
    let isAddMode = false;
    let currentShape = 'sector';

    // --- TOPOGRAPHIC ENGINE ---
    const RealTopoLayer = L.GridLayer.extend({
        createTile: function (coords, done) {
            const tile = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            tile.width = size.x; tile.height = size.y;
            const ctx = tile.getContext('2d');
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${coords.x}/${coords.y}.png`;
            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, size.x, size.y);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const height = (data[i] * 256 + data[i+1] + data[i+2] / 256) - 32768;
                    const factor = Math.max(0, Math.min(1, (height - 120) / 40));
                    let c = factor > 0.8 ? [255, 62, 62] : factor > 0.5 ? [255, 157, 0] : factor > 0.25 ? [0, 209, 102] : [0, 112, 255];
                    data[i] = c[0]; data[i+1] = c[1]; data[i+2] = c[2]; data[i+3] = 130;
                }
                ctx.putImageData(imageData, 0, 0);
                done(null, tile);
            };
            img.onerror = () => done(null, tile);
            return tile;
        }
    });

    let elevationLayer = null;
    window.toggleElevation = (active) => {
        if (active) elevationLayer = new RealTopoLayer({ zIndex: 15 }).addTo(map);
        else if (elevationLayer) { map.removeLayer(elevationLayer); elevationLayer = null; }
    };

    // COORDINATE DISPLAY
    const coordDisplay = L.control({ position: 'bottomleft' });
    coordDisplay.onAdd = function () {
        this._div = L.DomUtil.create('div', 'coord-box');
        this._div.style.cssText = 'background:rgba(14,18,25,0.9);color:#00f0ff;padding:10px;font-family:monospace;border-radius:5px;border:1px solid #00f0ff;';
        return this._div;
    };
    coordDisplay.addTo(map);

    map.on('mousemove', (e) => {
        const { lat, lng } = e.latlng;
        coordDisplay._div.innerHTML = `LAT: ${lat.toFixed(6)}<br>LNG: ${lng.toFixed(6)}`;
    });

    function createObject(lat, lng, angle = 0, color = '#00f0ff', name = '', type = 'sector', groupId = null, dayOverride = null) {
        let layer;
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (angle * Math.PI) / 180;
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5.5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.x}];
            const rotated = corners.map(c => [lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter]);
            layer = L.polygon(rotated, { color: color, weight: 3, fillOpacity: type === 'sector' ? 0.2 : 0.6 });
        } else {
            layer = L.circle([lat, lng], { radius: 0.5, color: color, weight: 2, fillOpacity: 0.5 });
        }
        layer.addTo(map);
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'poly-label' });
        
        let day = dayOverride;
        if (!day) {
            const n = (name || '').toLowerCase();
            if (color === '#ff3e3e' || n.includes('block') || n.includes('חסימה')) day = 'roadblock';
            else if (color === '#ffff00' || n.includes('key')) day = 'prescan';
            else if (color === '#00f0ff') day = 1;
            else if (color === '#2a2a2a') day = n.includes('ד.מע') ? ['2','4'] : 2;
            else if (color === '#8b4513' || color === '#00d166') day = 3;
            else if (color === '#ff9d00') day = n.includes('ד.מע') ? ['2','4'] : 4;
            else if (color === '#ffffff') day = 5;
        }

        return { layer, lat, lng, angle, color, name, type, day, groupId };
    }

    // --- BAKED MISSION DATA (CURRENT SNAPSHOT) ---
    const BAKED_DATA = [
        {"lat": 40.2458, "lng": -77.17062402237207, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.2464, "lng": -77.1709, "angle": 0, "color": "#8b4513", "name": "נקי מפתח", "type": "circle", "groupId": null, "day": 3},
        {"lat": 40.24610190890656, "lng": -77.170792138204, "angle": 123, "color": "#00d166", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24338323164866, "lng": -77.17234611511232, "angle": 127, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.243117075737736, "lng": -77.1720188856125, "angle": 134, "color": "#2a2a2a", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.24286729770028, "lng": -77.17167019844057, "angle": 136, "color": "#2a2a2a", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.24256838178838, "lng": -77.17142879962923, "angle": 95, "color": "#2a2a2a", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.2422203273511, "lng": -77.17141807079317, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.24199920948497, "lng": -77.1714609861374, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 2},
        {"lat": 40.2445, "lng": -77.17205, "angle": 0, "color": "#2a2a2a", "name": "נקי מפתח", "type": "circle", "groupId": null, "day": 2},
        {"lat": 40.24492282069156, "lng": -77.17048466205598, "angle": 118, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24645623295087, "lng": -77.17006623744966, "angle": 120, "color": "#00f0ff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.246155285621036, "lng": -77.16982483863832, "angle": 120, "color": "#00f0ff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.245862526050274, "lng": -77.16958343982698, "angle": 123, "color": "#00f0ff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.24556567064719, "lng": -77.16935276985168, "angle": 116, "color": "#00f0ff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.245236057260605, "lng": -77.1691757440567, "angle": 108, "color": "#00f0ff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.244900300359525, "lng": -77.16905504465105, "angle": 97, "color": "#00f0ff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.24455635253893, "lng": -77.16901481151582, "angle": 90, "color": "#00f0ff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.244218544942655, "lng": -77.16905236244203, "angle": 80, "color": "#00f0ff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.24389506699777, "lng": -77.16918379068376, "angle": 62, "color": "#00f0ff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 1},
        {"lat": 40.24338323164866, "lng": -77.16937422752382, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24305565499428, "lng": -77.16926157474519, "angle": 262, "color": "#8b4513", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24290005552819, "lng": -77.1689772605896, "angle": 164, "color": "#8b4513", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24272807675484, "lng": -77.16947615146637, "angle": 50, "color": "#8b4513", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.242547908047484, "lng": -77.1698945760727, "angle": 16, "color": "#8b4513", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24433933694343, "lng": -77.16937959194185, "angle": 171, "color": "#8b4513", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.244419182384945, "lng": -77.16984629631044, "angle": 155, "color": "#8b4513", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.244636197724475, "lng": -77.17022716999055, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.245234009967476, "lng": -77.17069923877717, "angle": 117, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.245553386947286, "lng": -77.17092454433443, "angle": 119, "color": "#8b4513", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24585228967874, "lng": -77.17114448547365, "angle": 119, "color": "#8b4513", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 3},
        {"lat": 40.24440689847699, "lng": -77.16899871826172, "angle": 43, "color": "#ff3e3e", "name": "חסימת ציר(דרום\\צפון)", "type": "barrier", "groupId": null, "day": "roadblock"},
        {"lat": 40.24431476909634, "lng": -77.16927498579027, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר(מזרח\\מערב)", "type": "barrier", "groupId": null, "day": "roadblock"},
        {"lat": 40.24353268797061, "lng": -77.16948151588441, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר יום לבן", "type": "barrier", "groupId": null, "day": "roadblock"},
        {"lat": 40.244815337221134, "lng": -77.17205107212068, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (מערב\\מזרח)", "type": "barrier", "groupId": null, "day": "roadblock"},
        {"lat": 40.242977855305945, "lng": -77.17209398746492, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (צ.מע\\ד.מז)", "type": "barrier", "groupId": null, "day": "roadblock"},
        {"lat": 40.241816991441404, "lng": -77.17128798365594, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.24232883863233, "lng": -77.17297643423082, "angle": 53, "color": "#ffff00", "name": "נק׳ מפתח(ריכוז תשתיות מים)", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.24670804499462, "lng": -77.17024326324464, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח((תשתיות מרכזיות)", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.24505896617581, "lng": -77.17162862420082, "angle": 69, "color": "#ffff00", "name": "נק׳ מפתח(שינויי גבהים)", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.242846824049785, "lng": -77.16856151819229, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.24245168138233, "lng": -77.17023789882661, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"},
        {"lat": 40.24522582079434, "lng": -77.1745938062668, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}
    ];

    async function loadMission() {
        let sourceData = BAKED_DATA;
        try {
            const resp = await fetch('/api/mission');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) sourceData = data;
            }
        } catch (e) { console.log("Using baked data fallback."); }

        sourceData.forEach(d => {
            const obj = createObject(d.lat, d.lng, d.angle, d.color, d.name, d.type, d.groupId, d.day);
            polygons.push(obj);
        });
        updateStats();
    }
    function updateStats() {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, roadblock: 0, prescan: 0 };
        polygons.forEach(p => {
            const days = Array.isArray(p.day) ? p.day : [p.day];
            days.forEach(d => { if (counts[d] !== undefined) counts[d]++; });
        });
    }

    // --- TEMPORAL FILTERS ---
    document.querySelectorAll('#day-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const daySelected = btn.getAttribute('data-day');
            
            // UI Update
            document.querySelectorAll('#day-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Sidebar Update
            document.querySelectorAll('#protocol-timeline .day-outline').forEach(outline => {
                const outlineDay = outline.getAttribute('data-day');
                outline.style.display = (outlineDay === daySelected) ? 'block' : 'none';
            });

            // Map Update
            polygons.forEach(p => {
                const pDays = Array.isArray(p.day) ? p.day.map(String) : [String(p.day)];
                const show = (daySelected === 'all') || pDays.includes(daySelected);
                if (show) p.layer.addTo(map);
                else map.removeLayer(p.layer);
            });
        });
    });

    // Modal logic
    const invBtn = document.querySelector('.inventory-btn');
    const modal = document.getElementById('inventory-modal');
    if (invBtn && modal) {
        invBtn.onclick = () => modal.style.display = 'flex';
        document.getElementById('close-inventory-btn').onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    loadMission();
});
