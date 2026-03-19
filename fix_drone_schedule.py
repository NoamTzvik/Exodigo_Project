import re
from bs4 import BeautifulSoup

def add_minutes(time_str, minutes):
    if not time_str or ':' not in time_str: return "00:00"
    h, m = map(int, time_str.split(':'))
    total_m = h * 60 + m + minutes
    return f"{total_m // 60:02d}:{total_m % 60:02d}"

with open('index.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

days_params = {
    '1': {'flights': [1, 4], 'start': '06:50', 'label': 'MONDAY (DAY 1)'},
    '2': {'flights': [1, 4], 'start': '08:20', 'label': 'TUESDAY (DAY 2)'},
    '3': {'flights': [1, 5], 'start': '12:10', 'label': 'WEDNESDAY (DAY 3)'},
    '4': {'flights': [1, 3], 'start': '08:30', 'label': 'THURSDAY (DAY 4)'},
    '5': {'flights': [1, 4], 'start': '08:30', 'label': 'FRIDAY (DAY 5)'}
}

# Clean
for ds in soup.find_all('div', class_='drone-status'):
    ds.decompose()

for day_outline in soup.find_all('div', class_='day-outline'):
    day_num = day_outline.get('data-day')
    if day_num not in days_params: continue
    
    sessions = day_outline.find_all('div', class_='priority-ids')
    last_session_end = "17:00"
    
    for idx, sess in enumerate(sessions):
        session_num = idx + 1
        time_span = sess.find('span', class_='time')
        if not time_span: continue
        
        start_time = time_span.get_text().split('-')[0].strip()
        ids_f = add_minutes(start_time, 60)
        em_f = add_minutes(start_time, 40)
        md_f = add_minutes(start_time, 30)
        last_session_end = ids_f
        
        ops = {'IDS': 'A', 'EM': 'C', 'MD': 'D', 'Rest': 'B'}
        grid = sess.find('div', class_='status-grid')
        if grid:
            for di in grid.find_all('div', class_='status-item'):
                t = di.get_text()
                for role in ops.keys():
                    if role + ':' in t:
                        ops[role] = t.split(role + ':')[1].split('(')[0].strip()
        
        title_span = sess.find('span', class_='event-title')
        orig_title = title_span.get_text(strip=True) if title_span else f"Session {session_num}"
        
        sess.clear()
        t_span = soup.new_tag('span', **{'class': 'time'})
        t_span.string = f"{start_time} - {ids_f}"
        sess.append(t_span)
        n_span = soup.new_tag('span', **{'class': 'event-title'})
        n_span.string = orig_title
        sess.append(n_span)
        new_grid = soup.new_tag('div', **{'class': 'status-grid'})
        
        def add_item(label, op, finish=None):
            di = soup.new_tag('div', **{'class': 'status-item'})
            st = soup.new_tag('strong')
            st.string = f"{label}:"
            di.append(st)
            di.append(f" {op} ")
            if finish:
                sp = soup.new_tag('span', **{'class': 'finish-time'})
                sp.string = f"({finish})"
                di.append(sp)
            return di

        new_grid.append(add_item('IDS', ops['IDS'], ids_f))
        new_grid.append(add_item('EM', ops['EM'], em_f))
        new_grid.append(add_item('MD', ops['MD'], md_f))
        new_grid.append(add_item('Rest', ops['Rest']))
        sess.append(new_grid)
        
        if session_num in days_params[day_num]['flights']:
            is_start = (session_num == days_params[day_num]['flights'][0])
            drone_op = ops['MD'] if is_start else ops['Rest'].split('&')[0].strip()
            ds = soup.new_tag('div', **{'class': 'drone-status'})
            dt = soup.new_tag('span', **{'class': 'time'})
            dt.string = f"{md_f} - {ids_f}"
            ds.append(dt)
            dtitle = soup.new_tag('span', **{'class': 'event-title'})
            dtitle.string = f"🚁 DRONE {1 if is_start else 2} (Operator: {drone_op})"
            ds.append(dtitle)
            dnote = soup.new_tag('span', **{'class': 'event-note'})
            dnote.string = "Fits strictly within session (MD finished)."
            ds.append(dnote)
            sess.append(ds)

    # Return
    ret_item = None
    for div in day_outline.find_all('div', class_='success'):
        if div.find('span', string=re.compile('Return')):
            ret_item = div
            break
                
    if ret_item:
        rt = ret_item.find('span', class_='time')
        if rt:
            rt.string = f"{last_session_end} - {add_minutes(last_session_end, 20)}"
    
    # Header
    h4 = day_outline.find('h4')
    if h4:
        label = days_params[day_num]['label']
        st_h = days_params[day_num]['start']
        end_h = add_minutes(last_session_end, 20)
        h4.string = f"{label} ({st_h} - {end_h})"

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(soup.prettify(formatter="html"))

print("Fixed header mapping. Done.")
