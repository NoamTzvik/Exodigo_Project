document.addEventListener('DOMContentLoaded', () => {
    const centerPoint = [40.2467, -77.17220];

    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 10
    }).setView(centerPoint, 17);

    // BASE SATELLITE
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 22,
        maxNativeZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let isAddMode = false;
    let currentShape = 'sector';

    // --- SCHEDULE DATA ---
    const dailySchedules = {
        "1": { name: "MONDAY", tasks: ["08:30 - Travel from AB&B", "09:00 - Weekly Team Meeting", "10:30 - Day 1 Scan (Blue)"] },
        "2": { name: "TUESDAY", tasks: ["07:30 - Morning Briefing", "08:30 - Day 2 Scan (Black)"] },
        "3": { name: "WEDNESDAY", tasks: ["08:00 - Snow Delay Check", "13:00 - Day 3 Scan (Brown)"] },
        "4": { name: "THURSDAY", tasks: ["07:30 - Morning Briefing", "08:30 - Day 4 Scan (Orange)"] },
        "5": { name: "FRIDAY", tasks: ["08:30 - Day 5 Scan (White)", "14:00 - Key Point Verification", "16:30 - Departure"] }
    };

    // --- PROTOCOL MODAL ENGINE ---
    function showDaySchedule(dayId) {
        const schedule = dailySchedules[dayId];
        if (!schedule) return;

        const modal = document.createElement('div');
        modal.className = "protocol-modal-dynamic";
        modal.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#111;padding:25px;border-radius:15px;border:1px solid #00f0ff;z-index:10000;width:400px;box-shadow:0 0 40px rgba(0,0,0,0.8);color:#fff;font-family:sans-serif;border-left:5px solid #00f0ff;";
        
        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h2 style="margin:0;color:#00f0ff;font-size:1.2rem;">${schedule.name} PROTOCOL</h2>
                <button id="close-proto" style="background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer;">&times;</button>
            </div>
            <div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;">
                ${schedule.tasks.map(t => `<p style="margin:10px 0;font-size:14px;border-bottom:1px solid #222;padding-bottom:5px;">${t}</p>`).join('')}
            </div>
            <p style="font-size:11px;color:#666;margin-top:15px;text-align:center;">Mission Control Sync Live</p>
        `;
        
        const overlay = document.createElement('div');
        overlay.style = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(3px);z-index:9999;";
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        const close = () => { modal.remove(); overlay.remove(); };
        document.getElementById('close-proto').onclick = close;
        overlay.onclick = close;
    }

    // --- SIDEBAR INTERACTION ---
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = btn.getAttribute('data-day');
            
            // 1. Filter Map
            polygons.forEach(p => {
                const show = (day === 'all') || (String(p.day) === day);
                if (show) p.layer.addTo(map);
                else { map.removeLayer(p.layer); map.removeLayer(p.marker); }
            });

            // 2. Highlight Button
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 3. Show Schedule Modal (if it's a specific day)
            if (day !== 'all' && dailySchedules[day]) {
                showDaySchedule(day);
            }
        });
    });

    const scheduleTitle = document.getElementById('schedule-title');
    if (scheduleTitle) {
        scheduleTitle.style.cursor = 'pointer';
        scheduleTitle.onclick = () => {
            const todayIdx = new Date().getDay(); // 0-6
            const dayMap = ["1","1","2","3","4","5","1"]; // Sun->Mon, Mon->1, etc.
            showDaySchedule(dayMap[todayIdx]);
        };
    }

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
        const marker = L.marker([lat, lng], { draggable: true, icon: L.divIcon({ className: 'drag-handle', html: '<div></div>', iconSize: [12, 12] }) }).addTo(map);
        const obj = { layer, marker, lat, lng, angle, color, name, type, day: dayOverride, groupId };
        marker.on('dragend', (e) => { const newPos = e.target.getLatLng(); obj.lat = newPos.lat; obj.lng = newPos.lng; updateObjectLayer(obj); });
        return obj;
    }

    function updateObjectLayer(obj) {
        const { lat, lng, angle, type } = obj;
        const latPerMeter = 0.000009; const lonPerMeter = 0.000012;
        const rad = (angle * Math.PI) / 180;
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5.5} : {y:3, x:3};
            const corners = [{y:size.y, x:size.x}, {y:size.y, x:-size.x}, {y:-size.y, x:-size.x}, {y:-size.y, x:size.x}];
            const rotated = corners.map(c => [lat + (c.y*Math.sin(rad)+c.x*Math.cos(rad))*latPerMeter, lng + (c.y*Math.cos(rad)-c.x*Math.sin(rad))*lonPerMeter]);
            obj.layer.setLatLngs(rotated);
        } else { obj.layer.setLatLng([lat, lng]); }
    }

    // --- SAVE LOGIC ---
    window.saveMission = async () => {
        const btn = document.getElementById('save-mission-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = 'SAVING...';
        const dataToSave = polygons.map(p => ({ lat: p.lat, lng: p.lng, angle: p.angle, color: p.color, name: p.name, type: p.type, day: p.day, groupId: p.groupId }));
        try {
            const resp = await fetch('/api/mission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
            if (resp.ok) { btn.innerHTML = '✓ SAVED'; setTimeout(() => { btn.innerHTML = originalText; }, 2000); }
        } catch (e) { btn.innerHTML = 'SAVE FAILED'; setTimeout(() => { btn.innerHTML = originalText; }, 2000); }
    };
    document.getElementById('save-mission-btn').addEventListener('click', window.saveMission);

    const BAKED_DATA = [{"lat": 40.24523, "lng": -77.17222, "angle": 165, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "day": 5}, {"lat": 40.24492, "lng": -77.17199, "angle": 165, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "day": 5}, {"lat": 40.24461, "lng": -77.17175, "angle": 165, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "day": 5}, {"lat": 40.24430, "lng": -77.17153, "angle": 165, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "day": 5}, {"lat": 40.24421, "lng": -77.16905, "angle": 150, "color": "#00f0ff", "name": "פוליגון 8", "type": "sector", "day": 1}, {"lat": 40.2447, "lng": -77.17225, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "day": 2}, {"lat": 40.243383, "lng": -77.169374, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "day": 3}, {"lat": 40.24507, "lng": -77.17415, "angle": 170, "color": "#ff9d00", "name": "פוליגון 1", "type": "sector", "day": 4}];

    async function loadMission() {
        let sourceData = BAKED_DATA;
        try {
            const resp = await fetch('/api/mission');
            if (resp.ok) { const data = await resp.json(); if (Array.isArray(data) && data.length > 0) sourceData = data; }
        } catch (e) {}
        sourceData.forEach(d => { polygons.push(createObject(d.lat, d.lng, d.angle, d.color, d.name, d.type, d.groupId, d.day)); });
    }
    loadMission();
});
