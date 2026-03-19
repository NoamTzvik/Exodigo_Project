import csv
import re
from bs4 import BeautifulSoup

with open('index.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f, 'html.parser')

day_id = '1'
day_div = soup.find('div', class_='day-outline', attrs={'data-day': day_id})
print(f"Day {day_id} div found: {day_div is not None}")
if day_div:
    h4 = day_div.find('h4')
    print(f"Header found: {h4.text if h4 else 'No'}")
