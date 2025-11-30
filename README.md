# Attendance Middleware

## What it does
- Receives punch logs from attendance devices: `POST /device/punch`
- Validates & normalizes payloads
- Prevents duplicate punches within a configurable window (default 60s)
- Saves logs in MongoDB (`PunchLog` model)
- Forwards logs to a simulated CRM endpoint `POST /crm/attendance/punch`
- Implements a retry worker to retry failed logs every X seconds (default 10s) up to N times (default 3)

## Run
1. `npm install`
2. Ensure MongoDB is running locally (or update `MONGODB_URI` in `.env`)
3. Copy `.env.example` to `.env` and adjust values
4. `npm run dev`

## Endpoints

### Device Endpoints

#### `POST /device/punch`
- Receives punch logs from attendance devices
- Body: `{ deviceId, userId, timestamp, type }`
- Example: `{ "deviceId": "DEVICE_001", "userId": "EMP102", "timestamp": "2025-11-26T09:01:45", "type": "IN" }`
- Returns: `201` with punch log ID

#### `GET /device/punches`
- List all punch logs with pagination and filters
- Query params:
  - `page` (default: 1)
  - `limit` (default: 50)
  - `userId` - Filter by user ID
  - `deviceId` - Filter by device ID
  - `status` - Filter by status (pending/synced/failed)
  - `type` - Filter by type (IN/OUT)
  - `startDate` - Filter from date (ISO format)
  - `endDate` - Filter to date (ISO format)
- Returns: Paginated list of punch logs

#### `GET /device/punches/:id`
- Get specific punch log by ID
- Returns: Single punch log object

#### `GET /device/punches/user/:userId`
- Get all punches for a specific user
- Query params: `page`, `limit` (for pagination)
- Returns: Paginated list of user's punch logs

#### `GET /device/status`
- Get system status and statistics
- Returns: System health, counts by status, retryable count, recent activity

#### `GET /device/failed`
- Get failed punches that can still be retried
- Query params: `page`, `limit` (for pagination)
- Returns: List of retryable failed punches

### CRM Endpoints

#### `POST /crm/attendance/punch`
- Simulated CRM endpoint to receive punches
- Supports `?fail=1` query param to simulate error
- Body: `{ deviceId, userId, timestamp, type }`

### Health

#### `GET /health`
- Health check endpoint
- Returns: `{ ok: true }`

## Duplicate rule
- Config: `DUPLICATE_WINDOW_SECONDS` (default 60)
- Behavior: rejects (409) a punch for the same `userId` if there's already a punch with `punchTime` >= (currentPunchTime - window)

## Retry logic
- Config: `RETRY_INTERVAL_MS` (default 10000), `RETRY_LIMIT` (default 3)
- Failed logs (`status: failed`) with `retryCount < RETRY_LIMIT` are retried by the worker

## What to submit for assignment
- Architecture diagram (image/pdf)
- GitHub link to this code
- Postman collection (`postman_collection.json`)
- README.md
- .env.example
