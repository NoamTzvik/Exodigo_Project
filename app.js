document.addEventListener('DOMContentLoaded', () => {
    const centerPoint = [40.2467, -77.17220];

    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        maxZoom: 22,
        minZoom: 10
    }).setView(centerPoint, 17);

    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    let polygons = [];
    let selectedIndex = -1;
    let isAddMode = false;
    let currentShape = 'sector';

    // --- INJECT DEPLOY BUTTON ---
    const saveBtn = document.getElementById('save-mission-btn');
    if (saveBtn) {
        const deployBtn = document.createElement('button');
        deployBtn.className = 'planner-btn';
        deployBtn.id = 'prepare-deploy-btn';
        deployBtn.style.marginLeft = '10px';
        deployBtn.style.borderColor = '#ff9d00';
        deployBtn.style.color = '#ff9d00';
        deployBtn.innerHTML = '<span class="icon">🚀</span> DEPLOY TO VERCEL';
        saveBtn.parentNode.insertBefore(deployBtn, saveBtn.nextSibling);

        deployBtn.addEventListener('click', () => {
            const data = polygons.map(p => ({
                lat: p.lat, lng: p.lng, angle: p.angle, color: p.color, 
                name: p.name, type: p.type, groupId: p.groupId, day: p.day
            }));
            const code = JSON.stringify(data);
            const modal = document.createElement('div');
            modal.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#111;padding:20px;border-radius:15px;border:1px solid #ff9d00;z-index:9999;width:80%;max-width:600px;box-shadow:0 0 50px rgba(0,0,0,0.8);color:#fff;font-family:sans-serif;";
            modal.innerHTML = `
                <h2 style="margin-top:0;color:#ff9d00;">READY FOR VERCEL DEPLOYMENT 🛰️</h2>
                <textarea id="deploy-code" style="width:100%;height:150px;background:#000;color:#00f0ff;border:1px solid #333;padding:10px;font-family:monospace;border-radius:8px;">${code}</textarea>
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:15px;">
                    <button id="close-deploy" style="background:transparent;color:#fff;border:1px solid #555;padding:8px 15px;border-radius:8px;cursor:pointer;">CLOSE</button>
                    <button id="copy-deploy" style="background:#ff9d00;color:#000;border:none;padding:8px 15px;border-radius:8px;font-weight:bold;cursor:pointer;">COPY CODE</button>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('copy-deploy').onclick = () => {
                const ta = document.getElementById('deploy-code');
                ta.select();
                document.execCommand('copy');
                document.getElementById('copy-deploy').innerText = '✓ COPIED';
            };
            document.getElementById('close-deploy').onclick = () => modal.remove();
        });
    }

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
        const latPerMeter = 1 / 111320; 
        const lonPerMeter = 1 / (40075000 * Math.cos(lat * Math.PI / 180) / 360);
        const rad = (angle * Math.PI) / 180;
        
        if (type === 'sector' || type === 'barrier') {
            const size = type === 'sector' ? {y:20, x:5} : {y:3, x:3};
            const corners = [
                {y: size.y, x: size.x}, {y: size.y, x: -size.x}, 
                {y: -size.y, x: -size.x}, {y: -size.y, x: size.x}
            ];
            const rotated = corners.map(c => [
                lat + (c.y * Math.cos(rad) - c.x * Math.sin(rad)) * latPerMeter,
                lng + (c.y * Math.sin(rad) + c.x * Math.cos(rad)) * lonPerMeter
            ]);
            layer = L.polygon(rotated, { color: color, weight: 5, fillOpacity: type === 'sector' ? 0.2 : 0.6, zIndex: 500 });
        } else {
            layer = L.circle([lat, lng], { radius: 1, color: color, weight: 3, fillOpacity: 0.5, zIndex: 600 });
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
            else if (color === '#00d166') day = 6;
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
        const latPerMeter = 1 / 111320;
        const lonPerMeter = 1 / (40075000 * Math.cos(p.lat * Math.PI / 180) / 360);
        const rad = (p.angle * Math.PI) / 180;
        
        if (p.type === 'sector' || p.type === 'barrier') {
            const size = p.type === 'sector' ? {y:20, x:5} : {y:3, x:3};
            const corners = [
                {y: size.y, x: size.x}, {y: size.y, x: -size.x}, 
                {y: -size.y, x: -size.x}, {y: -size.y, x: size.x}
            ];
            const rotated = corners.map(c => [
                p.lat + (c.y * Math.cos(rad) - c.x * Math.sin(rad)) * latPerMeter,
                p.lng + (c.y * Math.sin(rad) + c.x * Math.cos(rad)) * lonPerMeter
            ]);
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
                p.layer.setStyle({ color: '#fff', weight: 8, fillOpacity: 0.5 }); 
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

    document.getElementById('rotation-slider').addEventListener('input', (e) => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        p.angle = parseInt(e.target.value);
        document.getElementById('angle-value').innerText = `${p.angle}°`;
        redrawObject(p);
    });

    document.getElementById('poly-name-input').addEventListener('input', (e) => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        p.name = e.target.value;
        p.layer.unbindTooltip();
        if (p.name) p.layer.bindTooltip(p.name, { permanent: true, direction: 'center', className: 'poly-label' });
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

    /** 
     * BAKED_DATA: Reconstructed from visual reference 
     * Includes RESTORED BROWN path (Day 3).
     */
    const BAKED_DATA = [
        // GREEN (Center Top)
        {"lat": 40.2472,"lng": -77.1724,"angle": 165,"color": "#00d166","name": "פוליגון 1","type": "sector","day": 6},
        {"lat": 40.2468,"lng": -77.1722,"angle": 165,"color": "#00d166","name": "פוליגון 2","type": "sector","day": 6},
        {"lat": 40.2464,"lng": -77.1720,"angle": 165,"color": "#00d166","name": "פוליגון 3","type": "sector","day": 6},
        {"lat": 40.2460,"lng": -77.1718,"angle": 165,"color": "#00d166","name": "פוליגון 4","type": "sector","day": 6},
        {"lat": 40.2456,"lng": -77.1716,"angle": 165,"color": "#00d166","name": "פוליגון 5","type": "sector","day": 6},
        {"lat": 40.2452,"lng": -77.1714,"angle": 165,"color": "#00d166","name": "פוליגון 6","type": "sector","day": 6},

        // WHITE (Inner Center)
        {"lat": 40.24523, "lng": -77.17222, "angle": 165, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "day": 5},
        {"lat": 40.24492, "lng": -77.17199, "angle": 165, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "day": 5},
        {"lat": 40.24461, "lng": -77.17175, "angle": 165, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "day": 5},
        {"lat": 40.24430, "lng": -77.17153, "angle": 165, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "day": 5},
        {"lat": 40.24399, "lng": -77.17132, "angle": 165, "color": "#ffffff", "name": "פוליגון 5", "type": "sector", "day": 5},
        {"lat": 40.24367, "lng": -77.17106, "angle": 165, "color": "#ffffff", "name": "פוליגון 6", "type": "sector", "day": 5},
        {"lat": 40.24348, "lng": -77.17067, "angle": 160, "color": "#ffffff", "name": "פוליגון 7", "type": "sector", "day": 5},
        {"lat": 40.24343, "lng": -77.17021, "angle": 155, "color": "#ffffff", "name": "פוליגון 8", "type": "sector", "day": 5},

        // ORANGE (Left Curve)
        {"lat": 40.24507,"lng": -77.17415,"angle": 170,"color": "#ff9d00","name": "פוליגון 1","type": "sector","day": 4},
        {"lat": 40.24479,"lng": -77.17401,"angle": 170,"color": "#ff9d00","name": "פוליגון 2","type": "sector","day": 4},
        {"lat": 40.24442,"lng": -77.17406,"angle": 170,"color": "#ff9d00","name": "פוליגון 3","type": "sector","day": 4},
        {"lat": 40.24406,"lng": -77.17401,"angle": 170,"color": "#ff9d00","name": "פוליגון 4","type": "sector","day": 4},
        {"lat": 40.24372,"lng": -77.17394,"angle": 165,"color": "#ff9d00","name": "פוליגון 5","type": "sector","day": 4},
        {"lat": 40.24336,"lng": -77.17385,"angle": 160,"color": "#ff9d00","name": "פוליגון 6","type": "sector","day": 4},
        {"lat": 40.24301,"lng": -77.17376,"angle": 155,"color": "#ff9d00","name": "פוליגון 7","type": "sector","day": 4},
        {"lat": 40.24267,"lng": -77.17357,"angle": 145,"color": "#ff9d00","name": "פוליגון 8","type": "sector","day": 4},

        // BLUE (Right Curve)
        {"lat": 40.24645,"lng": -77.17006,"angle": 200,"color": "#00f0ff","name": "פוליגון 1","type": "sector","day": 1},
        {"lat": 40.24615,"lng": -77.16982,"angle": 190,"color": "#00f0ff","name": "פוליגון 2","type": "sector","day": 1},
        {"lat": 40.24586,"lng": -77.16958,"angle": 180,"color": "#00f0ff","name": "פוליגון 3","type": "sector","day": 1},
        {"lat": 40.24556,"lng": -77.16935,"angle": 170,"color": "#00f0ff","name": "פוליגון 4","type": "sector","day": 1},
        {"lat": 40.24523,"lng": -77.16917,"angle": 165,"color": "#00f0ff","name": "פוליגון 5","type": "sector","day": 1},
        {"lat": 40.24490,"lng": -77.16905,"angle": 160,"color": "#00f0ff","name": "פוליגון 6","type": "sector","day": 1},
        {"lat": 40.24445,"lng": -77.16901,"angle": 155,"color": "#00f0ff","name": "פוליגון 7","type": "sector","day": 1},
        {"lat": 40.24421,"lng": -77.16905,"angle": 150,"color": "#00f0ff","name": "פוליגון 8","type": "sector","day": 1},

        // BLACK (Inner Left)
        {"lat": 40.24470, "lng": -77.17225, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "day": 2},
        {"lat": 40.24443, "lng": -77.17253, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 2", "type": "sector", "day": 2},
        {"lat": 40.24407, "lng": -77.17259, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 3", "type": "sector", "day": 2},
        {"lat": 40.24371, "lng": -77.17252, "angle": 170, "color": "#2a2a2a", "name": "פוליגון 4", "type": "sector", "day": 2},
        {"lat": 40.24338, "lng": -77.17234, "angle": 165, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "day": 2},

        // BROWN (Day 3) - RESTORED
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

        // BARRIERS
        {"lat": 40.24440,"lng": -77.16899,"angle": 43,"color": "#ff3e3e","name": "חסימת ציר","type": "barrier","day": "roadblock"},
        {"lat": 40.24297,"lng": -77.17209,"angle": 0,"color": "#ff3e3e","name": "חסימת ציר","type": "barrier","day": "roadblock"},
        {"lat": 40.24670,"lng": -77.17024,"angle": 0,"color": "#ffff00","name": "נקי מפתח","type": "barrier","day": "prescan"}
    ];

    async function loadMission() {
        let sourceData = BAKED_DATA;
        polygons = [];
        try {
            const resp = await fetch('/api/mission');
            if (resp.ok) {
                const data = await resp.json();
                if (Array.isArray(data) && data.length > 0) sourceData = data;
            }
        } catch (e) { console.log("Baked fallback."); }

        sourceData.forEach(d => {
            polygons.push(createObject(d.lat, d.lng, d.angle, d.color, d.name, d.type, d.groupId, d.day));
        });
        updateStats();
        selectPolygon(-1);
    }

    function updateStats() {
        const statsPill = document.getElementById('poly-stats');
        if (statsPill) {
            const sectors = polygons.filter(p => p.type === 'sector').length;
            const roadblocks = polygons.filter(p => p.day === 'roadblock').length;
            statsPill.innerHTML = `<strong>${sectors}</strong> SECTORS | <strong>${roadblocks}</strong> ROAD CLOSURES `;
        }
    }

    document.querySelectorAll('#day-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const day = btn.getAttribute('data-day');
            document.querySelectorAll('#day-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            polygons.forEach(p => {
                const show = (day === 'all') || (String(p.day) === day);
                if (show) { p.layer.addTo(map); } 
                else { map.removeLayer(p.layer); map.removeLayer(p.marker); }
            });
            selectPolygon(-1);
        });
    });

    async function saveMission() {
        const data = polygons.map(p => ({
            lat: p.lat, lng: p.lng, angle: p.angle, color: p.color, 
            name: p.name, type: p.type, groupId: p.groupId, day: p.day
        }));
        const saveBtn = document.getElementById('save-mission-btn');
        if (saveBtn) saveBtn.innerText = 'SAVING...';
        try {
            const resp = await fetch('/api/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (resp.ok) {
                if (saveBtn) {
                   saveBtn.innerText = '✓ SAVED';
                   setTimeout(() => saveBtn.innerHTML = '<span class="icon">💾</span> SAVE MISSION', 2000);
                }
            }
        } catch (e) { console.error(e); }
    }

    if (saveBtn) saveBtn.addEventListener('click', saveMission);

    loadMission();
});
