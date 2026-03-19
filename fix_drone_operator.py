"""
Fix drone operator: MD (15 min/polygon) finishes before EM (20 min/polygon).
MD should fly the drone, not EM.

60-min sprint (2 polygons): IDS=60min, EM=40min done, MD=30min done → MD drones 30min to 50min
40-min sprint (1 polygon):  IDS=30min, EM=20min done, MD=15min done → MD drones 15min to 35min
"""
from datetime import datetime, timedelta

def add_min(t_str, minutes):
    t = datetime.strptime(t_str, "%H:%M")
    return (t + timedelta(minutes=minutes)).strftime("%H:%M")

# Each entry: (sprint_start, drone_num, polygons, ids_op, em_op, md_op, rest_op)
drone_sprints = [
    # Day 1 Monday
    ("07:30", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("12:45", 2, 2, "C", "A", "B", "D"),   # Sprint 3
    # Day 2 Tuesday
    ("10:10", 1, 2, "A", "C", "D", "B"),   # Sprint 1
    ("13:40", 2, 2, "C", "A", "B", "D"),   # Sprint 3
    # Day 3 Wednesday South Sprint 1
    ("13:10", 1, 1, "A", "C", "D", "B"),
    # Day 3 Wednesday North Sprint 5
    ("17:20", 2, 1, "A", "C", "D", "B"),
    # Day 4 Thursday
    ("10:10", 1, 2, "A", "C", "D", "B"),
    ("13:40", 2, 2, "C", "A", "B", "D"),
    # Day 5 Friday
    ("09:10", 1, 2, "A", "C", "D", "B"),
    ("12:40", 2, 2, "C", "A", "B", "D"),
]

def calc(start, polys, ids_op, em_op, md_op, rest_op, drone_num):
    if polys == 2:
        ids_end = add_min(start, 60)
        em_end  = add_min(start, 40)  # EM: 20 min × 2 polygons
        md_done = add_min(start, 30)  # MD: 15 min × 2 polygons
    else:
        ids_end = add_min(start, 30)
        em_end  = add_min(start, 20)  # EM: 20 min × 1 polygon
        md_done = add_min(start, 15)  # MD: 15 min × 1 polygon

    drone_end = add_min(md_done, 20)

    old_em_drone = (
        f"IDS: {ids_op} (done {ids_end}) | "
        f"EM: {em_op} → Drone #{drone_num} {add_min(add_min(start, 30 if polys==2 else 15), 0)}–"
        f"{add_min(add_min(start, 30 if polys==2 else 15), 20)} | "
        f"MD: {md_op} (done {add_min(start, 40 if polys==2 else 20)}) | "
        f"Rest: {rest_op}"
    )

    new_md_drone = (
        f"IDS: {ids_op} (done {ids_end}) | "
        f"EM: {em_op} (done {em_end}) | "
        f"MD: {md_op} → Drone #{drone_num} {md_done}–{drone_end} | "
        f"Rest: {rest_op}"
    )

    return old_em_drone, new_md_drone

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

count = 0
for start, drone_num, polys, ids_op, em_op, md_op, rest_op in drone_sprints:
    old, new = calc(start, polys, ids_op, em_op, md_op, rest_op, drone_num)
    if old in html:
        html = html.replace(old, new, 1)
        count += 1
        print(f"  ✓ Sprint {start} Drone #{drone_num}: MD={md_op} flies")
    else:
        print(f"  ✗ NOT FOUND for {start} Drone #{drone_num}")
        print(f"    Looking for: {old[:100]}")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone — {count}/{len(drone_sprints)} replacements applied.")
