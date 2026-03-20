document.addEventListener('DOMContentLoaded', () => {
    const centerPoint = [40.2467, -77.17220];

    // Initialize Map
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 10
    }).setView(centerPoint, 17);

    // Base Sat Layer
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 22,
        maxNativeZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let isAddMode = false;
    let currentShape = 'sector';

    // --- COORD DISPLAY ---
    const coordDisplay = L.control({ position: 'bottomleft' });
    coordDisplay.onAdd = function () {
        this._div = L.DomUtil.create('div', 'coord-box');
        this._div.style.cssText = 'background:rgba(14,18,25,0.9);color:#00f0ff;padding:12px;font-family:monospace;border-radius:8px;border:1px solid #00f0ff;font-size:12px;';
        return this._div;
    };
    coordDisplay.addTo(map);

    map.on('mousemove', (e) => {
        const { lat, lng } = e.latlng;
        coordDisplay._div.innerHTML = `LAT: ${lat.toFixed(6)}<br>LNG: ${lng.toFixed(6)}`;
    });

    // --- OBJECT CREATION & MGMT ---
    function createObject(data) {
        const { lat, lng, angle = 0, color = '#00f0ff', name = '', type = 'sector', groupId = null, day = null } = data;
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (angle * Math.PI) / 180;
        
        let layer;
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5.5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.x}];
            const rotated = corners.map(c => [
                lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, 
                lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter
            ]);
            layer = L.polygon(rotated, { color: color, weight: 3, fillOpacity: type === 'sector' ? 0.2 : 0.6 });
        } else {
            layer = L.circle([lat, lng], { radius: 0.5, color: color, weight: 2, fillOpacity: 0.5 });
        }
        
        layer.addTo(map);
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'poly-label' });

        const marker = L.marker([lat, lng], {
            draggable: true,
            icon: L.divIcon({ className: 'drag-handle', html: '<div style="width:10px;height:10px;background:white;border:2px solid black;border-radius:50%"></div>', iconSize: [10, 10] })
        }).addTo(map);

        const obj = { layer, marker, lat, lng, angle, color, name, type, day, groupId };

        marker.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            obj.lat = newPos.lat;
            obj.lng = newPos.lng;
            updateLayerGeometry(obj);
        });

        marker.on('dragend', () => {
             showSaveAlert('SAVING...');
             saveMission();
        });

        return obj;
    }

    function updateLayerGeometry(obj) {
        const { lat, lng, angle, type } = obj;
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (angle * Math.PI) / 180;
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5.5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.x}];
            const rotated = corners.map(c => [
                lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, 
                lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter
            ]);
            obj.layer.setLatLngs(rotated);
        } else {
            obj.layer.setLatLng([lat, lng]);
        }
    }

    // --- SHARED DATA OPS ---
    const BAKED_DATA = [
        {"lat": 40.24523, "lng": -77.17222, "angle": 165, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "day": 5},
        {"lat": 40.24492, "lng": -77.17199, "angle": 165, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "day": 5},
        {"lat": 40.24461, "lng": -77.17175, "angle": 165, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "day": 5},
        {"lat": 40.24430, "lng": -77.17153, "angle": 165, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "day": 5},
        {"lat": 40.24399, "lng": -77.17132, "angle": 165, "color": "#ffffff", "name": "פוליגון 5", "type": "sector", "day": 5},
        {"lat": 40.24367, "lng": -77.17106, "angle": 165, "color": "#ffffff", "name": "פוליגון 6", "type": "sector", "day": 5},
        {"lat": 40.24348, "lng": -77.17067, "angle": 160, "color": "#ffffff", "name": "פוליגון 7", "type": "sector", "day": 5},
        {"lat": 40.24343, "lng": -77.17021, "angle": 155, "color": "#ffffff", "name": "פוליגון 8", "type": "sector", "day": 5},
        {"lat": 40.24507,"lng": -77.17415,"angle": 170,"color": "#ff9d00","name": "פוליגון 1","type": "sector","day": 4},
        {"lat": 40.24479,"lng": -77.17401,"angle": 170,"color": "#ff9d00","name": "פוליגון 2","type": "sector","day": 4},
        {"lat": 40.24442,"lng": -77.17406,"angle": 170,"color": "#ff9d00","name": "פוליגון 3","type": "sector","day": 4},
        {"lat": 40.24406,"lng": -77.17401,"angle": 170,"color": "#ff9d00","name": "פוליגון 4","type": "sector","day": 4},
        {"lat": 40.24372,"lng": -77.17394,"angle": 165,"color": "#ff9d00","name": "פוליגון 5","type": "sector","day": 4},
        {"lat": 40.24336,"lng": -77.17385,"angle": 160,"color": "#ff9d00","name": "פוליגון 6","type": "sector","day": 4},
        {"lat": 40.24301,"lng": -77.17376,"angle": 155,"color": "#ff9d00","name": "פוליגון 7","type": "sector","day": 4},
        {"lat": 40.24267,"lng": -77.17357,"angle": 145,"color": "#ff9d00","name": "פוליגון 8","type": "sector","day": 4},
        {"lat": 40.24645,"lng": -77.17006,"angle": 200,"color": "#00f0ff","name": "פוליגון 1","type": "sector","day": 1},
        {"lat": 40.24615,"lng": -77.16982,"angle": 190,"color": "#00f0ff","name": "פוליגון 2","type": "sector","day": 1},
        {"lat": 40.24586,"lng": -77.16958,"angle": 180,"color": "#00f0ff","name": "פוליגון 3","type": "sector","day": 1},
        {"lat": 40.24556,"lng": -77.16935,"angle": 170,"color": "#00f0ff","name": "פוליגון 4","type": "sector","day": 1},
        {"lat": 40.24523,"lng": -77.16917,"angle": 165,"color": "#00f0ff","name": "פוליגון 5","type": "sector","day": 1},
        {"lat": 40.24490,"lng": -77.16905,"angle": 160,"color": "#00f0ff","name": "פוליגון 6","type": "sector","day": 1},
        {"lat": 40.24445,"lng": -77.16901,"angle": 155,"color": "#00f0ff","name": "פוליגון 7","type": "sector", "day": 1},
        {"lat": 40.24421,"lng": -77.16905,"angle": 150,"color": "#00f0ff","name": "פוליגון 8","type": "sector","day": 1},
        {"lat": 40.24470, "lng": -77.17225, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "day": 2},
        {"lat": 40.24443, "lng": -77.17253, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 2", "type": "sector", "day": 2},
        {"lat": 40.24407, "lng": -77.17259, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 3", "type": "sector", "day": 2},
        {"lat": 40.24371, "lng": -77.17252, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 4", "type": "sector", "day": 2},
        {"lat": 40.24338, "lng": -77.17234, "angle": 165, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "day": 2},
        {"lat": 40.243383, "lng": -77.169374, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "day": 3},
        {"lat": 40.243055, "lng": -77.169261, "angle": 262, "color": "#8b4513", "name": "פוליגון 2", "type": "sector", "day": 3},
        {"lat": 40.242900, "lng": -77.168977, "angle": 164, "color": "#8b4513", "name": "פוליגון 3", "type": "sector", "day": 3},
        {"lat": 40.242728, "lng": -77.169476, "angle": 50, "color": "#8b4513", "name": "פוליגון 4", "type": "sector", "day": 3},
        {"lat": 40.242547, "lng": -77.169894, "angle": 16, "color": "#8b4513", "name": "פוליגון 5", "type": "sector", "day": 3},
        {"lat": 40.244339, "lng": -77.169379, "angle": 171, "color": "#8b4513", "name": "פוליגון 6", "type": "sector", "day": 3},
        {"lat": 40.244419, "lng": -77.169846, "angle": 155, "color": "#8b4513", "name": "פוליגון 7", "type": "sector", "day": 3},
        {"lat": 40.244636, "lng": -77.170227, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "day": 3},
        {"lat": 40.245234, "lng": -77.170699, "angle": 117, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "day": 3},
        {"lat": 40.245553, "lng": -77.170924, "angle": 119, "color": "#8b4513", "name": "פוליגון 10", "type": "sector", "day": 3},
        {"lat": 40.245852, "lng": -77.171144, "angle": 119, "color": "#8b4513", "name": "פוליגון 11", "type": "sector", "day": 3},
        {"lat": 40.24440,"lng": -77.16899,"angle": 43,"color": "#ff3e3e","name": "חסימת ציר","type": "barrier","day": "roadblock"},
        {"lat": 40.24297,"lng": -77.17209,"angle": 0,"color": "#ff3e3e","name": "חסימת ציר","type": "barrier","day": "roadblock"},
        {"lat": 40.24670,"lng": -77.17024,"angle": 0,"color": "#ffff00","name": "נקי מפתח","type": "barrier","day": "prescan"}
    ];

    async function saveMission() {
        const payload = polygons.map(p => ({
            lat: p.lat, lng: p.lng, angle: p.angle, color: p.color,
            name: p.name, type: p.type, day: p.day, groupId: p.groupId
        }));

        try {
            await fetch('/api/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            showSaveAlert('✓ SAVED');
        } catch (e) {
            console.error("Save failed", e);
            showSaveAlert('SAVE FAILED');
        }
    }

    function showSaveAlert(text) {
        const btn = document.getElementById('save-mission-btn');
        if (!btn) return;
        const oldText = btn.innerHTML;
        btn.innerHTML = `<span class="icon">💾</span> ${text}`;
        if (text.includes('✓')) {
            btn.style.borderColor = '#00d166';
            btn.style.color = '#00d166';
        }
        setTimeout(() => {
            btn.innerHTML = '<span class="icon">💾</span> SAVE MISSION';
            btn.style.borderColor = '';
            btn.style.color = '';
        }, 2000);
    }

    window.saveMission = saveMission; // Global for buttons
    document.getElementById('save-mission-btn').addEventListener('click', saveMission);

    async function loadMission() {
        let sourceData = BAKED_DATA;
        try {
            const resp = await fetch('/api/mission');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) sourceData = data;
            }
        } catch (e) { console.warn("Using fallback data"); }

        sourceData.forEach(d => {
            polygons.push(createObject(d));
        });
    }

    loadMission();
});
