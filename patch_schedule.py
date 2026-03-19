import re

with open("index.html", "r") as f:
    html = f.read()

# Generate the new Day 1
day1_html = """<div class="day-outline" data-day="1" style="display: none;">
                        <h4>MONDAY (DAY 1)</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">06:50 - 07:10</span>
                            <span class="event-title" style="direction: rtl;">נסיעה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה לשטח העבודה (20 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">07:10 - 07:30</span>
                            <span class="event-title" style="direction: rtl;">הקמה</span>
                            <span class="event-note" style="direction: rtl;">פריקת ציוד והצבת טרנסמיטרים 1-2 (20 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">07:30 - 08:30</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 1</span>
                            <span class="event-note" style="direction: rtl;">א'+ב' סורקים | ג' סורק | ד' סורק (מטיס רחפן #1)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title" style="direction: rtl;">קיפול</span>
                            <span class="event-note" style="direction: rtl;">קיפול טרנסמיטרים כהכנה לישיבה (20 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:50 - 09:00</span>
                            <span class="event-title" style="direction: rtl;">נסיעה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה ל-Denim Coffee (10 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #8c52ff;">
                            <span class="time">09:00 - 10:00</span>
                            <span class="event-title" style="direction: rtl;">ישיבת צוות</span>
                            <span class="event-note" style="direction: rtl;">ישיבה שבועית בבית הקפה (60 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">10:00 - 10:10</span>
                            <span class="event-title" style="direction: rtl;">נסיעה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה חזרה לשטח (10 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">10:10 - 10:30</span>
                            <span class="event-title" style="direction: rtl;">הקמה</span>
                            <span class="event-note" style="direction: rtl;">פריסת טרנסמיטרים מחדש לפוליגונים 3-4 (20 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:30 - 11:30</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 2</span>
                            <span class="event-note" style="direction: rtl;">ג'+ד' סורקים | א' סורק | ב' סורק</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">11:30 - 12:30</span>
                            <span class="event-title" style="direction: rtl;">צהריים</span>
                            <span class="event-note" style="direction: rtl;">מנוחה וארוחת צהריים לצוות (60 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">12:30 - 12:45</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">מקפלים ופורסים לפוליגונים 5-6 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">12:45 - 13:45</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 3</span>
                            <span class="event-note" style="direction: rtl;">א'+ב' סורקים | ד' סורק | ג' סורק</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:45 - 14:00</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">מקפלים ופורסים טרנסמיטרים לפוליגונים 7-8 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">14:00 - 15:00</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 4</span>
                            <span class="event-note" style="direction: rtl;">ג'+ד' סורקים | ב' סורק | א' סורק (מטיס רחפן #2)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:00 - 15:15</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">מעבירים לפוליגון 9 האחרון (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:15 - 15:45</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 5</span>
                            <span class="event-note" style="direction: rtl;">א' סורק חצי | ג' סורק | ד' סורק</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:45 - 16:05</span>
                            <span class="event-title" style="direction: rtl;">קיפול</span>
                            <span class="event-note" style="direction: rtl;">פירוק מכשור ואריזה בטוחה ברכבים (20 דק')</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:05 - 16:25</span>
                            <span class="event-title" style="direction: rtl;">חזרה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה חזרה (20 דק')</span>
                        </div>
                    </div>"""

# Generate 3,4,5
def make_normal_day(day_num, title):
    return f"""<div class="day-outline" data-day="{day_num}" style="display: none;">
                        <h4>{title}</h4>
                        <div class="event-item" style="border-left-color: #ff9d00;">
                            <span class="time">08:30 - 08:50</span>
                            <span class="event-title" style="direction: rtl;">נסיעה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה לשטח העבודה (20 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">08:50 - 09:10</span>
                            <span class="event-title" style="direction: rtl;">הקמה</span>
                            <span class="event-note" style="direction: rtl;">פריקה והצבת טרנסמיטרים 1-2 (20 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">09:10 - 10:10</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 1</span>
                            <span class="event-note" style="direction: rtl;">א'+ב' סורקים | ג' סורק | ד' סורק (ומטיס רחפן #1)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">10:10 - 10:25</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">כולם מקפלים ופורסים ל-3-4 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">10:25 - 11:25</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 2</span>
                            <span class="event-note" style="direction: rtl;">ג'+ד' סורקים | א' סורק | ב' סורק</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">11:25 - 12:25</span>
                            <span class="event-title" style="direction: rtl;">צהריים</span>
                            <span class="event-note" style="direction: rtl;">מנוחה גדולה וארוחת צהריים (60 דק')</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">12:25 - 12:40</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">כולם מקפלים ופורסים טרנסמיטרים 5-6 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">12:40 - 13:40</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 3</span>
                            <span class="event-note" style="direction: rtl;">א'+ג' סורקים | ב' סורק | ד' סורק</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">13:40 - 13:55</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">כולם יחד מקפלים ופורסים 7-8 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">13:55 - 14:55</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 4</span>
                            <span class="event-note" style="direction: rtl;">ב'+ד' סורקים | א' סורק | ג' סורק (מטיס רחפן #2)</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">14:55 - 15:10</span>
                            <span class="event-title" style="direction: rtl;">העברה</span>
                            <span class="event-note" style="direction: rtl;">מעבירים טרנסמיטרים לפוליגון 9 (15 דק')</span>
                        </div>
                        <div class="event-item priority-ids">
                            <span class="time">15:10 - 15:40</span>
                            <span class="event-title" style="direction: rtl;">ספרינט 5</span>
                            <span class="event-note" style="direction: rtl;">א' סורק חצי | ד' סורק | ב' סורק</span>
                        </div>
                        <div class="event-item" style="border-left-color: #a0a0a0;">
                            <span class="time">15:40 - 16:00</span>
                            <span class="event-title" style="direction: rtl;">קיפול</span>
                            <span class="event-note" style="direction: rtl;">פירוק מכשור ואריזה (20 דק')</span>
                        </div>
                        <div class="event-item success">
                            <span class="time">16:00 - 16:20</span>
                            <span class="event-title" style="direction: rtl;">חזרה</span>
                            <span class="event-note" style="direction: rtl;">נסיעה חזרה (20 דק')</span>
                        </div>
                    </div>"""

