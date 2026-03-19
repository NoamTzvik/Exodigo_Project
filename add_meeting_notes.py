import csv
import io
import re

input_file = 'NewSchedule.csv'
rows = []
with open(input_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        day = row['Day']
        activity = row['Activity']
        ids_status = row['IDS_Team_Status']
        
        if 'Project Manager Meeting' in activity:
             # Title
             row['Activity'] = 'Project Manager Meeting'
             
             # Timing details for note
             # Tuesday/Thursday: Drive starts 07:30, Ends 07:50. Setup ends 08:10.
             arrival = "07:50"
             work_start = "08:10"
             
             # Note in English
             row['IDS_Team_Status'] = f"Drive to site (20 min) | Arrival: {arrival} | Setup: {arrival} | Work Start: {work_start}"
             # Ensure EM and MD are empty for this row
             row['EM_Op_Status'] = ''
             row['MD_Op_and_Drone_Status'] = ''
             
        rows.append(row)

with open('NewSchedule.csv', 'w', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print("Project Manager Meetings updated to English and detailed descriptions.")
