import csv
import re
from bs4 import BeautifulSoup

def parse_schedule(csv_path):
    schedule = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if not any(row.values()): continue
            schedule.append({k.strip(): (v.strip() if v else "") for k, v in row.items()})
    return schedule

def extract_drone_info(row):
    cols = ['IDS_Team_Status', 'EM_Op_Status', 'MD_Op_and_Drone_Status']
    for col in cols:
        val = row.get(col, "")
        if 'Drone' in val:
            drone_match = re.search(r'(Drone \d) \((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)', val)
            if drone_match:
                op_match = re.search(r'Op ([\w\s\+&]+)', val.split('|')[0])
                op_name = op_match.group(1).strip() if op_match else "D"
                return {
                    'num': drone_match.group(1),
                    'start': drone_match.group(2),
                    'end': drone_match.group(3),
                    'op': op_name.replace('Rest', '').strip()
                }
    return None

def create_event_html(soup, row):
    start = row.get('Start_Time', '')
    end = row.get('End_Time', '')
    activity = row.get('Activity', '')
    
    classes = ['event-item']
    style = ""
    
    if 'Session' in activity:
        classes.append('priority-ids')
    elif any(kw in activity for kw in ['Lunch', 'Break', 'Return', 'הפסקה', 'צהריים', 'ארוחה']):
        classes.append('success')
        if any(kw in activity for kw in ['Return', 'Drive', 'חזרה', 'נסיעה']):
             style = "border-left-color: #ff9d00;"
    elif any(kw in activity for kw in ['Drive', 'נסיעה', 'Meeting']):
        style = "border-left-color: #ff9d00;"
        if 'Meeting' in activity: style = "border-left-color: #8c52ff;"
    elif any(kw in activity for kw in ['Setup', 'Pack', 'התארגנות', 'ציוד']):
        style = "border-left-color: #a0a0a0;"
    elif any(kw in activity for kw in ['Meeting', 'פגישה']):
        style = "border-left-color: #8c52ff;"
        
    div = soup.new_tag('div', attrs={'class': ' '.join(classes)})
    if style: div['style'] = style
        
    # Time
    time_span = soup.new_tag('span', attrs={'class': 'time'})
    time_span.string = f"{start} - {end}"
    div.append(time_span)
    
    # Title
    title_span = soup.new_tag('span', attrs={'class': 'event-title'})
    title_span.string = activity
    div.append(title_span)
    
    if 'Session' in activity:
        grid_div = soup.new_tag('div', attrs={'class': 'status-grid'})
        status_data = [
            ('IDS', row.get('IDS_Team_Status', '')),
            ('EM', row.get('EM_Op_Status', '')),
            ('MD', row.get('MD_Op_and_Drone_Status', ''))
        ]
        for role, raw in status_data:
            if not raw: continue
            cleaned_raw = raw.split('|')[0].strip()
            item_div = soup.new_tag('div', attrs={'class': 'status-item'})
            strong = soup.new_tag('strong')
            strong.string = f"{('Rest' if 'Rest' in cleaned_raw else role)}:"
            item_div.append(strong)
            names_match = re.search(r'Op ([\w\s\+&]+)', cleaned_raw)
            names = names_match.group(1).strip() if names_match else cleaned_raw.replace('Rest', '').replace(':', '').strip()
            item_div.append(f" {names} ")
            finish_match = re.search(r'\(Ends (\d{2}:\d{2})\)', cleaned_raw)
            if finish_match:
                f_span = soup.new_tag('span', attrs={'class': 'finish-time'})
                f_span.string = f"({finish_match.group(1)})"
                item_div.append(f_span)
            grid_div.append(item_div)
        div.append(grid_div)
        
        drone = extract_drone_info(row)
        if drone:
            drone_div = soup.new_tag('div', attrs={'class': 'drone-status'})
            d_time = soup.new_tag('span', attrs={'class': 'time'})
            d_time.string = f"{drone['start']} - {drone['end']}"
            drone_div.append(d_time)
            ti_span = soup.new_tag('span', attrs={'class': 'event-title'})
            # REMOVED ICON
            ti_span.string = f"{drone['num'].upper()} (Operator: {drone['op']})"
            drone_div.append(ti_span)
            tags_div = soup.new_tag('div', attrs={'class': 'phase-tags'})
            for p, duration in [('Setup', '10m'), ('Flight', '20m')]:
                pt = soup.new_tag('span', attrs={'class': f'phase-tag {p.lower()}'})
                pt.string = f"{p} ({duration})"
                tags_div.append(pt)
            drone_div.append(tags_div)
            note = soup.new_tag('span', attrs={'class': 'event-note'})
            note.string = "MD scan complete -> 10m Setup + 20m Flight." if 'Drone 1' in drone['num'] else "Session scan near completion -> 10m Setup + 20m Flight."
            drone_div.append(note)
            div.append(drone_div)
    else:
        note_text = " ".join([row.get(c, '') for c in ['IDS_Team_Status', 'EM_Op_Status', 'MD_Op_and_Drone_Status']]).strip()
        if note_text:
            note_span = soup.new_tag('span', attrs={'class': 'event-note'})
            note_span.string = note_text
            div.append(note_span)
    return div

def main():
    rows = parse_schedule('NewSchedule.csv')
    with open('index.html', 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')
    day_map = {'Monday': '1', 'Tuesday': '2', 'Wednesday': '3', 'Thursday': '4', 'Friday': '5'}
    for day_name, day_id in day_map.items():
        day_div = soup.find('div', class_='day-outline', attrs={'data-day': day_id})
        if not day_div: continue
        day_events = [r for r in rows if r['Day'] == day_name]
        if not day_events: continue
        h4 = day_div.find('h4')
        if h4:
            s_time = day_events[0]['Start_Time']
            e_time = day_events[-1]['End_Time']
            h4.string = f"{day_name.upper()} (DAY {day_id}) ({s_time} - {e_time})"
        for child in list(day_div.find_all(recursive=False)):
            if child.name != 'h4': child.decompose()
        for row in day_events:
            day_div.append(create_event_html(soup, row))
    final_output = soup.prettify(formatter="html")
    with open('index.html', 'wb') as f:
        f.write(final_output.encode('utf-8', errors='replace'))

if __name__ == '__main__':
    main()
