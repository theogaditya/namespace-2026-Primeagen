## Dhanbad Complaints

### 1. Road/Infrastructure
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Broken road surface",
    "description": "Large potholes on the main road near Bank More causing accidents and vehicle damage.",
    "urgency": "HIGH",
    "assignedDepartment": "INFRASTRUCTURE",
    "isPublic": true,
    "location": {
      "pin": "826001",
      "district": "Dhanbad",
      "city": "Dhanbad",
      "locality": "Bank More",
      "street": "GT Road"
    }
  }'

### 2. Water Supply
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Water pipeline leakage",
    "description": "Major water pipeline burst near Hirapur causing water wastage and flooding on streets.",
    "urgency": "CRITICAL",
    "assignedDepartment": "WATER_SUPPLY_SANITATION",
    "isPublic": true,
    "location": {
      "pin": "826001",
      "district": "Dhanbad",
      "city": "Dhanbad",
      "locality": "Hirapur",
      "street": "Station Road"
    }
  }'

### 3. Electricity
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Frequent power outages",
    "description": "Electricity supply is interrupted 4-5 times daily in Katras area affecting households and businesses.",
    "urgency": "HIGH",
    "assignedDepartment": "ELECTRICITY_POWER",
    "isPublic": true,
    "location": {
      "pin": "828113",
      "district": "Dhanbad",
      "city": "Katras",
      "locality": "Katras Bazar",
      "street": "Main Market Road"
    }
  }'

## Jamshedpur Complaints

### 1. Municipal Services
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Garbage not collected",
    "description": "Garbage has not been collected for over a week in Bistupur area causing foul smell and health hazards.",
    "urgency": "HIGH",
    "assignedDepartment": "MUNICIPAL_SERVICES",
    "isPublic": true,
    "location": {
      "pin": "831001",
      "district": "East Singhbhum",
      "city": "Jamshedpur",
      "locality": "Bistupur",
      "street": "Main Road"
    }
  }'

### 2. Infrastructure
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Street lights not working",
    "description": "Multiple street lights are non-functional on Marine Drive causing safety concerns at night.",
    "urgency": "MEDIUM",
    "assignedDepartment": "INFRASTRUCTURE",
    "isPublic": true,
    "location": {
      "pin": "831001",
      "district": "East Singhbhum",
      "city": "Jamshedpur",
      "locality": "Marine Drive",
      "street": "Jubilee Park Road"
    }
  }'

### 3. Environment
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Industrial pollution",
    "description": "Excessive smoke and dust from nearby factory polluting the air in Sakchi residential area.",
    "urgency": "HIGH",
    "assignedDepartment": "ENVIRONMENT",
    "isPublic": true,
    "location": {
      "pin": "831001",
      "district": "East Singhbhum",
      "city": "Jamshedpur",
      "locality": "Sakchi",
      "street": "Industrial Area Road"
    }
  }'


## Ranchi Complaints

### 1. Water Supply
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "No water supply",
    "description": "Water supply has been cut off for 3 days in Doranda area affecting hundreds of families.",
    "urgency": "CRITICAL",
    "assignedDepartment": "WATER_SUPPLY_SANITATION",
    "isPublic": true,
    "location": {
      "pin": "834002",
      "district": "Ranchi",
      "city": "Ranchi",
      "locality": "Doranda",
      "street": "HEC Colony Road"
    }
  }'

### 2. Infrastructure
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Road under construction blocked",
    "description": "Road construction work abandoned halfway near Kanke Dam leaving dangerous open trenches.",
    "urgency": "HIGH",
    "assignedDepartment": "INFRASTRUCTURE",
    "isPublic": true,
    "location": {
      "pin": "834006",
      "district": "Ranchi",
      "city": "Ranchi",
      "locality": "Kanke",
      "street": "Dam Road"
    }
  }'

### 3. Police Services
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Traffic violation hotspot",
    "description": "Rampant traffic rule violations at Main Road-Circular Road junction causing accidents daily.",
    "urgency": "MEDIUM",
    "assignedDepartment": "POLICE_SERVICES",
    "isPublic": true,
    "location": {
      "pin": "834001",
      "district": "Ranchi",
      "city": "Ranchi",
      "locality": "Main Road",
      "street": "Circular Road Junction"
    }
  }'


### Dhanbad - Education Department
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Government school infrastructure",
    "description": "Government primary school in Jharia has broken roof and no proper seating arrangement for students.",
    "urgency": "HIGH",
    "assignedDepartment": "EDUCATION",
    "isPublic": true,
    "location": {
      "pin": "828111",
      "district": "Dhanbad",
      "city": "Jharia",
      "locality": "Jharia Town",
      "street": "School Lane"
    }
  }'

### East Singhbhum (Jamshedpur) - Health Department
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Government hospital staff shortage",
    "description": "MGM Hospital in Sakchi has severe shortage of doctors and nurses causing long patient wait times.",
    "urgency": "CRITICAL",
    "assignedDepartment": "HEALTH",
    "isPublic": true,
    "location": {
      "pin": "831001",
      "district": "East Singhbhum",
      "city": "Jamshedpur",
      "locality": "Sakchi",
      "street": "Hospital Road"
    }
  }'

### Ranchi - Public Grievances Department
curl -X POST 'http://localhost:3000/api/complaints' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJiMTYyZmQ2Ni04MGFhLTRhYjYtYjljYi1hNmRjNDJiNTAyOTEiLCJlbWFpbCI6InVzZXIubm92MzAuMjAyNUBleGFtcGxlLmNvbSIsIm5hbWUiOiJOb3ZlbWJlciBVc2VyIiwiaWF0IjoxNzY0NjU5OTY1LCJleHAiOjE3NjQ3NDYzNjV9.dUVe5sPO5izNTOAOISTz0ddnTlZtDV3kirFzgHyupro' \
  -d '{
    "categoryId": "ccd444a9-424c-45fe-9136-5a489f1d9bf6",
    "subCategory": "Pension disbursement delay",
    "description": "Old age pension not received for last 4 months by residents in Bariatu area despite multiple applications.",
    "urgency": "HIGH",
    "assignedDepartment": "PUBLIC_GRIEVANCES",
    "isPublic": true,
    "location": {
      "pin": "834009",
      "district": "Ranchi",
      "city": "Ranchi",
      "locality": "Bariatu",
      "street": "Bariatu Road"
    }
  }'