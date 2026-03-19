import csv
import io
from datetime import datetime, timedelta

def add_hour(time_str):
    if not time_str: return ""
    t = datetime.strptime(time_str, "%H:%M")
    t += timedelta(hours=1)
    return t.strftime("%H:%M")

def update_status_times(status):
    if not status: return ""
    # Regex to find (Ends HH:MM) or (Start-End)
    def shift_match(match):
        return f"(Ends {add_hour(match.group(1))})"
    
    new_status = re.sub(r'\(Ends (\d{2}:\d{2})\)', shift_match, status)
    
    def shift_drone(match):
        return f"{match.group(1)} ({add_hour(match.group(2))}-{add_hour(match.group(3))})"
    
    new_status = re.sub(r'(Drone \d) \((\d{2}:\d{2})-(\d{2}:\d{2})\)', shift_drone, new_status)
    return new_status

import re

input_file = 'NewSchedule.csv'
output_file = 'NewSchedule_Updated.csv'

rows = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        day = row['Day']
        if day in ['Tuesday', 'Thursday']:
            # Shift times
            start = row['Start_Time']
            end = row['End_Time']
            
            # If it's the first row of the day, insert the meeting before it
            if start == "07:30":
                meeting_row = {
                    'Day': day,
                    'Start_Time': '07:30',
                    'End_Time': '08:30',
                    'Activity': 'Project Manager Meeting (פגישת מנהל פרויקט)',
                    'IDS_Team_Status': '',
                    'EM_Op_Status': '',
                    'MD_Op_and_Drone_Status': ''
                }
                rows.append(meeting_row)
            
            # Now shift the current row
            row['Start_Time'] = add_hour(start)
            row['End_Time'] = add_hour(end)
            
            # Update status strings which contain times
            row['IDS_Team_Status'] = update_status_times(row['IDS_Team_Status'])
            row['EM_Op_Status'] = update_status_times(row['EM_Op_Status'])
            row['MD_Op_and_Drone_Status'] = update_status_times(row['MD_Op_and_Drone_Status'])
            
        rows.append(row)

with open(output_file, 'w', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("CSV updated with Project Manager Meetings.")
