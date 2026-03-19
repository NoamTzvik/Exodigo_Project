import re
from datetime import datetime, timedelta

def m(t, mins):
    return (datetime.strptime(t, "%H:%M") + timedelta(minutes=mins)).strftime("%H:%M")

def sprint_simple_note(start, snum, polys, ids_op, em_op, md_op, rest_op, drone_num=None):
    if polys >= 2:
        ids_t, em_t, md_t = m(start, 60), m(start, 40), m(start, 30)
    else:
        ids_t, em_t, md_t = m(start, 30), m(start, 20), m(start, 15)
    
    drone_desc = ""
    if drone_num:
        drone_start = md_t
        drone_end = m(drone_start, 20)
        drone_desc = f" &rarr; <strong>Drone #{drone_num}</strong> {drone_start}&ndash;{drone_end} ({md_op})"
    
    return (
        f"IDS: {ids_op} (done {ids_t}) | "
        f"EM: {em_op} (done {em_t}) | "
        f"MD: {md_op} (done {md_t}){drone_desc} &nbsp;&middot;&nbsp; (Rest: {rest_op})"
    )

ALL_SPRINTS = [
    # (day, sprint_num, start, end, polys, ids, em, md, rest, drone_num)
    (1, 1, "07:30", "08:30", 2, "A", "C", "D", "B", 1),
    (1, 2, "10:30", "11:30", 2, "B", "D", "C", "A", None),
    (1, 3, "12:45", "13:45", 2, "C", "A", "B", "D", 2),
    (1, 4, "14:00", "15:00", 2, "D", "B", "A", "C", None),
    (1, 5, "15:15", "15:45", 1, "A", "C", "D", "B", None),
    
    (2, 1, "10:10", "11:10", 2, "A", "C", "D", "B", 1),
    (2, 2, "11:25", "12:25", 2, "B", "D", "C", "A", None),
    (2, 3, "13:40", "14:40", 2, "C", "A", "B", "D", 2),
    (2, 4, "14:55", "15:55", 2, "D", "B", "A", "C", None),
    
    (3, 1, "13:10", "13:50", 1, "A", "C", "D", "B", 1),
    (3, 2, "14:05", "14:45", 1, "B", "D", "C", "A", None),
    (3, 3, "15:00", "15:40", 1, "C", "A", "B", "D", None),
    (3, 4, "15:55", "16:35", 1, "D", "B", "A", "C", None),
    (3, 5, "17:20", "18:00", 1, "A", "B", "C", "D", 2), # Fixed rotation: MD is C now (A,B,C,D)
    (3, 6, "18:15", "18:55", 1, "B", "D", "C", "A", None),
    (3, 7, "19:10", "19:50", 1, "C", "A", "B", "D", None),
    (3, 8, "20:05", "20:25", 0, "D", "B", "A", "C", None),
    
    (4, 1, "10:10", "11:10", 2, "A", "C", "D", "B", 1),
    (4, 2, "11:25", "12:25", 2, "B", "D", "C", "A", None),
    (4, 3, "13:40", "14:40", 2, "C", "A", "B", "D", 2),
    (4, 4, "14:55", "15:55", 2, "D", "B", "A", "C", None),
    
    (5, 1, "09:10", "10:10", 2, "A", "C", "D", "B", 1),
    (5, 2, "10:25", "11:25", 2, "B", "D", "C", "A", None),
    (5, 3, "12:40", "13:40", 2, "C", "A", "B", "D", 2),
    (5, 4, "13:55", "14:55", 2, "D", "B", "A", "C", None),
    (5, 5, "15:10", "15:40", 1, "A", "C", "D", "B", None),
]

with open('index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

# First replace all h4 to clickable back links
html = re.sub(r'<h4>(.*?)</h4>', r'<h4 style="cursor: pointer;" onclick="document.querySelector(\'.filter-btn[data-day=\\\'all\\\']\').click()" title="Click to go back to Weekly Protocol">\1 &lAarr;</h4>', orig_html)

# We find the *entire* timeline block and recreate it day by day to fix the "nested divs" mess
timeline_pattern = re.compile(r'(<div class="timeline" id="protocol-timeline"[^>]*>)(.*?)(\s+</div>\s+</div>\s+</aside>)', re.DOTALL)
match = timeline_pattern.search(html)

if match:
    # We will reconstruct the whole day-outlines to avoid broken replacements
    # This is safer than regex replacing nested junk.
    
    # We'll just manually rewrite the day-outlines while keeping other structure
    pass

# Alternative: use a more robust regex to find and remove the sub-items
# Then replace the note in the main item.
# The previous script created sub-items like: <div class="event-item" style="border-left-color: #00d4ff; padding: 4px 12px 4px 22px; margin-left: 10px;"> ... </div>
# Let's remove them all first.
html = re.sub(r'<div class="event-item" style="border-left-color: #[0-9a-fA-F]+; padding: 4px 12px 4px 22px; margin-left: 10px;">.*?</div>', '', html, flags=re.DOTALL)

# Now iterate and replace sprint headers with new formatted notes
for (day, snum, st, en, polys, ids, em, md, rest, drone) in ALL_SPRINTS:
    # Pattern to match the sprint header div
    pat = re.compile(
        r'(<div class="event-item priority-ids">\s*'
        r'<span class="time">' + re.escape(st) + r' - ' + re.escape(en) + r'</span>\s*'
        r'<span class="event-title">Sprint ' + str(snum) + r'</span>\s*)'
        r'(<span class="event-note">.*?</span>\s*)'
        r'(</div>)',
        re.DOTALL
    )
    new_note = f'<span class="event-note">{sprint_simple_note(st, snum, polys, ids, em, md, rest, drone)}</span>'
    html, n = pat.subn(r'\1' + new_note + r'\3', html, count=1)
    if n:
        print(f"Replaced Day {day} S{snum}")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
