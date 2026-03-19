# Exodigo_System.md - System Architecture & Map Logic

## 1. 3D Map Application Logic
* [cite_start]**Topography Layer:** Load aerial satellite map with 3D elevation model (DEM) to represent the incline[cite: 23, 60].
* **Polygon Grid Layer:**
    * Generate grid bounded by the suburban street area.
    * [cite_start]**Constraint Validator:** Polygons must not exceed 35x40 meters[cite: 21, 53].
    * [cite_start]**Overlap Validator:** Force exactly 2-meter overlap[cite: 22, 53].
    * **Styling:** Black borders. Fill color indicates the assigned scanning day (Day 1 - Day 5).
* **Time-Based Interactivity (On-Click):**
    * Trigger detailed popup per polygon.
    * [cite_start]Display: Day & Time, Weather & Terrain status[cite: 23, 30].
    * [cite_start]Display Active Sensors: IDS status [cite: 28][cite_start], MD status [cite: 27][cite_start], EM transmitter locations (15 transmitters, 30-60m away, 4m spacing)[cite: 26, 36].
    * Display Personnel Activity: Allocation of the 4 team members.
* [cite_start]**Underground Infrastructure Visuals:** Render colored lines under the 3D surface representing layered utilities based on global infrastructure organization methodologies[cite: 3].

## 2. External Files Generation Logic
The system must execute the generation of the following output files:

### A. `equipment_and_logistics.csv`
* **Columns:** Category, Item Name, Quantity, Notes.
* [cite_start]**Company Items:** 1 IDS system, 1 EM system + 15 Transmitters [cite: 36][cite_start], 1 MD system, Safety cones for road closures [cite: 42, 43][cite_start], Drone for aerial photographs[cite: 60].
* [cite_start]**Personal Items:** Extreme cold gear (for Wednesday snow) [cite: 30][cite_start], anti-slip boots, Airbnb supplies[cite: 39].

### B. `field_operations_checklist.md`
* [cite_start]**Pre-Scan:** Daily setup, structured approach preparation, commute timing (20 mins)[cite: 39, 51].
* [cite_start]**Scan Days:** Overlap QA check, road closure management [cite: 42, 43][cite_start], marking Key Points[cite: 45].
* [cite_start]**Post-Scan:** Finalizing required tasks before leaving, taking field photos[cite: 49, 54, 57].

### C. `weekly_schedule_timeline.json`
* [cite_start]Structure JSON timeline mapping Days 1-5[cite: 56].
* [cite_start]Inject absolute constraints: Commute (20 mins) [cite: 39][cite_start], Mon 09:00 AM meeting [cite: 33][cite_start], Tue/Thu 07:30 AM meetings [cite: 34][cite_start], Wed morning snow delay[cite: 30, 31].