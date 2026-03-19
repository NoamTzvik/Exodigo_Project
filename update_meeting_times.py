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
             # The user now wants the meeting to be 07:30-08:30.
             # In the last run (Step 1071), Meeting was 07:30-07:50. Setup 07:50-08:10. Session 1 08:10-09:10.
             # If we make the meeting 1 hour (07:30-08:30), we shift everything else forward by 40 minutes (07:50 -> 08:30).
             shift = 40
             
             if 'Project Manager Meeting' in activity:
                 row['Start_Time'] = '07:30'
                 row['End_Time'] = '08:30'
                 row['Activity'] = 'Project Manager Meeting'
                 # Note: "Drive to site (20 min) | Arrival: 07:50" (Removed Setup mention)
                 row['IDS_Team_Status'] = "Drive to site (20 min) | Arrival: 07:50"
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

print("Project Manager Meetings updated: 07:30-08:30. Schedule shifted.")
