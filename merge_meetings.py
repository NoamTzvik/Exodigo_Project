import csv
import io
import re
from datetime import datetime, timedelta

def add_minutes(time_str, minutes):
    if not time_str: return ""
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
# We'll reload the ORIGINAL CSV (from the backup or just undo the last shift) to avoid cumulative shifts.
# Actually, I'll just re-read the one created in Step 904 which had no meeting.

# Let's verify the content of NewSchedule.csv (it was updated in the last turn).
# I'll just look for the first 08:30 in Tuesday.

rows = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        day = row['Day']
        activity = row['Activity']
        
        # If we see the meeting we just added, we'll merge it with the next "Drive"
        if 'Project Manager Meeting' in activity:
            # We skip this row and merge it with the NEXT row (which is the Drive)
            try:
                next_row = next(reader)
                # Merged row
                merged_row = {
                    'Day': day,
                    'Start_Time': '07:30',
                    'End_Time': '08:30',
                    'Activity': 'Drive & Project Manager Meeting (פגישת מנהל פרויקט במהלך נסיעה)',
                    'IDS_Team_Status': '',
                    'EM_Op_Status': '',
                    'MD_Op_and_Drone_Status': ''
                }
                rows.append(merged_row)
                
                # Now we need to adjust the FOLLOWING row (Setup) to start at 08:30.
                # All subsequent rows were already shifted by 1 hour in the last script run,
                # but wait! In the last run:
                # Meeting 07:30-08:30. Drive 08:30-08:50. Setup 08:50-09:10.
                # If we merge Meeting+Drive into 07:30-08:30, then Setup starts at 08:30.
                # So we need to shift all SUBSEQUENT rows by -20 minutes relative to the last run.
                
                # We'll just re-process everything from the original "Step 904" baseline if we can.
                # Actually, I'll just detect the next row and adjust its start.
            except StopIteration:
                pass
            continue
            
        # For all other rows in Tues/Thurs, they are currently shifted by 1 hour.
        # If we merge the 20min drive into the 1hr meeting, we save 20 minutes of overall delay.
        # So instead of +60min, we shift by +40min relative to the baseline.
        # BUT since they are ALREADY +60min, we shift by -20min.
        if day in ['Tuesday', 'Thursday']:
             row['Start_Time'] = add_minutes(row['Start_Time'], -20)
             row['End_Time'] = add_minutes(row['End_Time'], -20)
             row['IDS_Team_Status'] = update_status_times(row['IDS_Team_Status'], -20)
             row['EM_Op_Status'] = update_status_times(row['EM_Op_Status'], -20)
             row['MD_Op_and_Drone_Status'] = update_status_times(row['MD_Op_and_Drone_Status'], -20)
             
        rows.append(row)

with open('NewSchedule.csv', 'w', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Project Manager Meeting merged with Drive.")
