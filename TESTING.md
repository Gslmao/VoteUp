# API Testing Guide

Complete command reference for testing all endpoints.

## Prerequisites

```bash
# Start dev server
pnpm dev

# Server runs at http://localhost:3000
BASE="http://localhost:3000"
```

---

## Environment Setup

```bash
# Generate secrets (run once)
openssl rand -base64 32   # JWT_SECRET
openssl rand -base64 32   # ADMIN_SETUP_KEY

# Update .env with generated values
```

---

## 1. Admin Setup (One-time)

```bash
# Create first admin user
curl -X POST "$BASE/api/admin/setup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securepass123",
    "setupKey": "your-secure-setup-key"
  }'

# Expected: {"success":true,"admin":{"id":1,"email":"admin@example.com"},"message":"Admin created..."}
```

---

## 2. Admin Authentication

```bash
# Login - returns cookie + token in response
LOGIN_RESPONSE=$(curl -s -X POST "$BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"securepass123"}' \
  -c cookies.txt -D headers.txt)

echo "$LOGIN_RESPONSE"
# Expected: {"success":true}

# Extract token from cookie (for Bearer auth)
TOKEN=$(grep admin_token cookies.txt | awk '{print $7}')
echo "Token: $TOKEN"
```

---

## 3. Public Routes (No Auth)

### 3.1 Register Voter

```bash
curl -X POST "$BASE/api/voters" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "dob": "1990-05-15",
    "address": "123 Main Street, Springfield",
    "constituencyId": 1,
    "idDocumentType": "AADHAAR",
    "idDocumentNumber": "123456789012"
  }'

# Expected: {"success":true,"voterId":1}
# Save voterId for vote casting
VOTER_ID=1
```

### 3.2 List Candidates

```bash
# All candidates
curl "$BASE/api/candidates"

# Filter by election
curl "$BASE/api/candidates?electionId=1"
```

### 3.3 List Ongoing Elections

```bash
curl "$BASE/api/elections"
# Expected: [{"id":1,"name":"General Election 2024","status":"ONGOING",...}]
```

### 3.4 Election Results

```bash
curl "$BASE/api/elections/1/results"
# Expected: [{"candidate_id":1,"candidate_name":"...","party":"...","vote_count":0,"constituency_name":"..."}]
```

### 3.5 Cast Vote (Critical Path)

```bash
curl -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d "{
    \"voterId\": $VOTER_ID,
    \"electionId\": 1,
    \"boothId\": 1,
    \"evmId\": 1,
    \"candidateId\": 1
  }"

# Expected: {"success":true}

# Duplicate vote → 409 Conflict
curl -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d "{
    \"voterId\": $VOTER_ID,
    \"electionId\": 1,
    \"boothId\": 1,
    \"evmId\": 1,
    \"candidateId\": 1
  }"
# Expected: {"error":"Voter has already voted in this election"}
```

### 3.6 Live Turnout

```bash
curl "$BASE/api/turnout/1"
# Expected: [{"constituency_id":1,"constituency_name":"...","total_voters":1000,"votes_cast":1,"turnout_percentage":0.1}]
```

---

## 4. Admin Routes (Require Auth)

### Using Cookie (Browser-style)

```bash
# All admin routes work with cookie from login
curl -b cookies.txt "$BASE/api/admin/booths"
curl -b cookies.txt "$BASE/api/admin/evms"
curl -b cookies.txt "$BASE/api/admin/complaints"
```

### Using Bearer Token

```bash
AUTH_HEADER="Authorization: Bearer $TOKEN"

curl -H "$AUTH_HEADER" "$BASE/api/admin/booths"
curl -H "$AUTH_HEADER" "$BASE/api/admin/evms"
curl -H "$AUTH_HEADER" "$BASE/api/admin/complaints"
```

### 4.1 Polling Booths

```bash
# List
curl -H "$AUTH_HEADER" "$BASE/api/admin/booths"

# Create
curl -X POST "$BASE/api/admin/booths" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Booth 101 - Central School",
    "constituencyId": 1,
    "address": "Central School, Ward 5, Main Road"
  }'
```

### 4.2 EVMs

```bash
# List
curl -H "$AUTH_HEADER" "$BASE/api/admin/evms"

# Register EVM (requires existing boothId)
curl -X POST "$BASE/api/admin/evms" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "serialNumber": "EVM-2024-00123",
    "boothId": 1
  }'
```

### 4.3 Complaints

```bash
# List (newest first)
curl -H "$AUTH_HEADER" "$BASE/api/admin/complaints"

# File complaint (all fields optional except description)
curl -X POST "$BASE/api/admin/complaints" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "voterId": 1,
    "boothId": 1,
    "electionId": 1,
    "description": "EVM display not working properly"
  }'
```

