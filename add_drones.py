"""
Add drone flights to sprint notes.
Logic: EM finishes 15 min before IDS (30min IDS, 15min EM per polygon).
During that dead time, EM operator flies the drone.
2 drone flights per day, alternating in Sprints 1 and 3 (or Sprint 1 of each sector for Day 3).
"""

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Each replacement is (old_note_with_context, new_note)
# We use the time span as context to make replacements unique across days.

replacements = [
    # ========== DAY 1 (MONDAY) ==========
    # Sprint 1 - gets Drone #1 (EM: C)
    (
        '<span class="time">07:30 - 08:30</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">07:30 - 08:30</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #1) | MD: D | Rest: B</span>'
    ),
    # Sprint 3 - gets Drone #2 (EM: A)
    (
        '<span class="time">12:45 - 13:45</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A | MD: B | Rest: D</span>',
        '<span class="time">12:45 - 13:45</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A (+Drone #2) | MD: B | Rest: D</span>'
    ),

    # ========== DAY 2 (TUESDAY) ==========
    # Sprint 1 - gets Drone #1 (EM: C)
    (
        '<span class="time">10:10 - 11:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">10:10 - 11:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #1) | MD: D | Rest: B</span>'
    ),
    # Sprint 3 - gets Drone #2 (EM: A)
    (
        '<span class="time">13:40 - 14:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A | MD: B | Rest: D</span>',
        '<span class="time">13:40 - 14:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A (+Drone #2) | MD: B | Rest: D</span>'
    ),

    # ========== DAY 3 (WEDNESDAY) - SOUTH SECTOR ==========
    # Sprint 1 South - gets Drone #1 (EM: C)
    (
        '<span class="time">13:10 - 13:50</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">13:10 - 13:50</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #1) | MD: D | Rest: B</span>'
    ),
    # Sprint 5 North - gets Drone #2 (EM: C)
    (
        '<span class="time">17:20 - 18:00</span>\n                            <span class="event-title">Sprint 5</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">17:20 - 18:00</span>\n                            <span class="event-title">Sprint 5</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #2) | MD: D | Rest: B</span>'
    ),

    # ========== DAY 4 (THURSDAY) ==========
    # Sprint 1 - gets Drone #1 (EM: C) — same time as Day 2 Sprint 1, handled by surrounding context
    # We need different context. Day 4 Sprint 1 time: 10:10-11:10 (same as Day 2!)
    # Day 2 already replaced above, so this will match Day 4 (the remaining occurrence)
    (
        '<span class="time">10:10 - 11:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">10:10 - 11:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #1) | MD: D | Rest: B</span>'
    ),
    # Sprint 3 Day 4 - same time as Day 2 Sprint 3, also already replaced above
    (
        '<span class="time">13:40 - 14:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A | MD: B | Rest: D</span>',
        '<span class="time">13:40 - 14:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A (+Drone #2) | MD: B | Rest: D</span>'
    ),

    # ========== DAY 5 (FRIDAY) ==========
    # Sprint 1 - gets Drone #1 (EM: C) — unique time 09:10-10:10
    (
        '<span class="time">09:10 - 10:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C | MD: D | Rest: B</span>',
        '<span class="time">09:10 - 10:10</span>\n                            <span class="event-title">Sprint 1</span>\n                            <span class="event-note">IDS: A | EM: C (+Drone #1) | MD: D | Rest: B</span>'
    ),
    # Sprint 3 - gets Drone #2 (EM: A) — unique time 12:40-13:40
    (
        '<span class="time">12:40 - 13:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A | MD: B | Rest: D</span>',
        '<span class="time">12:40 - 13:40</span>\n                            <span class="event-title">Sprint 3</span>\n                            <span class="event-note">IDS: C | EM: A (+Drone #2) | MD: B | Rest: D</span>'
    ),
]

count = 0
for old, new in replacements:
    if old in html:
        html = html.replace(old, new, 1)
        count += 1
    else:
        print(f"WARNING: Could not find:\n  {old[:80]}...")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Done — applied {count}/{len(replacements)} drone replacements.")
