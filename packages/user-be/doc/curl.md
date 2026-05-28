## links
ppt = https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/SwarjDesk.pdf
solution report = https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/Detailed-Report-Swarajdesk+-+Google+Docs.pdf
business model = https://sih-swaraj.s3.ap-south-2.amazonaws.com/docx/Buisness+Model+Proposal+-+Swarajdesk+-+Google+Docs.pdf

## create new user 
curl -X POST http://localhost:3000/api/users/signup \
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


## login user
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adityahota99@gmail.com",
    "password": "12345678"
  }'

## logout 
curl -X POST http://localhost:3000/api/users/logout \
  -H "Authorization: Bearer <your-token>"

## new complaint
curl -X POST http://localhost:3000/api/complaints  \
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

## =====================================
## GET COMPLAINT ROUTES (Protected)
## =====================================

## Get all complaints (public + own private) with pagination
## Query params: page, limit, status, department, urgency
curl -X GET "http://localhost:3000/api/complaints/get" \
  -H "Authorization: Bearer <paste-token-here>"

## Get all complaints with pagination
curl -X GET "http://localhost:3000/api/complaints/get?page=1&limit=10" \
  -H "Authorization: Bearer <paste-token-here>"

## Get all complaints filtered by status
curl -X GET "http://localhost:3000/api/complaints/get?status=REGISTERED" \
  -H "Authorization: Bearer <paste-token-here>"

## Get all complaints filtered by department
curl -X GET "http://localhost:3000/api/complaints/get?department=WATER_SUPPLY_SANITATION" \
  -H "Authorization: Bearer <paste-token-here>"

## Get all complaints filtered by urgency
curl -X GET "http://localhost:3000/api/complaints/get?urgency=HIGH" \
  -H "Authorization: Bearer <paste-token-here>"

## Get all complaints with multiple filters
curl -X GET "http://localhost:3000/api/complaints/get?status=REGISTERED&department=INFRASTRUCTURE&urgency=MEDIUM&page=1&limit=20" \
  -H "Authorization: Bearer <paste-token-here>"

## Get my complaints (all complaints created by authenticated user)
curl -X GET "http://localhost:3000/api/complaints/get/my" \
  -H "Authorization: Bearer <paste-token-here>"

## Get my complaints with status filter
curl -X GET "http://localhost:3000/api/complaints/get/my?status=COMPLETED" \
  -H "Authorization: Bearer <paste-token-here>"

## Get my complaints with pagination
curl -X GET "http://localhost:3000/api/complaints/get/my?page=1&limit=5" \
  -H "Authorization: Bearer <paste-token-here>"

## Get complaint by ID (UUID)
## Returns complaint if public OR if user is the complainant
curl -X GET "http://localhost:3000/api/complaints/get/<complaint-uuid>" \
  -H "Authorization: Bearer <paste-token-here>"

## Example with actual UUID:
curl -X GET "http://localhost:3000/api/complaints/get/123e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <paste-token-here>"

## Get complaint by sequence number
## Returns complaint if public OR if user is the complainant
curl -X GET "http://localhost:3000/api/complaints/get/seq/1" \
  -H "Authorization: Bearer <paste-token-here>"

## Get complaints by user ID
## Returns public complaints of the user (or all if viewing own profile)
curl -X GET "http://localhost:3000/api/complaints/get/user/<user-uuid>" \
  -H "Authorization: Bearer <paste-token-here>"

## Example with actual UUID:
curl -X GET "http://localhost:3000/api/complaints/get/user/123e4567-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <paste-token-here>"

## Get complaints by user ID with pagination
curl -X GET "http://localhost:3000/api/complaints/get/user/<user-uuid>?page=1&limit=10" \
  -H "Authorization: Bearer <paste-token-here>"

## =====================================
## AVAILABLE ENUM VALUES
## =====================================

## ComplaintStatus values:
## - REGISTERED
## - UNDER_PROCESSING
## - FORWARDED
## - ON_HOLD
## - COMPLETED
## - REJECTED
## - ESCALATED_TO_MUNICIPAL_LEVEL
## - ESCALATED_TO_STATE_LEVEL
## - DELETED

## ComplaintUrgency values:
## - LOW
## - MEDIUM
## - HIGH
## - CRITICAL

## Department values:
## - INFRASTRUCTURE
## - EDUCATION
## - REVENUE
## - HEALTH
## - WATER_SUPPLY_SANITATION
## - ELECTRICITY_POWER
## - TRANSPORTATION
## - MUNICIPAL_SERVICES
## - POLICE_SERVICES
## - ENVIRONMENT
## - HOUSING_URBAN_DEVELOPMENT
## - SOCIAL_WELFARE
## - PUBLIC_GRIEVANCES