---

## 5. Candidate Management (Admin)

```bash
# Create candidate + nomination
curl -X POST "$BASE/api/candidates" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Jane Smith",
    "party": "Progressive Party",
    "symbolUrl": "https://example.com/symbol.png",
    "electionId": 1,
    "constituencyId": 1
  }'
```

---

## 6. Error Testing

```bash
# Invalid voter registration (duplicate ID)
curl -X POST "$BASE/api/voters" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Duplicate",
    "dob": "1990-01-01",
    "address": "Nowhere",
    "constituencyId": 1,
    "idDocumentType": "AADHAAR",
    "idDocumentNumber": "123456789012"
  }'
# Expected: 409 duplicate

# Invalid vote payload
curl -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d '{"voterId":999,"electionId":1,"boothId":1,"evmId":1,"candidateId":1}'
# Expected: 400/409 depending on DB constraints

# Unauthorized admin access
curl "$BASE/api/admin/booths"
# Expected: 401 Unauthorized

# Expired/invalid token
curl -H "Authorization: Bearer invalid.token.here" "$BASE/api/admin/booths"
# Expected: 401 Invalid or expired token
```

---

## 7. Complete Flow Script

```bash
#!/bin/bash
# test-full-flow.sh

BASE="http://localhost:3000"
SETUP_KEY="your-secure-setup-key"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASS="securepass123"

echo "=== 1. Admin Setup ==="
curl -s -X POST "$BASE/api/admin/setup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"setupKey\":\"$SETUP_KEY\"}" | jq .

echo -e "\n=== 2. Admin Login ==="
curl -s -X POST "$BASE/api/admin/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" \
  -c cookies.txt -D headers.txt | jq .

TOKEN=$(grep admin_token cookies.txt | awk '{print $7}')
AUTH="Authorization: Bearer $TOKEN"

echo -e "\n=== 3. Create Booth ==="
curl -s -X POST "$BASE/api/admin/booths" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Booth 1","constituencyId":1,"address":"School"}' | jq .

echo -e "\n=== 4. Register EVM ==="
curl -s -X POST "$BASE/api/admin/evms" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"serialNumber":"EVM-001","boothId":1}' | jq .

echo -e "\n=== 5. Create Candidate ==="
curl -s -X POST "$BASE/api/candidates" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Candidate A","party":"Party A","electionId":1,"constituencyId":1}' | jq .

echo -e "\n=== 6. Register Voter ==="
VOTER=$(curl -s -X POST "$BASE/api/voters" \
  -H "Content-Type: application/json" \
  -d '{"name":"Voter One","dob":"1990-01-01","address":"Addr","constituencyId":1,"idDocumentType":"AADHAAR","idDocumentNumber":"111122223333"}' | jq -r .voterId)
echo "Voter ID: $VOTER"

echo -e "\n=== 7. Cast Vote ==="
curl -s -X POST "$BASE/api/vote" \
  -H "Content-Type: application/json" \
  -d "{\"voterId\":$VOTER,\"electionId\":1,\"boothId\":1,\"evmId\":1,\"candidateId\":1}" | jq .

echo -e "\n=== 8. Verify Turnout ==="
curl -s "$BASE/api/turnout/1" | jq .

echo -e "\n=== 9. Verify Results ==="
curl -s "$BASE/api/elections/1/results" | jq .

echo -e "\n=== 10. File Complaint ==="
curl -s -X POST "$BASE/api/admin/complaints" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"voterId":'$VOTER',"boothId":1,"electionId":1,"description":"Test complaint"}' | jq .

echo -e "\n=== Done ==="
```

Run: `chmod +x test-full-flow.sh && ./test-full-flow.sh`

---

## 8. Health Checks

```bash
# Basic connectivity
curl -s "$BASE/api/elections" | jq 'length'

# DB connectivity (via any route)
curl -s "$BASE/api/admin/booths" -H "$AUTH" | jq 'length'
```

---

## 9. Response Codes Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created (not used, we return 200) |
| 400 | Invalid input (Zod validation failed) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (invalid setup key) |
| 409 | Conflict (duplicate vote, duplicate ID, duplicate serial) |
| 500 | Internal server error |

---

## 10. Debugging Tips

```bash
# Verbose output
curl -v -X POST "$BASE/api/vote" ...

# View raw response headers
curl -D - "$BASE/api/elections"

# Test with jq for pretty JSON
curl -s "$BASE/api/elections" | jq .

# Check cookie contents
cat cookies.txt

# Inspect JWT payload (base64 decode middle part)
echo "$TOKEN" | cut -d. -f2 | base64 -d | jq .
```