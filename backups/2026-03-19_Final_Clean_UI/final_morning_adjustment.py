import csv
import re
from datetime import datetime, timedelta

def add_minutes(time_str, minutes):
    from datetime import datetime, timedelta
    t = datetime.strptime(time_str, "%H:%M")
    t += timedelta(minutes=minutes)
    return t.strftime("%H:%M")

def update_status_times(status, shift_min):
    if not status: return ""
    def shift_match(match):
        return f"(Ends {add_minutes(match.group(1), shift_min)})"
    new_status = re.sub(r'\(Ends (\d{2}:\d{2})\)', shift_match, status)
    
    def shift_drone(match):
        return f"{match.group(1)} ({add_minutes(match.group(2), shift_min)}-{add_minutes(match.group(3), shift_min)})"
    new_status = re.sub(r'(Drone \d) \((\d{2}:\d{2})-(\d{2}:\d{2})\)', shift_drone, new_status)
    return new_status

input_file = 'NewSchedule.csv'
rows = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        day = row['Day']
        activity = row['Activity']
        
        if day in ['Tuesday', 'Thursday']:
             if 'Project Manager Meeting' in activity:
                 # Note: "Drive to site: 20 min" instead of the long note
                 row['IDS_Team_Status'] = "Drive to site: 20 min"
             
        rows.append(row)

with open('NewSchedule.csv', 'w', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Project Manager Meeting note updated: Drive to site: 20 min.")
