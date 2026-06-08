# User Backend - Deployed API Curl Commands

## Deployment Info
- **HTTP API**: https://sih-user-be.adityahota.online
- **WebSocket**: https://sih-ws-user-be.adityahota.online

## Links
- PPT: https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/SwarjDesk.pdf
- Solution Report: https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/Detailed-Report-Swarajdesk+-+Google+Docs.pdf
- Business Model: https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/Buisness+Model+Proposal+-+Swarajdesk+-+Google+Docs.pdf

---

## Health Check

```bash
curl -X GET https://sih-user-be.adityahota.online/api/health
```

---

## Authentication Routes

### Create New User (Signup)

```bash
curl -X POST https://sih-user-be.adityahota.online/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user.nov30.2025@example.com",
    "phoneNumber": "+919988776655",
    "name": "November User",
    "password": "Test@12345",
    "dateOfBirth": "1995-05-15",
    "aadhaarId": "998877665544",
    "preferredLanguage": "English",
    "location": {
      "pin": "560001",
      "district": "Bangalore Urban",
      "city": "Bangalore",
      "locality": "Koramangala",
      "street": "5th Block",
      "municipal": "BBMP",
      "state": "Karnataka"
    }
  }'
```

### Login User

```bash
curl -X POST https://sih-user-be.adityahota.online/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adityahota99@gmail.com",
    "password": "12345678"
  }'
```

### Logout

```bash
curl -X POST https://sih-user-be.adityahota.online/api/users/logout \
  -H "Authorization: Bearer <your-token>"
```

---

## Complaint Routes

### Create New Complaint

```bash
curl -X POST https://sih-user-be.adityahota.online/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <paste-token-here>" \
  -d '{
    "categoryId": "123e4567-e89b-12d3-a456-426614174001",
    "subCategory": "Water Leakage",
    "description": "There is a major water leakage on the main road causing traffic issues",
    "urgency": "HIGH",
    "assignedDepartment": "WATER_SUPPLY_SANITATION",
    "isPublic": true,
    "location": {
      "pin": "560001",
      "district": "Bangalore Urban",
      "city": "Bangalore",
      "locality": "Koramangala",
      "street": "5th Block"
    }
  }'
```

---

## GET Complaint Routes (Protected)

### Get All Complaints (Public + Own Private) with Pagination

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get All Complaints with Pagination

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get?page=1&limit=10" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get All Complaints Filtered by Status

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get?status=REGISTERED" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get All Complaints Filtered by Department

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get?department=WATER_SUPPLY_SANITATION" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get All Complaints Filtered by Urgency

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get?urgency=HIGH" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get All Complaints with Multiple Filters

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get?status=REGISTERED&department=INFRASTRUCTURE&urgency=MEDIUM&page=1&limit=20" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get My Complaints (All Complaints Created by Authenticated User)

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/my" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get My Complaints with Status Filter

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/my?status=COMPLETED" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get My Complaints with Pagination

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/my?page=1&limit=5" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get Complaint by ID (UUID)

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/<complaint-uuid>" \
  -H "Authorization: Bearer <paste-token-here>"
```

**Example with actual UUID:**

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/123e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get Complaint by Sequence Number

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/seq/1" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get Complaints by User ID

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/user/<user-uuid>" \
  -H "Authorization: Bearer <paste-token-here>"
```

**Example with actual UUID:**

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/user/123e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <paste-token-here>"
```

### Get Complaints by User ID with Pagination

```bash
curl -X GET "https://sih-user-be.adityahota.online/api/complaints/get/user/<user-uuid>?page=1&limit=10" \
  -H "Authorization: Bearer <paste-token-here>"
```

---

## Available Enum Values

### ComplaintStatus Values
- `REGISTERED`
- `UNDER_PROCESSING`
- `FORWARDED`
- `ON_HOLD`
- `COMPLETED`
- `REJECTED`
- `ESCALATED_TO_MUNICIPAL_LEVEL`
- `ESCALATED_TO_STATE_LEVEL`
- `DELETED`

### ComplaintUrgency Values
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### Department Values
- `INFRASTRUCTURE`
- `EDUCATION`
- `REVENUE`
- `HEALTH`
- `WATER_SUPPLY_SANITATION`
- `ELECTRICITY_POWER`
- `TRANSPORTATION`
- `MUNICIPAL_SERVICES`
- `POLICE_SERVICES`
- `ENVIRONMENT`
- `HOUSING_URBAN_DEVELOPMENT`
- `SOCIAL_WELFARE`
- `PUBLIC_GRIEVANCES`
