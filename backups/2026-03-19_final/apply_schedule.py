import re

html_content = """
                    <div class="day-outline condensed-view" data-day="all">
                        <h4 style="margin-bottom: 24px;">WEEKLY OVERVIEW</h4>
                        
                        <div class="event-item priority-ids" style="cursor: pointer; border-left-color: #00f0ff;" onclick="document.querySelector('.filter-btn[data-day=\\'1\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 1 (MONDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Staff Meeting + North Part Scan</span>
                            <span class="event-note">Staff meeting + scanning north part of site (mapping main utilities)</span>
                        </div>
                        
                        <div class="event-item" style="cursor: pointer; border-left-color: #2a2a2a;" onclick="document.querySelector('.filter-btn[data-day=\\'2\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 2 (TUESDAY)</span>
                            <span class="event-title" style="font-weight: normal;">PM Meeting + SE Part Mapping</span>
                            <span class="event-note">PM meeting + mapping main utilities in southeast part of site</span>
                        </div>

                        <div class="event-item warning" style="cursor: pointer; border-left-color: #8b4513;" onclick="document.querySelector('.filter-btn[data-day=\\'3\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 3 (WEDNESDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Flat Areas Scan (Dual Sector)</span>
                            <span class="event-note">Scanning flat areas due to weather, split into South & North sectors</span>
                        </div>

                        <div class="event-item" style="cursor: pointer; border-left-color: #ff9d00;" onclick="document.querySelector('.filter-btn[data-day=\\'4\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 4 (THURSDAY)</span>
                            <span class="event-title" style="font-weight: normal;">PM Meeting + South & Central Scan</span>
                            <span class="event-note">PM meeting + scanning south and central part of the site</span>
                        </div>

                        <div class="event-item success" style="cursor: pointer; border-left-color: #ffffff;" onclick="document.querySelector('.filter-btn[data-day=\\'5\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 5 (FRIDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Central Area Scan</span>
                            <span class="event-note">Scanning central area of site and project closeout</span>
                        </div>

                        <div class="event-item" style="cursor: pointer; border-left-color: #ffff00;" onclick="document.querySelector('.filter-btn[data-day=\\'prescan\\']').click()">
                            <span class="time" style="font-weight: bold;">PRE-SCAN (KEY POINTS)</span>
                            <span class="event-title" style="font-weight: normal;">Strategic Sync Points</span>
                            <span class="event-note">Key points for pre-scan calibration</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="1" style="display: none;">
                        <h4>MONDAY (DAY 1)</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">06:50 - 07:10</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to work site (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">07:10 - 07:30</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Unload gear & deploy transmitters 1-2 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">07:30 - 08:30</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A(EM), B(MD), C(Drone) | (D rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Pack transmitters before meeting (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:50 - 09:00</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to Denim Coffee (10 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #8c52ff;">
                            <span class="time">09:00 - 10:00</span>
                            <span class="event-title">Team Meeting</span>
                            <span class="event-note">Staff meeting + mapping north site (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">10:00 - 10:10</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive back to site (10 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">10:10 - 10:30</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Redeploy transmitters for polygons 3-4 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:30 - 11:30</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">B(EM), C(MD), D(GPR) | (A rests)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">11:30 - 12:30</span>
                            <span class="event-title">Lunch</span>
                            <span class="event-note">Long break and lunch for all crew (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">12:30 - 12:45</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Pack and deploy to polygons 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">12:45 - 13:45</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">C(EM), D(MD), A(GPR) | (B rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:45 - 14:00</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Pack and deploy to polygons 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:00 - 15:00</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">D(EM), A(MD), B(Drone) | (C rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:00 - 15:15</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move final transmitters to polygon 9 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:15 - 15:45</span>
                            <span class="event-title">Sprint 5</span>
                            <span class="event-note">A(EM), C(GPR) | (B,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:45 - 16:05</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Disassemble and pack safely in vehicles (20 min)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:05 - 16:25</span>
                            <span class="event-title">Return</span>
                            <span class="event-note">Drive back (20 min)</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="2" style="display: none;">
                        <h4>TUESDAY (DAY 2)</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to site for mapping SE part (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:50 - 09:10</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Unload & deploy transmitters 1-2 (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #8c52ff;">
                            <span class="time">09:10 - 10:10</span>
                            <span class="event-title">PM Meeting</span>
                            <span class="event-note">Project Manager meeting on-site (60 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:10 - 11:10</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A(EM), B(MD), C(GPR) | (D rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">11:10 - 11:25</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">11:25 - 12:25</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">B(EM), C(MD), D(GPR) | (A rests)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">12:25 - 13:25</span>
                            <span class="event-title">Lunch</span>
                            <span class="event-note">Long break & lunch for team (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:25 - 13:40</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:40 - 14:40</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">C(EM), D(MD), A(GPR) | (B rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:40 - 14:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:55 - 15:55</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">D(EM), A(MD), B(GPR) | (C rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:55 - 16:15</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Disassemble & securely pack (20 min)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:15 - 16:35</span>
                            <span class="event-title">Return</span>
                            <span class="event-note">Drive back (20 min)</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="3" style="display: none;">
                        <h4>WEDNESDAY (DAY 3) - SOUTH SECTOR</h4>
                        
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">12:30 - 12:50</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to South Sector (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">12:50 - 13:10</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Deploy transmitters for polygons 1-2 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:10 - 13:50</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A(EM), B(MD) | (C,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:50 - 14:05</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:05 - 14:45</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">C(EM), D(MD) | (A,B rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:45 - 15:00</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:00 - 15:40</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">B(EM), A(MD) | (C,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:40 - 15:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:55 - 16:35</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">D(EM), C(MD) | (A,B rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">16:35 - 16:55</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Pack South Sector equipment (20 min)</span>
                        </div>

                        <h4 style="margin-top: 32px;">WEDNESDAY (DAY 3) - NORTH SECTOR</h4>
                        
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">16:55 - 17:00</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Quick switch to North Sector (5 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">17:00 - 17:20</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Deploy transmitters for polygons 1-2 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">17:20 - 18:00</span>
                            <span class="event-title">Sprint 5</span>
                            <span class="event-note">A(EM), B(MD) | (C,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">18:00 - 18:15</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">18:15 - 18:55</span>
                            <span class="event-title">Sprint 6</span>
                            <span class="event-note">C(EM), D(MD) | (A,B rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">18:55 - 19:10</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">19:10 - 19:50</span>
                            <span class="event-title">Sprint 7</span>
                            <span class="event-note">B(EM), A(MD) | (C,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">19:50 - 20:05</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move to final polygon 7 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">20:05 - 20:25</span>
                            <span class="event-title">Sprint 8</span>
                            <span class="event-note">D(EM) | (A,B,C rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">20:25 - 20:45</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Final vehicle loading (20 min)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">20:45 - 21:05</span>
                            <span class="event-title">Return</span>
                            <span class="event-note">Drive back (20 min)</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="4" style="display: none;">
                        <h4>THURSDAY (DAY 4)</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to South and Central mapping site (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:50 - 09:10</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Unload & deploy transmitters 1-2 (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #8c52ff;">
                            <span class="time">09:10 - 10:10</span>
                            <span class="event-title">PM Meeting</span>
                            <span class="event-note">Project Manager meeting on-site (60 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:10 - 11:10</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A(EM), B(MD), C(GPR) | (D rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">11:10 - 11:25</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">11:25 - 12:25</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">B(EM), C(MD), D(GPR) | (A rests)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">12:25 - 13:25</span>
                            <span class="event-title">Lunch</span>
                            <span class="event-note">Long break & lunch for team (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:25 - 13:40</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:40 - 14:40</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">C(EM), D(MD), A(GPR) | (B rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:40 - 14:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:55 - 15:55</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">D(EM), A(MD), B(GPR) | (C rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:55 - 16:15</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Disassemble & securely pack (20 min)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:15 - 16:35</span>
                            <span class="event-title">Return</span>
                            <span class="event-note">Drive back (20 min)</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="5" style="display: none;">
                        <h4>FRIDAY (DAY 5)</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Drive</span>
                            <span class="event-note">Drive to Central area site (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:50 - 09:10</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Unload & deploy transmitters 1-2 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">09:10 - 10:10</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A(EM), B(MD), C(GPR) | (D rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">10:10 - 10:25</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:25 - 11:25</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">B(EM), C(MD), D(GPR) | (A rests)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">11:25 - 12:25</span>
                            <span class="event-title">Lunch</span>
                            <span class="event-note">Long break & lunch for team (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">12:25 - 12:40</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">12:40 - 13:40</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">C(EM), D(MD), A(GPR) | (B rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:40 - 13:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:55 - 14:55</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">D(EM), A(MD), B(GPR) | (C rests)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:55 - 15:10</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygon 9 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:10 - 15:40</span>
                            <span class="event-title">Sprint 5</span>
                            <span class="event-note">A(EM), C(GPR) | (B,D rest)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:40 - 16:00</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Disassemble & securely pack (20 min)</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:00 - 16:20</span>
                            <span class="event-title">Return</span>
                            <span class="event-note">Drive back (20 min)</span>
                        </div>
                    </div>

                    <div class="day-outline" data-day="prescan" style="display: none;">
                        <h4>PRE-SCAN ANALYSIS (KEY POINTS)</h4>
                        <div class="event-item" style="border-left-color: #ffff00;">
                            <span class="time">KEY POINT 1</span>
                            <span class="event-title">MUDDI Framework Sync</span>
                            <span class="event-note">Integrate global underground data standards.</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ffff00;">
                            <span class="time">KEY POINT 2</span>
                            <span class="event-title">Digital Twin Calibration</span>
                            <span class="event-note">Align 1:1 digital replica with physical site markers.</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ffff00;">
                            <span class="time">KEY POINT 3</span>
                            <span class="event-title">Micro-Tunneling Assessment</span>
                            <span class="event-note">Evaluate soil conditions for trenchless excavation.</span>
                        </div>
                    </div>
"""

import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = re.compile(r'(<div class="timeline" id="protocol-timeline"[^>]*>)(.*?)(                </div>\s*</div>\s*</aside>)', re.DOTALL)

def repl(m):
    return m.group(1) + html_content + m.group(3)

html_new = pattern.sub(repl, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_new)

print("Timeline successfully updated with D2/D3 swap, PM meetings, and rest rotations.")
