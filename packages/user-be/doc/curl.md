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
    "email": "user.nov30.2025@example.com",
    "password": "Test@12345"
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
  
