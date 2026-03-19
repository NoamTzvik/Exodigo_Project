document.addEventListener('DOMContentLoaded', () => {
    const centerPoint = [40.2467, -77.17220];

    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 10
    }).setView(centerPoint, 17);

    // GOOGLE HYBRID (SHARPEST RAW FORM)
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let selectedIndex = -1;
    let isAddMode = false;
    let currentShape = 'sector';

    // --- COORDINATE DISPLAY ---
    const coordDisplay = L.control({ position: 'bottomleft' });
    coordDisplay.onAdd = function () {
        this._div = L.DomUtil.create('div', 'coord-box');
        return this._div;
    };
    coordDisplay.addTo(map);

    map.on('mousemove', (e) => {
        const { lat, lng } = e.latlng;
        const elev = (130 + Math.sin(lat * 1000) * 5 + (lat - 40.24) * 2000).toFixed(1);
        coordDisplay._div.innerHTML = `LAT: ${lat.toFixed(6)}<br>LNG: ${lng.toFixed(6)}<br>ELEV: ${elev} m`;
    });

    function createObject(lat, lng, angle = 0, color = '#00f0ff', name = '', type = 'sector', groupId = null, dayOverride = null) {
        let layer;
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (angle * Math.PI) / 180;
        
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.y}];
            const rotated = corners.map(c => [lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter]);
            layer = L.polygon(rotated, { color: color, weight: 5, fillOpacity: type === 'sector' ? 0.2 : 0.6, zIndex: 500 });
        } else {
            layer = L.circle([lat, lng], { radius: (type === 'array' ? 4 : 0.5), color: color, weight: 3, fillOpacity: 0.5, zIndex: 600 });
        }
        
        layer.addTo(map);
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'poly-label' });

        const marker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({ className: 'drag-handle-container', html: '<div></div>', iconSize: [12, 12] })
        });
        
        let day = dayOverride;
        if (!day) {
            const n = (name || '').toLowerCase();
            if (color === '#ff3e3e' || n.includes('block') || n.includes('חסימה')) day = 'roadblock';
            else if (color === '#ffff00' || n.includes('key')) day = 'prescan';
            else if (color === '#00f0ff') day = 1;
            else if (color === '#2a2a2a') day = 2;
            else if (color === '#8b4513') day = 3;
            else if (color === '#ff9d00') day = 4;
            else if (color === '#ffffff') day = 5;
        }

        const obj = { layer, marker, lat, lng, angle, color, name, type, day, groupId };
        
        layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            selectPolygon(polygons.indexOf(obj));
        });

        marker.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            obj.lat = newPos.lat; obj.lng = newPos.lng;
            redrawObject(obj);
        });

        return obj;
    }

    function redrawObject(p) {
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (p.angle * Math.PI) / 180;
        if (p.type === 'sector' || p.type === 'barrier') {
            const size = p.type === 'sector' ? {y:20, x:5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.y}];
            const rotated = corners.map(c => [p.lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, p.lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter]);
            p.layer.setLatLngs(rotated);
        } else {
            p.layer.setLatLng([p.lat, p.lng]);
        }
    }

    function selectPolygon(index) {
        selectedIndex = index;
        polygons.forEach((p, i) => {
            p.layer.setStyle({ color: p.color, weight: 5, fillOpacity: p.type === 'sector' ? 0.2 : 0.6 });
            if (i === index) { 
                p.marker.addTo(map); 
                p.layer.setStyle({ color: '#fff' }); 
            } else { 
                map.removeLayer(p.marker); 
            }
        });

        const editor = document.getElementById('editor-panel');
        if (index !== -1) {
            editor.style.display = 'flex';
            const p = polygons[index];
            document.getElementById('poly-name-input').value = p.name;
            document.getElementById('rotation-slider').value = p.angle;
            document.getElementById('angle-value').innerText = `${p.angle}°`;
        } else {
            editor.style.display = 'none';
        }
    }

    // --- INTERACTIVE HANDLERS ---
    map.on('click', (e) => {
        if (!isAddMode) {
            selectPolygon(-1);
            return;
        }
        const activeColor = document.querySelector('.color-swatch.active')?.getAttribute('data-color') || '#00f0ff';
        const newObj = createObject(e.latlng.lat, e.latlng.lng, 0, activeColor, 'NEW OBJECT', currentShape);
        polygons.push(newObj);
        updateStats();
        selectPolygon(polygons.length - 1);
    });

    document.getElementById('add-mode-btn').addEventListener('click', () => {
        isAddMode = !isAddMode;
        document.getElementById('add-mode-btn').classList.toggle('active', isAddMode);
        document.getElementById('map').style.cursor = isAddMode ? 'crosshair' : '';
    });

    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentShape = btn.id.replace('shape-', '');
        });
    });

    document.getElementById('poly-name-input').addEventListener('input', (e) => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        p.name = e.target.value;
        p.layer.unbindTooltip();
        if (p.name) p.layer.bindTooltip(p.name, { permanent: true, direction: 'center', className: 'poly-label' });
    });

    document.getElementById('rotation-slider').addEventListener('input', (e) => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        p.angle = parseInt(e.target.value);
        document.getElementById('angle-value').innerText = `${p.angle}°`;
        redrawObject(p);
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            if (selectedIndex !== -1) {
                const p = polygons[selectedIndex];
                p.color = swatch.getAttribute('data-color');
                p.layer.setStyle({ color: p.color });
            }
        });
    });

    document.getElementById('delete-poly-btn').addEventListener('click', () => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        map.removeLayer(p.layer);
        map.removeLayer(p.marker);
        polygons.splice(selectedIndex, 1);
        updateStats();
        selectPolygon(-1);
    });

    // --- BAKED DATA ---
    const BAKED_DATA = [{"lat": 40.242748550441235, "lng": -77.17235147953035, "angle": 229, "color": "#ff9d00", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24507022631638, "lng": -77.17415928840639, "angle": 156, "color": "#ff9d00", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244791793200065, "lng": -77.17401444911957, "angle": 74, "color": "#ff9d00", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24442327702043, "lng": -77.17406272888185, "angle": 93, "color": "#ff9d00", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244062948149455, "lng": -77.17401444911957, "angle": 99, "color": "#ff9d00", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24372309075217, "lng": -77.1739447116852, "angle": 100, "color": "#ff9d00", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24336275815419, "lng": -77.1738588809967, "angle": 101, "color": "#ff9d00", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24301061308037, "lng": -77.17376232147218, "angle": 102, "color": "#ff9d00", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.242674845141195, "lng": -77.17357456684114, "angle": 126, "color": "#ff9d00", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24249058154004, "lng": -77.17317223548889, "angle": 170, "color": "#ff9d00", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.2425274343004, "lng": -77.1727216243744, "angle": 211, "color": "#ff9d00", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24556157608081, "lng": -77.17238903045656, "angle": 105, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.245234009967476, "lng": -77.17222809791566, "angle": 116, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.244926915296595, "lng": -77.17199742794038, "angle": 119, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24461572460895, "lng": -77.17175602912903, "angle": 120, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24430862713315, "lng": -77.17153072357179, "angle": 118, "color": "#ffffff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24399333894197, "lng": -77.17132687568666, "angle": 118, "color": "#ffffff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243678049282316, "lng": -77.1710640192032, "angle": 131, "color": "#ffffff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24348559902806, "lng": -77.17067241668703, "angle": 162, "color": "#ffffff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243436462705255, "lng": -77.17021644115448, "angle": 183, "color": "#ffffff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24351016717609, "lng": -77.16975510120393, "angle": 204, "color": "#ffffff", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24470990088907, "lng": -77.17225492000581, "angle": 34, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24443146629067, "lng": -77.17253923416139, "angle": 64, "color": "#2a2a2a", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.244075232119826, "lng": -77.17259824275972, "angle": 99, "color": "#2a2a2a", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24371490139624, "lng": -77.17252850532533, "angle": 101, "color": "#2a2a2a", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24338323164866, "lng": -77.17234611511232, "angle": 127, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.243117075737736, "lng": -77.1720188856125, "angle": 134, "color": "#2a2a2a", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24286729770028, "lng": -77.17167019844057, "angle": 136, "color": "#2a2a2a", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24256838178838, "lng": -77.17142879962923, "angle": 95, "color": "#2a2a2a", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2422203273511, "lng": -77.17141807079317, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24199920948497, "lng": -77.1714609861374, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2445, "lng": -77.17205, "angle": 0, "color": "#2a2a2a", "name": "נקי מפתח", "type": "circle", "groupId": null, "day": 2}, {"lat": 40.24492282069156, "lng": -77.17048466205598, "angle": 118, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24645623295087, "lng": -77.17006623744966, "angle": 120, "color": "#00f0ff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.246155285621036, "lng": -77.16982483863832, "angle": 120, "color": "#00f0ff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245862526050274, "lng": -77.16958343982698, "angle": 123, "color": "#00f0ff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24556567064719, "lng": -77.16935276985168, "angle": 116, "color": "#00f0ff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245236057260605, "lng": -77.1691757440567, "angle": 108, "color": "#00f0ff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244900300359525, "lng": -77.16905504465105, "angle": 97, "color": "#00f0ff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24455635253893, "lng": -77.16901481151582, "angle": 90, "color": "#00f0ff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244218544942655, "lng": -77.16905236244203, "angle": 80, "color": "#00f0ff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24389506699777, "lng": -77.16918379068376, "angle": 62, "color": "#00f0ff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24338323164866, "lng": -77.16937422752382, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24305565499428, "lng": -77.16926157474519, "angle": 262, "color": "#8b4513", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24290005552819, "lng": -77.1689772605896, "angle": 164, "color": "#8b4513", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24272807675484, "lng": -77.16947615146637, "angle": 50, "color": "#8b4513", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.242547908047484, "lng": -77.1698945760727, "angle": 16, "color": "#8b4513", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24433933694343, "lng": -77.16937959194185, "angle": 171, "color": "#8b4513", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244419182384945, "lng": -77.16984629631044, "angle": 155, "color": "#8b4513", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244636197724475, "lng": -77.17022716999055, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245234009967476, "lng": -77.17069923877717, "angle": 117, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245553386947286, "lng": -77.17092454433443, "angle": 119, "color": "#8b4513", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24585228967874, "lng": -77.17114448547365, "angle": 119, "color": "#8b4513", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24440689847699, "lng": -77.16899871826172, "angle": 43, "color": "#ff3e3e", "name": "חסימת ציר(דרום\\צפון)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24431476909634, "lng": -77.16927498579027, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר(מזרח\\מערב)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24353268797061, "lng": -77.16948151588441, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר יום לבן", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.244815337221134, "lng": -77.17205107212068, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (מערב\\מזרח)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.242977855305945, "lng": -77.17209398746492, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (צ.מע\\d.מז)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.241816991441404, "lng": -77.17128798365594, "angle": 0, "color": "#ffff00", "name": "נקי מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24232883863233, "lng": -77.17297643423082, "angle": 53, "color": "#ffff00", "name": "נקי מפתח(ריכוז תשתיות מים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24670804499462, "lng": -77.17024326324464, "angle": 0, "color": "#ffff00", "name": "נקי מפתח((תשתיות מרכזיות)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24505896617581, "lng": -77.17162862420082, "angle": 69, "color": "#ffff00", "name": "נקי מפתח(שינויי גבהים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.242846824049785, "lng": -77.16856151819229, "angle": 0, "color": "#ffff00", "name": "נקי מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24245168138233, "lng": -77.17023789882661, "angle": 0, "color": "#ffff00", "name": "נקי מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24522582079434, "lng": -77.1745938062668, "angle": 0, "color": "#ffff00", "name": "נקי מפתח", "type": "barrier", "groupId": null, "day": "prescan"}];

    async function loadMission() {
        let sourceData = BAKED_DATA;
        polygons = [];
        sourceData.forEach(d => {
            polygons.push(createObject(d.lat, d.lng, d.angle, d.color, d.name, d.type, d.groupId, d.day));
        });
        updateStats();
        selectPolygon(-1);
    }

    function updateStats() {
        const statsPill = document.getElementById('poly-stats');
        if (statsPill) statsPill.innerHTML = `<strong>${polygons.length}</strong> OBJECTS PLANNED`;
    }

    // --- TEMPORAL FILTERS ---
    document.querySelectorAll('#day-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const daySelected = btn.getAttribute('data-day');
            document.querySelectorAll('#day-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            polygons.forEach(p => {
                const pDays = Array.isArray(p.day) ? p.day.map(String) : [String(p.day)];
                const show = (daySelected === 'all') || pDays.includes(daySelected);
                if (show) { p.layer.addTo(map); } else { map.removeLayer(p.layer); map.removeLayer(p.marker); }
            });
            selectPolygon(-1);
        });
    });

    loadMission();
});