day345_html = make_normal_day(3, "WEDNESDAY (DAY 3)") + "\n" + make_normal_day(4, "THURSDAY (DAY 4)") + "\n" + make_normal_day(5, "FRIDAY (DAY 5)")

condensed_html = """<div class="day-outline condensed-view" data-day="all">
                        <h4 style="margin-bottom: 24px;">WEEKLY OVERVIEW (תקציר שבועי)</h4>
                        
                        <div class="event-item priority-ids" style="cursor: pointer; border-left-color: #00f0ff;" onclick="document.querySelector('.filter-btn[data-day=\\'1\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 1 (MONDAY)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">פוליגונים 1-9 (כולל ישיבה)</span>
                            <span class="event-note" style="direction: rtl;">06:50 - 16:25 | פריסה שבועית ראשונית</span>
                        </div>
                        
                        <div class="event-item" style="cursor: pointer; border-left-color: #2a2a2a;" onclick="document.querySelector('.filter-btn[data-day=\\'2\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 2 (TUESDAY)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">גזרה דרומית וצפונית</span>
                            <span class="event-note" style="direction: rtl;">12:30 - 21:05 | פיצול ל-2 גזרות ביום כפול</span>
                        </div>

                        <div class="event-item warning" style="cursor: pointer; border-left-color: #8b4513;" onclick="document.querySelector('.filter-btn[data-day=\\'3\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 3 (WEDNESDAY)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">פוליגונים 1-9 (שגרה)</span>
                            <span class="event-note" style="direction: rtl;">08:30 - 16:20 | סריקות לאורך הצירים</span>
                        </div>

                        <div class="event-item" style="cursor: pointer; border-left-color: #ff9d00;" onclick="document.querySelector('.filter-btn[data-day=\\'4\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 4 (THURSDAY)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">פוליגונים 1-9 (שגרה)</span>
                            <span class="event-note" style="direction: rtl;">08:30 - 16:20 | סריקת השלמות מתגלגלת</span>
                        </div>

                        <div class="event-item success" style="cursor: pointer; border-left-color: #ffffff;" onclick="document.querySelector('.filter-btn[data-day=\\'5\\']').click()">
                            <span class="time" style="font-weight: bold;">DAY 5 (FRIDAY)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">סגירות פרויקט</span>
                            <span class="event-note" style="direction: rtl;">08:30 - 16:20 | פירוק סופי לקראת שבת</span>
                        </div>

                        <div class="event-item" style="cursor: pointer; border-left-color: #ffff00;" onclick="document.querySelector('.filter-btn[data-day=\\'prescan\\']').click()">
                            <span class="time" style="font-weight: bold;">PRE-SCAN (KEY POINTS)</span>
                            <span class="event-title" style="direction: rtl; font-weight: normal;">מוקדי עניין אסטרטגיים</span>
                            <span class="event-note" style="direction: rtl;">נקודות מפתח לסנכרון ומדידה</span>
                        </div>
                    </div>"""

# Replace in html
# 1. Add condensed at the very beginning of #protocol-timeline
html = re.sub(r'(<div class="timeline" id="protocol-timeline"[^>]*>)', r'\1\n' + condensed_html, html)

# 2. Replace Day 1
html = re.sub(r'<div class="day-outline" data-day="1">.*?</div>\s*</div>', day1_html, html, flags=re.DOTALL)

# 3. Replace Day 3,4,5
html = re.sub(r'<div class="day-outline" data-day="3">.*<div class="event-item success">.*?</span.*?</span.*?</span.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*?</div.*</div.*?</div.*?</div.*</div.*</div.*</div.*</div.*</div.*</div.*</div.*</div.*?</div.*?', lambda m: "REPLACEME", html, flags=re.DOTALL)

# The regex approach might be brittle for nested divs.
# Let's just use string replace on the exact chunks
