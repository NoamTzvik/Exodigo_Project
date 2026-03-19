import csv
import io
import re

# We'll use the original CSV structure but with the new names.
# Since the current NewSchedule.csv has shifted times, I'll just shift them back or re-set them.

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
             # We want to shift everything back by 60 minutes relative to the current state (which was +60 - 20 = +40)
             # Current Tuesday Session 1 starts at 08:50. Original was 08:10.
             # So we shift back by 40 minutes.
             shift = -40
             
             if 'Meeting' in activity:
                 row['Start_Time'] = '07:30'
                 row['End_Time'] = '07:50'
                 row['Activity'] = 'Drive & Project Manager Meeting (פגישת מנהל פרויקט במהלך נסיעה)'
                 row['IDS_Team_Status'] = 'הגעה לשטח: 07:50 | תחילת עבודה: 08:10'
             else:
                 row['Start_Time'] = add_minutes(row['Start_Time'], shift)
                 row['End_Time'] = add_minutes(row['End_Time'], shift)
                 row['IDS_Team_Status'] = update_status_times(row['IDS_Team_Status'], shift)
                 row['EM_Op_Status'] = update_status_times(row['EM_Op_Status'], shift)
                 row['MD_Op_and_Drone_Status'] = update_status_times(row['MD_Op_and_Drone_Status'], shift)
                 
        rows.append(row)

with open('NewSchedule.csv', 'w', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Schedule adjusted: Drive+Meeting 20min, Setup starts 07:50.")
