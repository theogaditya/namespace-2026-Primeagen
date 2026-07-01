# Complaint Creation - cURL Requests

> **Base URL:** `http://localhost:3000`
> **Endpoint:** `POST /api/complaints`
> **Auth:** Bearer token required
> **Image URL:** `https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg`

---

## 1. Infrastructure — Pothole (JSON with attachmentUrl)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Pothole",
    "description": "Large pothole on the main highway near sector 12 causing accidents and traffic jams",
    "urgency": "HIGH",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "INFRASTRUCTURE",
    "isPublic": true,
    "location": {
      "pin": "110001",
      "district": "New Delhi",
      "city": "Delhi",
      "locality": "Connaught Place",
      "street": "Janpath Road",
      "latitude": 28.6315,
      "longitude": 77.2167
    }
  }'
```

---

## 2. Water Supply & Sanitation — Water Leakage (JSON)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Water Leakage",
    "description": "Major water pipeline burst near the residential colony causing flooding on the road",
    "urgency": "CRITICAL",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "WATER_SUPPLY_SANITATION",
    "isPublic": true,
    "location": {
      "pin": "560001",
      "district": "Bangalore Urban",
      "city": "Bangalore",
      "locality": "Koramangala",
      "street": "5th Block",
      "latitude": 12.9352,
      "longitude": 77.6245
    }
  }'
```

---

## 3. Electricity & Power — Street Light Not Working (JSON)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Street Light Not Working",
    "description": "Multiple street lights are non-functional in the area making it unsafe for pedestrians at night",
    "urgency": "MEDIUM",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "ELECTRICITY_POWER",
    "isPublic": true,
    "location": {
      "pin": "400001",
      "district": "Mumbai",
      "city": "Mumbai",
      "locality": "Andheri West",
      "street": "SV Road"
    }
  }'
```

---

## 4. Health — Unsanitary Conditions (LOW urgency, private)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Unsanitary Conditions",
    "description": "Open drain near the hospital entrance causing foul smell and potential health hazards for patients",
    "urgency": "LOW",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "HEALTH",
    "isPublic": false,
    "location": {
      "pin": "600001",
      "district": "Chennai",
      "city": "Chennai",
      "locality": "T. Nagar",
      "latitude": 13.0418,
      "longitude": 80.2341
    }
  }'
```

---

## 5. Municipal Services — Garbage Collection (multipart/form-data)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "categoryId=<CATEGORY_UUID>" \
  -F "subCategory=Garbage Collection" \
  -F "description=Garbage has not been collected for over a week in the residential area, causing severe odor" \
  -F "urgency=HIGH" \
  -F "attachmentUrl=https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg" \
  -F "assignedDepartment=MUNICIPAL_SERVICES" \
  -F "isPublic=true" \
  -F 'location={"pin":"500001","district":"Hyderabad","city":"Hyderabad","locality":"Begumpet","street":"Greenlands Road","latitude":17.4432,"longitude":78.4727}'
```

---

## 6. Transportation — Road Blockage (JSON, no street)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Road Blockage",
    "description": "Fallen tree blocking the entire road since yesterday, no authority has responded yet",
    "urgency": "HIGH",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "TRANSPORTATION",
    "isPublic": true,
    "location": {
      "pin": "700001",
      "district": "Kolkata",
      "city": "Kolkata",
      "locality": "Salt Lake"
    }
  }'
```

---

## 7. Environment — Illegal Dumping (CRITICAL)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Illegal Dumping",
    "description": "Industrial waste is being dumped near the river bank polluting the water supply for nearby villages",
    "urgency": "CRITICAL",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "ENVIRONMENT",
    "isPublic": true,
    "location": {
      "pin": "226001",
      "district": "Lucknow",
      "city": "Lucknow",
      "locality": "Gomti Nagar",
      "street": "River Bank Road",
      "latitude": 26.8467,
      "longitude": 80.9462
    }
  }'
