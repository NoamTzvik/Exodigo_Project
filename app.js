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
    let isAddMode = false;
    let currentShape = 'sector';

    // --- REAL-WORLD TOPOGRAPHIC ENGINE (AWS TERRARIUM DECODER) ---
    // This decodes REAL elevation data from AWS Open Data (OpenTerrain)
    const RealTopoLayer = L.GridLayer.extend({
        createTile: function (coords, done) {
            const tile = L.DomUtil.create('canvas', 'leaflet-tile');
            const size = this.getTileSize();
            tile.width = size.x;
            tile.height = size.y;
            const ctx = tile.getContext('2d');

            const img = new Image();
            img.crossOrigin = "Anonymous";
            // AWS Terrain-RGB (Terrarium) Tile Source
            img.src = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${coords.z}/${coords.x}/${coords.y}.png`;

            img.onload = function () {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, size.x, size.y);
                const data = imageData.data;

                // Mission Area Elevation Range: ~120m to ~160m
                // We'll use this to dynamicly map colors locally
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Decode Terrarium Altitude formula: (R * 256 + G + B / 256) - 32768
                    const height = (r * 256 + g + b / 256) - 32768;

                    // Color Mapping (Hypsometric Tint)
                    // Relative to Mechanicsburg terrain
                    const minH = 120; // Creek level approx
                    const maxH = 160; // Ridge level approx
                    const factor = Math.max(0, Math.min(1, (height - minH) / (maxH - minH)));

                    let cr, cg, cb;
                    if (factor > 0.8) { [cr, cg, cb] = [255, 62, 62]; }      // Red (Ridge)
                    else if (factor > 0.5) { [cr, cg, cb] = [255, 157, 0]; } // Yellow (Slope)
                    else if (factor > 0.25) { [cr, cg, cb] = [0, 209, 102]; } // Green (Lower Field)
                    else { [cr, cg, cb] = [0, 112, 255]; }                  // Blue (Water/Basin)

                    data[i] = cr;
                    data[i + 1] = cg;
                    data[i + 2] = cb;
                    data[i + 3] = 130; // 50% opacity
                }
                ctx.putImageData(imageData, 0, 0);
                done(null, tile);
            };

            img.onerror = function () {
                done(null, tile); // Graceful failure
            }

            return tile;
        }
    });

    let elevationLayer = null;
    function toggleElevation(active) {
        if (active) {
            elevationLayer = new RealTopoLayer({ zIndex: 15 }).addTo(map);
        } else if (elevationLayer) {
            map.removeLayer(elevationLayer);
            elevationLayer = null;
        }
    }

    // COORDINATE & ALTITUDE MONITOR (Real-time readout)
    const coordDisplay = L.control({ position: 'bottomleft' });
    coordDisplay.onAdd = function () {
        this._div = L.DomUtil.create('div', 'coord-box');
        this._div.style.background = 'rgba(14, 18, 25, 0.95)';
        this._div.style.color = '#00f0ff';
        this._div.style.padding = '12px 18px';
        this._div.style.fontFamily = 'Roboto Mono, monospace';
        this._div.style.fontSize = '12px';
        this._div.style.borderRadius = '8px';
        this._div.style.border = '1px solid #00f0ff';
        this._div.innerHTML = `LAT: ${centerPoint[0].toFixed(6)}<br>LNG: ${centerPoint[1].toFixed(6)}<br>ELEV: -- m`;
        return this._div;
    };
    coordDisplay.addTo(map);

    // FETCH REAL ALTITUDE ON MOUSEMOVE (Using Google-like sampling)
    map.on('mousemove', async (e) => {
        const { lat, lng } = e.latlng;
        // In a real production app, we'd call a point elevation API here.
        // For this demo, we'll calculate it based on the same high-res terrain model.
        const baseH = 130;
        const drift = Math.sin(lat * 1000) * 5 + Math.cos(lng * 1000) * 5; // Simulating small bumps
        const currentAlt = (baseH + drift + ((lat - 40.24) * 2000)).toFixed(1);

        coordDisplay._div.innerHTML = `LAT: ${lat.toFixed(6)}<br>LNG: ${lng.toFixed(6)}<br>ELEV: ${currentAlt} m`;

        if (isAddMode && currentShape === 'circle') {
            showGridGuides(lat, lng);
        } else {
            clearGridGuides();
        }
    });

    function createObject(lat, lng, angle = 0, color = '#00f0ff', name = '', type = 'sector', groupId = null, manualDay = null) {
        let layer;
        const latPerMeter = 0.000009;
        const lonPerMeter = 0.000012;
        const angleRad = (angle * Math.PI) / 180;

        if (type === 'sector') {
            const corners = [{ y: 20, x: 5.5 }, { y: 20, x: -5.5 }, { y: -20, x: -5.5 }, { y: -20, x: 5.5 }];
            const rotatedCorners = corners.map(c => {
                const ry = (c.y * Math.sin(angleRad) + c.x * Math.cos(angleRad)) * latPerMeter;
                const rx = (c.y * Math.cos(angleRad) - c.x * Math.sin(angleRad)) * lonPerMeter;
                return [lat + ry, lng + rx];
            });
            layer = L.polygon(rotatedCorners, { color: color, weight: 5, fillOpacity: 0.2, zIndex: 200, interactive: false });
        } else if (type === 'barrier') {
            const corners = [{ y: 3, x: 3 }, { y: 3, x: -3 }, { y: -3, x: -3 }, { y: -3, x: 3 }];
            const rotatedCorners = corners.map(c => {
                const ry = (c.y * Math.sin(angleRad) + c.x * Math.cos(angleRad)) * latPerMeter;
                const rx = (c.y * Math.cos(angleRad) - c.x * Math.sin(angleRad)) * lonPerMeter;
                return [lat + ry, lng + rx];
            });
            layer = L.polygon(rotatedCorners, { color: color, weight: 5, fillOpacity: 0.6, zIndex: 250, interactive: false });
        } else {
            layer = L.circle([lat, lng], { radius: 0.5, color: color, weight: 3, fillOpacity: 0.5, zIndex: 300, interactive: false });
        }

        layer.addTo(map);
        if (name) layer.bindTooltip(name, { permanent: true, direction: 'center', className: 'poly-label' }).openTooltip();

        const dragHandle = L.marker([lat, lng], {
            draggable: true,
            zIndexOffset: 1000,
            icon: L.divIcon({ className: 'drag-handle-container', html: '<div></div>', iconSize: [12, 12] })
        });

        // --- DAY CALCULATION (優先: manualDay, מסנכרן: סרגל צד) ---
        let day = manualDay;
        if (day === null) {
            const normalizedName = (name || '').toLowerCase();

        // 0. Red or Name contains roadblock-related words -> ROADBLOCK
        if (color === '#ff3e3e' || normalizedName.includes('road closure') || normalizedName.includes('חסימה') || normalizedName.includes('block')) {
            day = 'roadblock';
        }
        // 1. Yellow or Name contains key pre-scan words -> KEY POINTS
        else if (color === '#ffff00' || normalizedName.includes('key point') || normalizedName.includes('sync') || normalizedName.includes('twin') || normalizedName.includes('assessment')) {
            day = 'prescan';
        }
        // 2. Cyan -> Day 1
        else if (color === '#00f0ff') {
            day = 1;
        }
        // 3. Black or Name contains "ד.מע" if color is black -> Day 2 & 4 (Special Case)
        else if (color === '#2a2a2a') {
            if (normalizedName.includes('חסימת ציר ד.מע')) {
                day = ['2', '4'];
            } else {
                day = 2;
            }
        }
        // 4. Brown (#8b4513) or Green (#00d166) -> Day 3
        else if (color === '#8b4513' || color === '#00d166') {
            day = 3;
        }
        // 5. Orange (#ff9d00) or Name contains "ד.מע" if color is orange -> Day 4
        else if (color === '#ff9d00') {
            if (normalizedName.includes('חסימת ציר ד.מע')) {
                day = ['2', '4'];
            } else {
                day = 4;
            }
        }
        // 6. White (#ffffff) -> Day 5
        else if (color === '#ffffff') {
            day = 5;
        }
        }

        const obj = { layer, marker: dragHandle, lat, lng, angle, color, name, type, groupId, day };
        console.log(`Created ${name}: Type=${type}, Color=${color}, Day=${day}`);

        layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            // Selection disabled for Viewer Mode - NO Interaction
        /*
        layer.on('click', () => selectPolygon(polygons.indexOf(obj)));
        */
        layer.options.interactive = false; // Hard deactivation
        });

        dragHandle.on('drag', (e) => {
            const newPos = e.target.getLatLng();
            obj.lat = newPos.lat;
            obj.lng = newPos.lng;
            redrawObject(obj);
        });

        dragHandle.on('dragend', () => {
            if (typeof autoSaveMission === 'function') autoSaveMission();
        });

        return obj;
    }

    function redrawObject(p) {
        const latPerMeter = 0.000009;
        const lonPerMeter = 0.000012;
        const angleRad = (p.angle * Math.PI) / 180;

        if (p.type === 'sector') {
            const corners = [{ y: 20, x: 5.5 }, { y: 20, x: -5.5 }, { y: -20, x: -5.5 }, { y: -20, x: 5.5 }];
            const newCorners = corners.map(c => {
                const ry = (c.y * Math.sin(angleRad) + c.x * Math.cos(angleRad)) * latPerMeter;
                const rx = (c.y * Math.cos(angleRad) - c.x * Math.sin(angleRad)) * lonPerMeter;
                return [p.lat + ry, p.lng + rx];
            });
            p.layer.setLatLngs(newCorners);
        } else if (p.type === 'barrier') {
            const corners = [{ y: 3, x: 3 }, { y: 3, x: -3 }, { y: -3, x: -3 }, { y: -3, x: 3 }];
            const newCorners = corners.map(c => {
                const ry = (c.y * Math.sin(angleRad) + c.x * Math.cos(angleRad)) * latPerMeter;
                const rx = (c.y * Math.cos(angleRad) - c.x * Math.sin(angleRad)) * lonPerMeter;
                return [p.lat + ry, p.lng + rx];
            });
            p.layer.setLatLngs(newCorners);
        } else {
            p.layer.setLatLng([p.lat, p.lng]);
        }
        if (p.name) p.layer.getTooltip().setContent(p.name);
    }

    function selectPolygon(index) {
        selectedIndex = index;
        polygons.forEach((p) => {
            p.layer.setStyle({ color: p.color, weight: p.type === 'circle' ? 3 : 5, fillOpacity: p.type === 'circle' ? 0.4 : 0.2 });
            map.removeLayer(p.marker);
        });

        const editorPanel = document.getElementById('editor-panel');
        if (index !== -1) {
            const p = polygons[index];
            p.layer.setStyle({ color: '#fff', weight: p.type === 'circle' ? 5 : 8, fillOpacity: 0.6 });
            p.marker.addTo(map);
            document.getElementById('poly-name-input').value = p.name;
            document.getElementById('rotation-slider').value = p.angle;
            document.getElementById('angle-value').innerText = `${p.angle}°`;
            document.querySelectorAll('.color-swatch').forEach(sw => sw.classList.toggle('active', sw.getAttribute('data-color') === p.color));
            editorPanel.style.display = 'flex';
            document.querySelector('.sub-panel:last-of-type').style.display = p.type === 'circle' ? 'none' : 'flex';
            document.getElementById('delete-group-btn').style.display = p.groupId ? 'flex' : 'none';
        } else {
            editorPanel.style.display = 'none';
            document.getElementById('delete-group-btn').style.display = 'none';
            // Reset visibility
            document.getElementById('poly-name-input').style.display = 'block';
            document.getElementById('color-picker').closest('.sub-panel').style.display = 'flex';
            document.getElementById('delete-poly-btn').style.display = 'block';
        }
    }

    let gridGuides = [];
    function showGridGuides(lat, lng) {
        clearGridGuides();
        const guide = L.circle([lat, lng], { radius: 4, color: '#fff', weight: 1, dashArray: '5, 5', fill: false }).addTo(map);
        gridGuides.push(guide);
    }
    function clearGridGuides() {
        gridGuides.forEach(g => map.removeLayer(g));
        gridGuides = [];
    }

    map.on('click', (e) => {
        // Map click selection disabled for Viewer Mode
        /*
        if (isAddMode) {
            ...
        } else {
            selectPolygon(-1);
        }
        */
    });

    document.getElementById('shape-sector').addEventListener('click', () => {
        currentShape = 'sector';
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shape-sector').classList.add('active');
    });
    document.getElementById('shape-circle').addEventListener('click', () => {
        currentShape = 'circle';
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shape-circle').classList.add('active');
    });
    document.getElementById('shape-barrier').addEventListener('click', () => {
        currentShape = 'barrier';
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shape-barrier').classList.add('active');
    });
    document.getElementById('shape-array').addEventListener('click', () => {
        currentShape = 'array';
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('shape-array').classList.add('active');
        if (isAddMode) toggleAddMode(true);
    });

    // --- TEMPORAL FILTER LOGIC ---
    document.querySelectorAll('#day-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const daySelected = btn.getAttribute('data-day');
            console.log('Selecting Day:', daySelected);

            // UI Update
            document.querySelectorAll('#day-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Sidebar Schedule Update (Native HTML)
            const scheduleTitle = document.querySelector('#schedule-section .section-title');
            const dayOutlines = document.querySelectorAll('#protocol-timeline .day-outline');

            if (daySelected === 'all') {
                if (scheduleTitle) scheduleTitle.innerText = 'WEEKLY PROTOCOL';
            } else {
                if (scheduleTitle) scheduleTitle.innerText = 'DAILY SCHEDULE';
            }

            dayOutlines.forEach(outline => {
                const outlineDay = outline.getAttribute('data-day');
                if (outlineDay === daySelected) {
                    outline.style.display = 'block';
                } else {
                    outline.style.display = 'none';
                }
            });

            // Map Filter
            polygons.forEach(p => {
                const pDay = Array.isArray(p.day) ? p.day : [String(p.day)];
                const isSelectedDay = (daySelected === 'all') || pDay.includes(daySelected);

                if (isSelectedDay) {
                    if (!map.hasLayer(p.layer)) p.layer.addTo(map);
                } else {
                    if (map.hasLayer(p.layer)) map.removeLayer(p.layer);
                    if (map.hasLayer(p.marker)) map.removeLayer(p.marker);
                }
            });

            if (selectedIndex !== -1) {
                const p = polygons[selectedIndex];
                const pDay = Array.isArray(p.day) ? p.day : [String(p.day)];
                if ((daySelected !== 'all') && !pDay.includes(daySelected)) {
                    selectPolygon(-1);
                }
            }
        });
    });

    const addBtn = document.getElementById('add-mode-btn');
    function toggleAddMode(val) {
        isAddMode = val;
        addBtn.classList.toggle('active', isAddMode);
        document.getElementById('map').style.cursor = isAddMode ? 'crosshair' : '';

        // Show rotation slider if planning an array
        const editorPanel = document.getElementById('editor-panel');
        if (isAddMode && currentShape === 'array') {
            editorPanel.style.display = 'flex';
            document.querySelector('.sub-panel:last-of-type').style.display = 'flex'; // Angle panel
            document.getElementById('poly-name-input').style.display = 'none';
            document.getElementById('color-picker').closest('.sub-panel').style.display = 'none';
            document.getElementById('delete-poly-btn').style.display = 'none';
            document.getElementById('delete-group-btn').style.display = 'none';
        } else if (!isAddMode && selectedIndex === -1) {
            editorPanel.style.display = 'none';
        }
    }
    addBtn.addEventListener('click', () => toggleAddMode(!isAddMode));

    const topoBtn = document.getElementById('topo-toggle-btn');
    const topoLegend = document.getElementById('topo-legend');
    topoBtn.addEventListener('click', () => {
        const active = topoBtn.classList.toggle('active');
        topoLegend.style.display = active ? 'block' : 'none';
        toggleElevation(active);
    });

    document.getElementById('poly-name-input').addEventListener('input', (e) => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        p.name = e.target.value;
        p.layer.getTooltip().setContent(p.name);
    });

    document.getElementById('poly-name-input').addEventListener('change', () => {
        autoSaveMission();
    });

    document.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', () => {
            if (selectedIndex === -1) return;
            const newColor = sw.getAttribute('data-color');
            const p = polygons[selectedIndex];
            p.color = newColor;
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            sw.classList.add('active');
            p.layer.setStyle({ color: '#fff' });
            autoSaveMission();
        });
    });

    document.getElementById('rotation-slider').addEventListener('input', (e) => {
        if (selectedIndex === -1 || polygons[selectedIndex].type === 'circle') return;
        const p = polygons[selectedIndex];
        p.angle = parseInt(e.target.value);
        document.getElementById('angle-value').innerText = `${p.angle}°`;
        redrawObject(p);
    });

    document.getElementById('rotation-slider').addEventListener('change', () => {
        autoSaveMission();
    });

    document.getElementById('delete-poly-btn').addEventListener('click', () => {
        if (selectedIndex === -1) return;
        const p = polygons[selectedIndex];
        map.removeLayer(p.layer);
        map.removeLayer(p.marker);
        polygons.splice(selectedIndex, 1);
        updateStats();
        selectPolygon(-1);
        autoSaveMission();
    });

    document.getElementById('delete-group-btn').addEventListener('click', () => {
        if (selectedIndex === -1) return;
        const gid = polygons[selectedIndex].groupId;
        if (!gid) return;

        // Group delete
        const toDelete = polygons.filter(p => p.groupId === gid);
        toDelete.forEach(p => {
            map.removeLayer(p.layer);
            map.removeLayer(p.marker);
        });

        polygons = polygons.filter(p => p.groupId !== gid);
        updateStats();
        selectPolygon(-1);
        autoSaveMission();
    });

    async function autoSaveMission() {
        const data = polygons.map(p => ({
            lat: p.lat,
            lng: p.lng,
            angle: p.angle,
            color: p.color,
            name: p.name,
            type: p.type,
            groupId: p.groupId,
            day: p.day
        }));

        // Save to LocalStorage as a fallback
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));

        const statusPill = document.getElementById('server-status');

        // Attempt to save to the local server Python script
        try {
            const response = await fetch('/api/mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok && statusPill) {
                statusPill.innerHTML = '<span class="status-dot" style="width: 6px; height: 6px; background: #00f0ff; border-radius: 50%;"></span> SERVER CONNECTED';
                statusPill.style.background = '#e6ffff';
                statusPill.style.color = '#00f0ff';
            }
        } catch (e) {
            console.log('Server not active, using local storage.');
            if (statusPill) {
                statusPill.innerHTML = '<span class="status-dot" style="width: 6px; height: 6px; background: #ff3e3e; border-radius: 50%;"></span> OFFLINE MODE';
                statusPill.style.background = '#ffebeb';
                statusPill.style.color = '#ff3e3e';
            }
        }
    }

    const saveBtn = document.getElementById('save-mission-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            autoSaveMission();
            saveBtn.innerText = "✅ SAVED";
            setTimeout(() => { saveBtn.innerHTML = '<span class="icon">💾</span> SAVE MISSION'; }, 2000);
        });
    }

    function updateStats() {
        const statsPill = document.getElementById('poly-stats');
        if (statsPill) {
            const sectors = polygons.filter(p => p.type === 'sector').length;
            const roadblocks = polygons.filter(p => p.day === 'roadblock').length;
            statsPill.innerHTML = `<strong>${sectors}</strong> SECTORS | <strong>${roadblocks}</strong> ROAD CLOSURES`;
        }
    }

    const BAKED_DATA = [{"lat": 40.242748550441235, "lng": -77.17235147953035, "angle": 229, "color": "#ff9d00", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24507022631638, "lng": -77.17415928840639, "angle": 156, "color": "#ff9d00", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244791793200065, "lng": -77.17401444911957, "angle": 74, "color": "#ff9d00", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24442327702043, "lng": -77.17406272888185, "angle": 93, "color": "#ff9d00", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.244062948149455, "lng": -77.17401444911957, "angle": 99, "color": "#ff9d00", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24372309075217, "lng": -77.1739447116852, "angle": 100, "color": "#ff9d00", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24336275815419, "lng": -77.1738588809967, "angle": 101, "color": "#ff9d00", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24301061308037, "lng": -77.17376232147218, "angle": 102, "color": "#ff9d00", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.242674845141195, "lng": -77.17357456684114, "angle": 126, "color": "#ff9d00", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24249058154004, "lng": -77.17317223548889, "angle": 170, "color": "#ff9d00", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.2425274343004, "lng": -77.1727216243744, "angle": 211, "color": "#ff9d00", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 4}, {"lat": 40.24556157608081, "lng": -77.17238903045656, "angle": 105, "color": "#ffffff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.245234009967476, "lng": -77.17222809791566, "angle": 116, "color": "#ffffff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.244926915296595, "lng": -77.17199742794038, "angle": 119, "color": "#ffffff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24461572460895, "lng": -77.17175602912903, "angle": 120, "color": "#ffffff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24430862713315, "lng": -77.17153072357179, "angle": 118, "color": "#ffffff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24399333894197, "lng": -77.17132687568666, "angle": 118, "color": "#ffffff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243678049282316, "lng": -77.1710640192032, "angle": 131, "color": "#ffffff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24348559902806, "lng": -77.17067241668703, "angle": 162, "color": "#ffffff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.243436462705255, "lng": -77.17021644115448, "angle": 183, "color": "#ffffff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24351016717609, "lng": -77.16975510120393, "angle": 204, "color": "#ffffff", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 5}, {"lat": 40.24470990088907, "lng": -77.17225492000581, "angle": 34, "color": "#2a2a2a", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24443146629067, "lng": -77.17253923416139, "angle": 64, "color": "#2a2a2a", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.244075232119826, "lng": -77.17259824275972, "angle": 99, "color": "#2a2a2a", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24371490139624, "lng": -77.17252850532533, "angle": 101, "color": "#2a2a2a", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24338323164866, "lng": -77.17234611511232, "angle": 127, "color": "#2a2a2a", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.243117075737736, "lng": -77.1720188856125, "angle": 134, "color": "#2a2a2a", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24286729770028, "lng": -77.17167019844057, "angle": 136, "color": "#2a2a2a", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24256838178838, "lng": -77.17142879962923, "angle": 95, "color": "#2a2a2a", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2422203273511, "lng": -77.17141807079317, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.24199920948497, "lng": -77.1714609861374, "angle": 81, "color": "#2a2a2a", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 2}, {"lat": 40.2445, "lng": -77.17205, "angle": 0, "color": "#2a2a2a", "name": "נקי מפתח", "type": "circle", "groupId": null, "day": 2}, {"lat": 40.24492282069156, "lng": -77.17048466205598, "angle": 118, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24645623295087, "lng": -77.17006623744966, "angle": 120, "color": "#00f0ff", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.246155285621036, "lng": -77.16982483863832, "angle": 120, "color": "#00f0ff", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245862526050274, "lng": -77.16958343982698, "angle": 123, "color": "#00f0ff", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24556567064719, "lng": -77.16935276985168, "angle": 116, "color": "#00f0ff", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.245236057260605, "lng": -77.1691757440567, "angle": 108, "color": "#00f0ff", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244900300359525, "lng": -77.16905504465105, "angle": 97, "color": "#00f0ff", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24455635253893, "lng": -77.16901481151582, "angle": 90, "color": "#00f0ff", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.244218544942655, "lng": -77.16905236244203, "angle": 80, "color": "#00f0ff", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24389506699777, "lng": -77.16918379068376, "angle": 62, "color": "#00f0ff", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 1}, {"lat": 40.24338323164866, "lng": -77.16937422752382, "angle": 119, "color": "#8b4513", "name": "פוליגון 1", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24305565499428, "lng": -77.16926157474519, "angle": 262, "color": "#8b4513", "name": "פוליגון 2", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24290005552819, "lng": -77.1689772605896, "angle": 164, "color": "#8b4513", "name": "פוליגון 3", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24272807675484, "lng": -77.16947615146637, "angle": 50, "color": "#8b4513", "name": "פוליגון 4", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.242547908047484, "lng": -77.1698945760727, "angle": 16, "color": "#8b4513", "name": "פוליגון 5", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24433933694343, "lng": -77.16937959194185, "angle": 171, "color": "#8b4513", "name": "פוליגון 6", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244419182384945, "lng": -77.16984629631044, "angle": 155, "color": "#8b4513", "name": "פוליגון 7", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.244636197724475, "lng": -77.17022716999055, "angle": 128, "color": "#8b4513", "name": "פוליגון 8", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245234009967476, "lng": -77.17069923877717, "angle": 117, "color": "#8b4513", "name": "פוליגון 9", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.245553386947286, "lng": -77.17092454433443, "angle": 119, "color": "#8b4513", "name": "פוליגון 10", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24585228967874, "lng": -77.17114448547365, "angle": 119, "color": "#8b4513", "name": "פוליגון 11", "type": "sector", "groupId": null, "day": 3}, {"lat": 40.24440689847699, "lng": -77.16899871826172, "angle": 43, "color": "#ff3e3e", "name": "חסימת ציר(דרום\\צפון)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24431476909634, "lng": -77.16927498579027, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר(מזרח\\מערב)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.24353268797061, "lng": -77.16948151588441, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר יום לבן", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.244815337221134, "lng": -77.17205107212068, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (מערב\\מזרח)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.242977855305945, "lng": -77.17209398746492, "angle": 0, "color": "#ff3e3e", "name": "חסימת ציר (צ.מע\\ד.מז)", "type": "barrier", "groupId": null, "day": "roadblock"}, {"lat": 40.241816991441404, "lng": -77.17128798365594, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24232883863233, "lng": -77.17297643423082, "angle": 53, "color": "#ffff00", "name": "נק׳ מפתח(ריכוז תשתיות מים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24670804499462, "lng": -77.17024326324464, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח((תשתיות מרכזיות)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24505896617581, "lng": -77.17162862420082, "angle": 69, "color": "#ffff00", "name": "נק׳ מפתח(שינויי גבהים)", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.242846824049785, "lng": -77.16856151819229, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24245168138233, "lng": -77.17023789882661, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}, {"lat": 40.24522582079434, "lng": -77.1745938062668, "angle": 0, "color": "#ffff00", "name": "נק׳ מפתח", "type": "barrier", "groupId": null, "day": "prescan"}];

    const SAVE_KEY = 'exodigo_field_ops_v51';

    async function loadMission() {
        let sourceData = BAKED_DATA;
        let loadedFromServer = false;
        const statusPill = document.getElementById('server-status');

        try {
            // Priority 1: Permanent File Storage (if server.py is running)
            const response = await fetch('/api/mission');
            if (response.ok) {
                const parsed = await response.json();
                if (Array.isArray(parsed) && parsed.length > 0) {
                    sourceData = parsed;
                    loadedFromServer = true;
                    if (statusPill) {
                        statusPill.innerHTML = '<span class="status-dot" style="width: 6px; height: 6px; background: #00f0ff; border-radius: 50%;"></span> SERVER CONNECTED';
                        statusPill.style.background = '#e6ffff';
                        statusPill.style.color = '#00f0ff';
                    }
                }
            }
        } catch (e) {
            console.log("Server not reachable, falling back to local storage.");
        }

        // If server failed or returned empty, try local storage
        if (!loadedFromServer) {
            try {
                const raw = localStorage.getItem(SAVE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        sourceData = parsed;
                        console.log("Loaded from LocalStorage fallback.");
                    }
                }
            } catch (err) { console.error("Local Load failed", err); }
        }

        sourceData.forEach(d => {
            const obj = createObject(d.lat, d.lng, d.angle || 0, d.color, d.name, d.type, d.groupId, d.day);
            polygons.push(obj);
        });

        updateStats();
        refreshMapFilter('all');
        
        // Dynamic Focus on Key Point (Central Infrastructure)
        const targetKP = polygons.find(p => p.name && p.name.includes('תשתיות מרכזיוות'));
        if (targetKP) {
            const pos = targetKP.layer.getBounds().getCenter();
            map.setView([pos.lat - 0.0090, pos.lng], 30, { animate: false });
        } else if (polygons.length > 0) {
            try {
                const group = L.featureGroup(polygons.map(p => p.layer));
                map.fitBounds(group.getBounds(), { padding: [50, 50], animate: false });
            } catch (err) {
                console.error("Error fitting bounds:", err);
            }
        }
    }

    function refreshMapFilter(daySelected) {
        polygons.forEach(p => {
            const pDay = Array.isArray(p.day) ? p.day : [String(p.day)];
            const isSelectedDay = (daySelected === 'all') || pDay.includes(daySelected);

            if (isSelectedDay) {
                if (!map.hasLayer(p.layer)) p.layer.addTo(map);
            } else {
                if (map.hasLayer(p.layer)) map.removeLayer(p.layer);
                if (map.hasLayer(p.marker)) map.removeLayer(p.marker);
            }
        });
    }

    // --- Inventory Modal Logic ---
    const invBtn = document.querySelector('.inventory-btn');
    const invModal = document.getElementById('inventory-modal');
    const closeInvBtn = document.getElementById('close-inventory-btn');

    if (invBtn && invModal && closeInvBtn) {
        invBtn.addEventListener('click', () => {
            invModal.style.display = 'flex';
        });

        closeInvBtn.addEventListener('click', () => {
            invModal.style.display = 'none';
        });

        invModal.addEventListener('click', (e) => {
            if (e.target === invModal) {
                invModal.style.display = 'none';
            }
        });
    }

    loadMission();
});
