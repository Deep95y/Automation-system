# Testing Guide for Attendance System

## Prerequisites

1. **MongoDB must be running**
   - Default: `mongodb://localhost:27017/attendance`
   - Or set `MONGODB_URI` in `.env` file

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   # OR for development with auto-reload:
   npm run dev
   ```

## Testing Methods

### Method 1: Automated Test Script (Recommended)

Run the automated test suite:
```bash
npm test
```

This will test:
- ✅ Health endpoint
- ✅ Device punch (happy path)
- ✅ Duplicate prevention
- ✅ Input validation
- ✅ CRM simulation (success)
- ✅ CRM simulation (failure)

### Method 2: Using Postman

Import the `postman_collection.json` file into Postman and run the requests:

1. **Device Punch (happy path)**
   - Method: `POST`
   - URL: `http://localhost:3000/device/punch`
   - Body:
     ```json
     {
       "deviceId": "DEVICE_001",
       "userId": "EMP102",
       "timestamp": "2025-11-26T09:01:45",
       "type": "IN"
     }
     ```

2. **Simulated CRM (fail)**
   - Method: `POST`
   - URL: `http://localhost:3000/crm/attendance/punch?fail=1`
   - Body: Same as above

### Method 3: Using cURL

#### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

#### Test Device Punch
```bash
curl --location 'http://localhost:3000/device/punch' \
--header 'Content-Type: application/json' \
--data '{
    "deviceId": "DEVICE_001",
    "userId": "EMP102",
    "timestamp": "2025-11-26T09:01:45",
    "type": "IN"
}'
```

#### Test Duplicate Prevention
Run the same command twice within 60 seconds - second one should return 409 Conflict.

#### Test Validation
```bash
curl --location 'http://localhost:3000/device/punch' \
--header 'Content-Type: application/json' \
--data '{
    "deviceId": "DEVICE_001",
    "userId": "INVALID",
    "timestamp": "invalid",
    "type": "INVALID"
}'
```

#### Test CRM Simulation
```bash
curl --location 'http://localhost:3000/crm/attendance/punch' \
--header 'Content-Type: application/json' \
--data '{
    "deviceId": "DEVICE_001",
    "userId": "EMP102",
    "timestamp": "2025-11-26T09:01:45",
    "type": "IN"
}'
```

#### Test CRM Failure Simulation
```bash
curl --location 'http://localhost:3000/crm/attendance/punch?fail=1' \
--header 'Content-Type: application/json' \
--data '{
    "deviceId": "DEVICE_001",
    "userId": "EMP102",
    "timestamp": "2025-11-26T09:01:45",
    "type": "IN"
}'
```

## Expected Behavior

### Device Punch Flow

1. **Request comes in** → `POST /device/punch`
2. **Validation** → Checks required fields, userId format (EMP###), timestamp, type (IN/OUT)
3. **Duplicate Check** → Rejects if same user punched within last 60 seconds (configurable)
4. **Save to MongoDB** → Creates `PunchLog` with status `pending`
5. **Forward to CRM** → Asynchronously sends to CRM endpoint
6. **Response** → Returns 201 with punch log ID

### Retry Mechanism

- Failed punches (status: `failed`) are automatically retried
- Retry interval: 10 seconds (configurable via `RETRY_INTERVAL_MS`)
- Max retries: 3 (configurable via `RETRY_LIMIT`)
- Watch server console for retry worker activity

### Testing Retry Logic

1. Make a device punch request
2. The system will try to forward to CRM
3. If CRM fails (use `?fail=1`), the punch log status becomes `failed`
4. Wait 10 seconds - retry worker will attempt to resend
5. Check MongoDB or server logs to see retry attempts

## Verification

### Check MongoDB

Connect to MongoDB and query the `punchlogs` collection:
```javascript
db.punchlogs.find().pretty()
```

Look for:
- `status`: `pending`, `synced`, or `failed`
- `retryCount`: Number of retry attempts
- `lastError`: Error message if failed

### Check Server Logs

Watch the server console for:
- Request logs (from morgan middleware)
- Route debugging (shows all incoming requests)
- Retry worker activity
- Forwarder errors

## Common Issues

### 404 Not Found
- ✅ Server is running? Check `Server listening on 3000`
- ✅ MongoDB connected? Check `MongoDB connected successfully`
- ✅ Routes registered? Check server startup logs

### 500 Server Error
- Check MongoDB connection
- Check server console for error details
- Verify all dependencies installed (`npm install`)

### Validation Errors
- `userId` must match pattern: `EMP###` (e.g., EMP102)
- `timestamp` must be valid ISO date string
- `type` must be exactly `IN` or `OUT`

### Duplicate Errors
- Wait 60+ seconds between punches for same user
- Or change `userId` for testing

## Environment Variables

Create a `.env` file (optional):
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/attendance
DUPLICATE_WINDOW_SECONDS=60
RETRY_INTERVAL_MS=10000
RETRY_LIMIT=3
CRM_URL=http://localhost:3000/crm/attendance/punch
CRM_ALWAYS_FAIL=0
```

