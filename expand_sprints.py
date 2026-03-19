"""
Expand each sprint in index.html into phase sub-items showing finish times and drone windows.

Scan durations per polygon:  IDS=30min, EM=20min, MD=15min
60-min sprint (2 poly): MD done +30, EM done +40, drone lands +50, IDS done +60
40/30-min sprint (1 poly): MD done +15, EM done +20, IDS done +30, drone lands +35
"""
import re
from datetime import datetime, timedelta

def m(t, mins):
    return (datetime.strptime(t, "%H:%M") + timedelta(minutes=mins)).strftime("%H:%M")

def ph(time_str, title, color):
    return (
        f'                        <div class="event-item" style="border-left-color: {color}; '
        f'padding: 4px 12px 4px 22px; margin-left: 10px;">\n'
        f'                            <span class="time" style="font-size:11px;opacity:0.8;">{time_str}</span>\n'
        f'                            <span class="event-title" style="font-size:11px;">{title}</span>\n'
        f'                        </div>'
    )

def sprint_phases(start, end, snum, polys, ids_op, em_op, md_op, rest_op, drone_num=None):
    if polys >= 2:
        md_t, em_t, ids_t = m(start,30), m(start,40), m(start,60)
    else:
        md_t, em_t, ids_t = m(start,15), m(start,20), m(start,30)
    drone_dn = m(md_t, 20) if drone_num else None

    # Sprint header
    note = f"IDS: {ids_op} | EM: {em_op} | MD: {md_op} &nbsp;&middot;&nbsp; {rest_op} rests"
    header = (
        f'                        <div class="event-item priority-ids">\n'
        f'                            <span class="time">{start} - {end}</span>\n'
        f'                            <span class="event-title">Sprint {snum}</span>\n'
        f'                            <span class="event-note">{note}</span>\n'
        f'                        </div>'
    )

    phases = [header]

    # MD done
    if drone_num:
        phases.append(ph(md_t, f"<strong>{md_op}</strong> (MD) done &rarr; Drone #{drone_num} &#9650; takes off", "#00d4ff"))
    else:
        phases.append(ph(md_t, f"{md_op} (MD) done &mdash; standby", "#556677"))

    # EM done
    phases.append(ph(em_t, f"{em_op} (EM) done &mdash; standby", "#667788"))

    # For 2-poly drone: drone lands before IDS done
    if drone_num and polys >= 2:
        phases.append(ph(drone_dn, f"Drone #{drone_num} &#9660; lands &mdash; {md_op} assists pack-up", "#00d4ff"))

    # IDS done
    phases.append(ph(ids_t, f"<strong>{ids_op}</strong> (IDS) done &mdash; Sprint {snum} complete", "#00f0ff"))

    # For 1-poly drone: drone lands after IDS done
    if drone_num and polys < 2:
        phases.append(ph(drone_dn, f"Drone #{drone_num} &#9660; lands &mdash; {md_op} complete", "#00d4ff"))

    return '\n'.join(phases)


# All sprints: (start, end, sprint_num, polys, ids_op, em_op, md_op, rest_op, drone_num)
ALL_SPRINTS = [
    # Day 1
    ("07:30","08:30",1,2,"A","C","D","B",1),
    ("10:30","11:30",2,2,"B","D","C","A",None),
    ("12:45","13:45",3,2,"C","A","B","D",2),
    ("14:00","15:00",4,2,"D","B","A","C",None),
    ("15:15","15:45",5,1,"A","C","D","B",None),
    # Day 2
    ("10:10","11:10",1,2,"A","C","D","B",1),
    ("11:25","12:25",2,2,"B","D","C","A",None),
    ("13:40","14:40",3,2,"C","A","B","D",2),
    ("14:55","15:55",4,2,"D","B","A","C",None),
    # Day 3 South
    ("13:10","13:50",1,1,"A","C","D","B",1),
    ("14:05","14:45",2,1,"B","D","C","A",None),
    ("15:00","15:40",3,1,"C","A","B","D",None),
    ("15:55","16:35",4,1,"D","B","A","C",None),
    # Day 3 North
    ("17:20","18:00",5,1,"A","C","D","B",2),
    ("18:15","18:55",6,1,"B","D","C","A",None),
    ("19:10","19:50",7,1,"C","A","B","D",None),
    ("20:05","20:25",8,0,"D","B","A","C",None),
    # Day 4
    ("10:10","11:10",1,2,"A","C","D","B",1),
    ("11:25","12:25",2,2,"B","D","C","A",None),
    ("13:40","14:40",3,2,"C","A","B","D",2),
    ("14:55","15:55",4,2,"D","B","A","C",None),
    # Day 5
    ("09:10","10:10",1,2,"A","C","D","B",1),
    ("10:25","11:25",2,2,"B","D","C","A",None),
    ("12:40","13:40",3,2,"C","A","B","D",2),
    ("13:55","14:55",4,2,"D","B","A","C",None),
    ("15:10","15:40",5,1,"A","C","D","B",None),
]

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

count = 0
for (start, end, snum, polys, ids_op, em_op, md_op, rest_op, drone_num) in ALL_SPRINTS:
    pattern = re.compile(
        r'<div class="event-item priority-ids">\s*'
        r'<span class="time">' + re.escape(start) + r' - ' + re.escape(end) + r'</span>\s*'
        r'<span class="event-title">Sprint ' + str(snum) + r'</span>\s*'
        r'<span class="event-note">.*?</span>\s*'
        r'</div>',
        re.DOTALL
    )
    new_html = sprint_phases(start, end, snum, polys, ids_op, em_op, md_op, rest_op, drone_num)
    result, n = pattern.subn(new_html, html, count=1)
    if n:
        html = result
        count += 1
        tag = f"Drone #{drone_num}" if drone_num else "no drone"
        print(f"  ✓ {start}-{end} Sprint {snum} ({tag})")
    else:
        print(f"  ✗ NOT FOUND: {start}-{end} Sprint {snum}")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nDone — {count}/{len(ALL_SPRINTS)} sprints expanded with phase breakdown.")
