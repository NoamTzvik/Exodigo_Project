import json

data_file = 'mission_data.json'
green_color = '#00d166'

with open(data_file, 'r', encoding='utf-8') as f:
    polygons = json.load(f)

# Filter out green ones
cleaned_polygons = [p for p in polygons if p.get('color', '').lower() != green_color]

with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(cleaned_polygons, f, indent=4)

print(f"Deleted {len(polygons) - len(cleaned_polygons)} green polygons.")
