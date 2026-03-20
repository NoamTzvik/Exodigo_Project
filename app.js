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
        maxNativeZoom: 30
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let selectedIndex = -1;

    // --- REAL-WORLD TOPOGRAPHIC ENGINE ---
    const RealTopoLayer = L.GridLayer.extend({
        createTile: function (coords, done) {
            const tile = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            const ctx = tile.getContext('2d');
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${coords.x}/${coords.y}.png`;

            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, size.x, size.y);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i+1], b = data[i+2];
                    const height = (r * 256 + g + b / 256) - 32768;
                    const factor = Math.max(0, Math.min(1, (height - 120) / (160 - 120)));
                    let cr, cg, cb;
                    if (factor > 0.8) [cr, cg, cb] = [255, 62, 62];
                    else if (factor > 0.5) [cr, cg, cb] = [255, 157, 0];
                    else if (factor > 0.25) [cr, cg, cb] = [0, 209, 102];
                    else [cr, cg, cb] = [0, 112, 255];
                    data[i] = cr; data[i+1] = cg; data[i+2] = cb; data[i+3] = 130;
                }
                ctx.putImageData(imageData, 0, 0);
                done(null, tile);
            };
            img.onerror = () => done(null, tile);
            return tile;
        }
    });

    let elevationLayer = null;
    function toggleElevation(active) {
        if (active) elevationLayer = new RealTopoLayer({ zIndex: 15 }).addTo(map);
        else if (elevationLayer) { map.removeLayer(elevationLayer); elevationLayer = null; }
    }

    const coordDisplay = L.control({ position: 'bottomleft' });
    coordDisplay.onAdd = function () {
        this._div = L.DomUtil.create('div', 'coord-box');
        this._div.innerHTML = `LAT: ${centerPoint[0].toFixed(6)}<br>LNG: ${centerPoint[1].toFixed(6)}<br>ELEV: -- m`;
        return this._div;
    };
    coordDisplay.addTo(map);

    map.on('mousemove', async (e) => {
        const { lat, lng } = e.latlng;
        const currentAlt = (130 + Math.sin(lat * 1000) * 5 + ((lat - 40.24) * 2000)).toFixed(1);
        coordDisplay._div.innerHTML = `LAT: ${lat.toFixed(6)}<br>LNG: ${lng.toFixed(6)}<br>ELEV: ${currentAlt} m`;
    });

    function createObject(lat, lng, angle = 0, color = '#00f0ff', name = '', type = 'sector', groupId = null, manualDay = null) {
        let layer;
        const latM = 0.000009, lonM = 0.000012;
        const rad = (angle * Math.PI) / 180;

        if (type === 'sector') {
            const pts = [{y:20,x:5.5},{y:20,x:-5.5},{y:-20,x:-5.5},{y:-20,x:5.5}].map(c => {
                const ry = (c.y * Math.sin(rad) + c.x * Math.cos(rad)) * latM;
                const rx = (c.y * Math.cos(rad) - c.x * Math.sin(rad)) * lonM;
                return [lat + ry, lng + rx];
            });
            layer = L.polygon(pts, { color, weight: 5, fillOpacity: 0.2, interactive: false });
        } else if (type === 'barrier') {
            const pts = [{y:3,x:3},{y:3,x:-3},{y:-3,x:-3},{y:-3,x:3}].map(c => {
                const ry = (c.y * Math.sin(rad) + c.x * Math.cos(rad)) * latM;
                const rx = (c.y * Math.cos(rad) - c.x * Math.sin(rad)) * lonM;
                return [lat + ry, lng + rx];
            });
            layer = L.polygon(pts, { color, weight: 5, fillOpacity: 0.6, interactive: false });
        } else {
            layer = L.circle([lat, lng], { radius: 0.5, color, weight: 3, fillOpacity: 0.5, interactive: false });
        }

        layer.addTo(map);
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'poly-label' }).openTooltip();

        let day = manualDay;
        if (day === null) {
            const n = (name || '').toLowerCase();
            if (color === '#ff3e3e' || n.includes('road closure') || n.includes('חסימה')) day = 'roadblock';
            else if (color === '#ffff00' || n.includes('key point') || n.includes('sync')) day = 'prescan';
            else if (color === '#00f0ff') day = 1;
            else if (color === '#2a2a2a') day = n.includes('חסימת ציר ד.מע') ? ['2','4'] : 2;
            else if (color === '#8b4513' || color === '#00d166') day = 3;
            else if (color === '#ff9d00') day = n.includes('חסימת ציר ד.מע') ? ['2','4'] : 4;
            else if (color === '#ffffff') day = 5;
        }

        return { layer, lat, lng, angle, color, name, type, day };
    }

    // --- TEMPORAL FILTER LOGIC (Strict Isolation v61) ---
    function updateDaySelection(daySelected) {
        console.log('Clean Sync v61:', daySelected);
        const timeline = document.getElementById('protocol-timeline');
        const mainTitle = document.getElementById('schedule-title');
        const summaryOutline = document.querySelector('.summary-outline');
        const summaryItems = document.querySelectorAll('.summary-outline .event-item');
        const summaryH4 = summaryOutline ? summaryOutline.querySelector('h4') : null;
        const dayOutlines = document.querySelectorAll('#protocol-timeline .day-outline');

        if (timeline) timeline.scrollTop = 0;

        if (daySelected === 'all') {
            if (mainTitle) mainTitle.style.display = 'block';
            if (summaryOutline) summaryOutline.style.display = 'block';
            if (summaryH4) summaryH4.style.display = 'block';
            summaryItems.forEach(item => item.style.display = 'flex');
            dayOutlines.forEach(outline => outline.style.display = 'none');
        } else {
            if (mainTitle) mainTitle.style.display = 'none';
            if (summaryOutline) summaryOutline.style.display = 'block';
            if (summaryH4) summaryH4.style.display = 'none';
            summaryItems.forEach(item => {
                item.style.display = (item.getAttribute('data-day') === daySelected) ? 'flex' : 'none';
            });
            dayOutlines.forEach(outline => {
                const isSelected = (outline.getAttribute('data-day') === daySelected);
                outline.style.display = isSelected ? 'block' : 'none';
                if (isSelected) {
                    const innerH4 = outline.querySelector('h4');
                    if (innerH4) innerH4.style.display = 'none';
                }
            });
        }

        document.querySelectorAll('#day-filters .filter-btn').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-day') === daySelected);
        });

        polygons.forEach(p => {
            const pDay = Array.isArray(p.day) ? p.day : [String(p.day)];
            const isSelected = (daySelected === 'all') || pDay.includes(daySelected);
            if (isSelected) { if (!map.hasLayer(p.layer)) p.layer.addTo(map); }
            else { if (map.hasLayer(p.layer)) map.removeLayer(p.layer); }
        });
    }

    document.querySelectorAll('#day-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => updateDaySelection(btn.getAttribute('data-day')));
    });

    window.sidebarFilter = (day) => updateDaySelection(String(day));

    const topoBtn = document.getElementById('topo-toggle-btn');
    const topoLegend = document.getElementById('topo-legend');
    if (topoBtn) {
        topoBtn.addEventListener('click', () => {
            const active = topoBtn.classList.toggle('active');
            if (topoLegend) topoLegend.style.display = active ? 'block' : 'none';
            toggleElevation(active);
        });
    }

    const SAVE_KEY = 'exodigo_field_ops_v61';
    const BAKED_DATA = [{"lat": 40.242748550441235, "lng": -77.17235147953035, "angle": 229, "color": "#ff9d00", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24507022631638, "lng": -77.17415928840639, "angle": 156, "color": "#ff9d00", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244791793200065, "lng": -77.17401444911957, "angle": 74, "color": "#ff9d00", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24442327702043, "lng": -77.17406272888185, "angle": 93, "color": "#ff9d00", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244062948149455, "lng": -77.17401444911957, "angle": 99, "color": "#ff9d00", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24372309075217, "lng": -77.1739447116852, "angle": 100, "color": "#ff9d00", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24336275815419, "lng": -77.1738588809967, "angle": 101, "color": "#ff9d00", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24301061308037, "lng": -77.17376232147218, "angle": 102, "color": "#ff9d00", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.242674845141195, "lng": -77.17357456684114, "angle": 126, "color": "#ff9d00", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24249058154004, "lng": -77.17317223548889, "angle": 170, "color": "#ff9d00", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.2425274343004, "lng": -77.1727216243744, "angle": 211, "color": "#ff9d00", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24556157608081, "lng": -77.17238903045656, "angle": 105, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.245234009967476, "lng": -77.17222809791566, "angle": 116, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.244926915296595, "lng": -77.17199742794038, "angle": 119, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24461572460895, "lng": -77.17175602912903, "angle": 120, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24430862713315, "lng": -77.17153072357179, "angle": 118, "color": "#ffffff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24399333894197, "lng": -77.17132687568666, "angle": 118, "color": "#ffffff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243678049282316, "lng": -77.1710640192032, "angle": 131, "color": "#ffffff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24348559902806, "lng": -77.17067241668703, "angle": 162, "color": "#ffffff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243436462705255, "lng": -77.17021644115448, "angle": 183, "color": "#ffffff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24351016717609, "lng": -77.16975510120393, "angle": 204, "color": "#ffffff", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24470990088907, "lng": -77.17225492000581, "angle": 34, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24443146629067, "lng": -77.17253923416139, "angle": 64, "color": "#2a2a2a", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.244075232119826, "lng": -77.17259824275972, "angle": 99, "color": "#2a2a2a", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24371490139624, "lng": -77.17252850532533, "angle": 101, "color": "#2a2a2a", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24338323164866, "lng": -77.17234611511232, "angle": 127, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.243117075737736, "lng": -77.1720188856125, "angle": 134, "color": "#2a2a2a", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24286729770028, "lng": -77.17167019844057, "angle": 136, "color": "#2a2a2a", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24256838178838, "lng": -77.17142879962923, "angle": 95, "color": "#2a2a2a", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2422203273511, "lng": -77.17141807079317, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24199920948497, "lng": -77.1714609861374, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2445, "lng": -77.17205, "angle": 0, "color": "#2a2a2a", "name": "נקי מפתח", "type": "circle", "groupId": null, "day": 2}, {"lat": 40.24492282069156, "lng": -77.17048466205598, "angle": 118, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24645623295087, "lng": -77.17006623744966, "angle": 120, "color": "#00f0ff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.246155285621036, "lng": -77.16982483863832, "angle": 120, "color": "#00f0ff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245862526050274, "lng": -77.16958343982698, "angle": 123, "color": "#00f0ff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24556567064719, "lng": -77.16935276985168, "angle": 116, "color": "#00f0ff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245236057260605, "lng": -77.1691757440567, "angle": 108, "color": "#00f0ff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244900300359525, "lng": -77.16905504465105, "angle": 97, "color": "#00f0ff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24455635253893, "lng": -77.16901481151582, "angle": 90, "color": "#00f0ff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244218544942655, "lng": -77.16905236244203, "angle": 80, "color": "#00f0ff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24389506699777, "lng": -77.16918379068376, "angle": 62, "color": "#00f0ff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24338323164866, "lng": -77.16937422752382, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24305565499428, "lng": -77.16926157474519, "angle": 262, "color": "#8b4513", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24290005552819, "lng": -77.1689772605896, "angle": 164, "color": "#8b4513", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24272807675484, "lng": -77.16947615146637, "angle": 50, "color": "#8b4513", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.242547908047484, "lng": -77.1698945760727, "angle": 16, "color": "#8b4513", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24433933694343, "lng": -77.16937959194185, "angle": 171, "color": "#8b4513", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244419182384945, "lng": -77.16984629631044, "angle": 155, "color": "#8b4513", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244636197724475, "lng": -77.17022716999055, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245234009967476, "lng": -77.17069923877717, "angle": 117, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245553386947286, "lng": -77.17092454433443, "angle": 119, "color": "#8b4513", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24585228967874, "lng": -77.17114448547365, "angle": 119, "color": "#8b4513", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24440689847699, "lng": -77.16899871826172, "angle": 43, "color": "#ff3e3e", "name": "חסימת ציר(דרום\\צפון)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24431476909634, "lng": -77.16927498579027, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר(מזרח\\מערב)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24353268797061, "lng": -77.16948151588441, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר יום לבן", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.244815337221134, "lng": -77.17205107212068, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (מערב\\מזרח)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.242977855305945, "lng": -77.17209398746492, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (צ.מע\\ד.מז)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.241816991441404, "lng": -77.17128798365594, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24232883863233, "lng": -77.17297643423082, "angle": 53, "color": "#ffff00", "name": "נק׳ מפתח(ריכוז תשתיות מים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24670804499462, "lng": -77.17024326324464, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח((תשתיות מרכזיות)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24505896617581, "lng": -77.17162862420082, "angle": 69, "color": "#ffff00", "name": "נק׳ מפתח(שינויי גבהים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.242846824049785, "lng": -77.16856151819229, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24245168138233, "lng": -77.17023789882661, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24522582079434, "lng": -77.1745938062668, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}];

    async function loadMission() {
        let sourceData = BAKED_DATA;
        try {
            const resp = await fetch('/api/mission');
            if (resp.ok) {
                const parsed = await resp.json();
                if (Array.isArray(parsed) && parsed.length > 0) sourceData = parsed;
            }
        } catch (e) {}

        sourceData.forEach(d => {
            polygons.push(createObject(d.lat, d.lng, d.angle || 0, d.color, d.name, d.type, d.groupId, d.day));
        });
        updateDaySelection('all');
    }

    loadMission();
});
