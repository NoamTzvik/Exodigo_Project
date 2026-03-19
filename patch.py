import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_timeline_inner = """
                    <div class="day-outline condensed-view" data-day="all">
                        <h4 style="margin-bottom: 24px;">WEEKLY OVERVIEW</h4>
                        
                        <div class="event-item priority-ids" style="cursor: pointer; border-left-color: #00f0ff;" onclick="document.querySelector('.filter-btn[data-day=\\'1\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 1 (MONDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Polygons 1-9 (incl. Meeting)</span>
                            <span class="event-note">06:50 - 16:25 | Initial weekly deployment</span>
                        </div>
                        
                        <div class="event-item" style="cursor: pointer; border-left-color: #2a2a2a;" onclick="document.querySelector('.filter-btn[data-day=\\'2\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 2 (TUESDAY)</span>
                            <span class="event-title" style="font-weight: normal;">South & North Sectors</span>
                            <span class="event-note">12:30 - 21:05 | Dual sector deployment (Long day)</span>
                        </div>

                        <div class="event-item warning" style="cursor: pointer; border-left-color: #8b4513;" onclick="document.querySelector('.filter-btn[data-day=\\'3\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 3 (WEDNESDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Polygons 1-9 (Routine)</span>
                            <span class="event-note">08:30 - 16:20 | Deep scans along main traffic axes</span>
                        </div>

                        <div class="event-item" style="cursor: pointer; border-left-color: #ff9d00;" onclick="document.querySelector('.filter-btn[data-day=\\'4\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 4 (THURSDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Polygons 1-9 (Routine)</span>
                            <span class="event-note">08:30 - 16:20 | Continuous arterial scans</span>
                        </div>

                        <div class="event-item success" style="cursor: pointer; border-left-color: #ffffff;" onclick="document.querySelector('.filter-btn[data-day=\\'5\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 5 (FRIDAY)</span>
                            <span class="event-title" style="font-weight: normal;">Project Closeout</span>
                            <span class="event-note">08:30 - 16:20 | Final clearance and site demobilization</span>
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
                            <span class="event-title">Travel</span>
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
                            <span class="event-note">A+B scan | C scan | D scan (operating drone #1)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Pack transmitters before meeting (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:50 - 09:00</span>
                            <span class="event-title">Travel</span>
                            <span class="event-note">Drive to Denim Coffee (10 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #8c52ff;">
                            <span class="time">09:00 - 10:00</span>
                            <span class="event-title">Team Meeting</span>
                            <span class="event-note">Weekly team sit-down at cafe (60 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">10:00 - 10:10</span>
                            <span class="event-title">Travel</span>
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
                            <span class="event-note">C+D scan | A scan | B scan</span>
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
                            <span class="event-note">A+B scan | D scan | C scan</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:45 - 14:00</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Pack and deploy to polygons 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:00 - 15:00</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">C+D scan | B scan | A scan (operating drone #2)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:00 - 15:15</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move final transmitters to polygon 9 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:15 - 15:45</span>
                            <span class="event-title">Sprint 5</span>
                            <span class="event-note">A scan (half sprint) | C scan | D scan</span>
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
                        <h4>TUESDAY (DAY 2) - SOUTH SECTOR</h4>
                        
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">12:30 - 12:50</span>
                            <span class="event-title">Travel</span>
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
                            <span class="event-note">T1: A (EM), B (MD) | T2: C+D Drone #1</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:50 - 14:05</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:05 - 14:45</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">T1: A+B Drone | T2: C (EM), D (MD)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:45 - 15:00</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:00 - 15:40</span>
                            <span class="event-title">Sprint 3</span>
                            <span class="event-note">T1: B (EM), A (MD) | T2: C+D Drone</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:40 - 15:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:55 - 16:35</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">T1: A+B Drone | T2: D (EM), C (MD)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">16:35 - 16:55</span>
                            <span class="event-title">Pack Up</span>
                            <span class="event-note">Pack South Sector equipment (20 min)</span>
                        </div>

                        <h4 style="margin-top: 32px;">TUESDAY (DAY 2) - NORTH SECTOR</h4>
                        
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">16:55 - 17:00</span>
                            <span class="event-title">Travel</span>
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
                            <span class="event-note">T1: A (EM), B (MD) | T2: C+D Drone #2</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">18:00 - 18:15</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">18:15 - 18:55</span>
                            <span class="event-title">Sprint 6</span>
                            <span class="event-note">T1: A+B Drone | T2: C (EM), D (MD)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">18:55 - 19:10</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygons 5-6 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">19:10 - 19:50</span>
                            <span class="event-title">Sprint 7</span>
                            <span class="event-note">T1: B (EM), A (MD) | T2: C+D Drone</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">19:50 - 20:05</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move to final polygon 7 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">20:05 - 20:25</span>
                            <span class="event-title">Sprint 8</span>
                            <span class="event-note">T1: A+B pre-pack | T2: D (EM) 20m, C (MD) 15m</span>
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
"""

def generate_normal_day(num, title):
    return f'''
                    <div class="day-outline" data-day="{num}" style="display: none;">
                        <h4>{title}</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title">Travel</span>
                            <span class="event-note">Drive to site (20 min)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:50 - 09:10</span>
                            <span class="event-title">Setup</span>
                            <span class="event-note">Unload & deploy transmitters 1-2 (20 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">09:10 - 10:10</span>
                            <span class="event-title">Sprint 1</span>
                            <span class="event-note">A+B scan | C scan | D scan & drone #1</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">10:10 - 10:25</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 3-4 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:25 - 11:25</span>
                            <span class="event-title">Sprint 2</span>
                            <span class="event-note">C+D scan | A scan | B scan</span>
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
                            <span class="event-note">A+C scan | B scan | D scan</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:40 - 13:55</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to 7-8 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:55 - 14:55</span>
                            <span class="event-title">Sprint 4</span>
                            <span class="event-note">B+D scan | A scan | C scan & drone #2</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:55 - 15:10</span>
                            <span class="event-title">Transfer</span>
                            <span class="event-note">Move transmitters to polygon 9 (15 min)</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:10 - 15:40</span>
                            <span class="event-title">Sprint 5</span>
                            <span class="event-note">A scan (half sprint) | D scan | B scan</span>
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
'''

new_timeline_inner += generate_normal_day(3, "WEDNESDAY (DAY 3)")
new_timeline_inner += generate_normal_day(4, "THURSDAY (DAY 4)")
new_timeline_inner += generate_normal_day(5, "FRIDAY (DAY 5)")

prescan_html = """
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
new_timeline_inner += prescan_html

pattern = re.compile(r'(<div class="timeline" id="protocol-timeline"[^>]*>)(.*?)(                </div>\s*</div>\s*</aside>)', re.DOTALL)

def repl(m):
    return m.group(1) + new_timeline_inner + m.group(3)

html_new = pattern.sub(repl, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_new)

print("Done replacing.")