```

---

## 8. Education — School Infrastructure (MEDIUM)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "School Infrastructure",
    "description": "Government school roof is leaking during monsoon, classrooms are unusable and students are affected",
    "urgency": "MEDIUM",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "EDUCATION",
    "isPublic": true,
    "location": {
      "pin": "302001",
      "district": "Jaipur",
      "city": "Jaipur",
      "locality": "Mansarovar",
      "street": "Near Vidya Bhawan"
    }
  }'
```

---

## 9. Police Services — Public Safety (JSON)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Public Safety",
    "description": "Repeated incidents of chain snatching in the locality during evening hours, need increased patrolling",
    "urgency": "HIGH",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "POLICE_SERVICES",
    "isPublic": false,
    "location": {
      "pin": "411001",
      "district": "Pune",
      "city": "Pune",
      "locality": "Shivaji Nagar",
      "latitude": 18.5308,
      "longitude": 73.8475
    }
  }'
```

---

## 10. Housing & Urban Development — Encroachment (multipart/form-data)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "categoryId=<CATEGORY_UUID>" \
  -F "subCategory=Encroachment" \
  -F "description=Illegal construction encroaching public footpath making it impossible for pedestrians to walk safely" \
  -F "urgency=MEDIUM" \
  -F "attachmentUrl=https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg" \
  -F "assignedDepartment=HOUSING_URBAN_DEVELOPMENT" \
  -F "isPublic=true" \
  -F 'location={"pin":"380001","district":"Ahmedabad","city":"Ahmedabad","locality":"Navrangpura","street":"CG Road","latitude":23.0350,"longitude":72.5612}'
```

---

## 11. Revenue — Property Tax Dispute (LOW, private)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Property Tax Dispute",
    "description": "Incorrect property tax assessment received, the charged amount is significantly higher than the actual property value",
    "urgency": "LOW",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "REVENUE",
    "isPublic": false,
    "location": {
      "pin": "440001",
      "district": "Nagpur",
      "city": "Nagpur",
      "locality": "Dharampeth",
      "street": "West High Court Road"
    }
  }'
```

---

## 12. Social Welfare — Pension Delay (JSON)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Pension Delay",
    "description": "Old age pension has not been credited for the last three months despite multiple follow-ups at the local office",
    "urgency": "HIGH",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "SOCIAL_WELFARE",
    "isPublic": true,
    "location": {
      "pin": "208001",
      "district": "Kanpur",
      "city": "Kanpur",
      "locality": "Civil Lines",
      "latitude": 26.4499,
      "longitude": 80.3319
    }
  }'
```

---

## 13. Public Grievances — Corruption Report (CRITICAL, private)

```bash
curl -X POST http://localhost:3000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "categoryId": "<CATEGORY_UUID>",
    "subCategory": "Corruption Report",
    "description": "Government official demanding bribe for processing land registration documents at the sub-registrar office",
    "urgency": "CRITICAL",
    "attachmentUrl": "https://pub-a7deba7d0b9642f8afcfd3aebbcb446f.r2.dev/uploads/1765265603420_pothole_1.jpg",
    "assignedDepartment": "PUBLIC_GRIEVANCES",
    "isPublic": false,
    "location": {
      "pin": "462001",
      "district": "Bhopal",
      "city": "Bhopal",
      "locality": "Arera Colony",
      "street": "MP Nagar Zone 1",
      "latitude": 23.2332,
      "longitude": 77.4345
    }
  }'
```

---

## Helper: Fetch Category IDs

```bash
curl -s http://localhost:3000/api/categories \
  -H "Authorization: Bearer <YOUR_TOKEN>" | jq '.data[] | {id, name, assignedDepartment}'
```

> Replace `<CATEGORY_UUID>` with the actual category `id` from the response above matching the `assignedDepartment`.
> Replace `<YOUR_TOKEN>` with a valid JWT bearer token.
