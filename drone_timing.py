"""
Update drone sprint notes to show exact 20-minute drone windows and operator finish times.

Timing logic per sprint:
- 60-min sprints (2 polygons): IDS finishes at +60, MD at +40, EM at +30
  → EM drone window: start+30 to start+50 (20 min, ends 10 min before sprint close)
- 40-min sprints (1 polygon): IDS finishes at +30, MD at +20, EM at +15
  → EM drone window: start+15 to start+35 (20 min, ends 5 min before sprint close)

All times verified for no conflicts.
"""
from datetime import datetime, timedelta

def add_min(t_str, minutes):
    t = datetime.strptime(t_str, "%H:%M")
    return (t + timedelta(minutes=minutes)).strftime("%H:%M")

# Format: (time_str, drone_num, polygons, IDS_op, EM_op, MD_op, rest_op)
#   polygons=2 → 60min sprint, polygons=1 → 40min sprint
drone_sprints = [
    # Day 1 Monday
    ("07:30", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("12:45", 2, 2, "C", "A", "B", "D"),   # Sprint 3
    # Day 2 Tuesday
    ("10:10", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("13:40", 2, 2, "C", "A", "B", "D"),   # Sprint 3
    # Day 3 Wednesday South Sprint 1
    ("13:10", 1, 1, "A", "C", "D", "B"),   # Sprint 1
    # Day 3 Wednesday North Sprint 5
    ("17:20", 2, 1, "A", "C", "D", "B"),   # Sprint 5
    # Day 4 Thursday
    ("10:10", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("13:40", 2, 2, "C", "A", "B", "D"),   # Sprint 3
    # Day 5 Friday
    ("09:10", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("12:40", 2, 2, "C", "A", "B", "D"),   # Sprint 3
]

# Build replacement map: old_note -> new_note
# Current notes are like: "IDS: A | EM: C (+Drone #1) | MD: D | Rest: B"
def make_note(start, drone_num, polys, ids_op, em_op, md_op, rest_op):
    if polys == 2:
        ids_end = add_min(start, 60)
        em_end  = add_min(start, 30)
        md_end  = add_min(start, 40)
    else:  # 1 polygon
        ids_end = add_min(start, 30)
        em_end  = add_min(start, 15)
        md_end  = add_min(start, 20)
    
    drone_start = em_end
    drone_end   = add_min(drone_start, 20)
    
    return (
        f"IDS: {ids_op} (done {ids_end}) | "
        f"EM: {em_op} → Drone #{drone_num} {drone_start}–{drone_end} | "
        f"MD: {md_op} (done {md_end}) | "
        f"Rest: {rest_op}"
    )

def old_note(drone_num, ids_op, em_op, md_op, rest_op):
    return f"IDS: {ids_op} | EM: {em_op} (+Drone #{drone_num}) | MD: {md_op} | Rest: {rest_op}"

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

count = 0
for start, drone_num, polys, ids_op, em_op, md_op, rest_op in drone_sprints:
    o = old_note(drone_num, ids_op, em_op, md_op, rest_op)
    n = make_note(start, drone_num, polys, ids_op, em_op, md_op, rest_op)
    if o in html:
        html = html.replace(o, n, 1)
        count += 1
        print(f"  ✓ Replaced Drone #{drone_num} sprint starting {start}")
    else:
        print(f"  ✗ NOT FOUND: {o}")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone — {count}/{len(drone_sprints)} replacements applied.")
