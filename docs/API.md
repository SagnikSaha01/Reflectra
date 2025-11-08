# MindTime API Documentation

Complete REST API reference for the MindTime backend.

**Base URL:** `http://localhost:3000/api`

---

## Sessions

### Create Session

**POST** `/sessions`

Records a new browsing session.

**Request Body:**
```json
{
  "url": "https://github.com/user/repo",
  "title": "Feature implementation PR",
  "duration": 120000,
  "timestamp": 1704571200000
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "url": "https://github.com/user/repo",
  "title": "Feature implementation PR",
  "duration": 120000,
  "timestamp": 1704571200000
}
```

---

### Get Sessions

**GET** `/sessions`

Retrieve sessions with optional filters.

**Query Parameters:**
- `startDate` (optional): Unix timestamp (ms)
- `endDate` (optional): Unix timestamp (ms)
- `categoryId` (optional): Filter by category ID
- `limit` (optional, default: 100): Max results

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "url": "https://github.com",
    "title": "GitHub",
    "duration": 120000,
    "timestamp": 1704571200000,
    "category_id": 2,
    "category_name": "Focused Work",
    "category_color": "#4CAF50"
  }
]
```

---

### Get Session by ID

**GET** `/sessions/:id`

**Response:** `200 OK`
```json
{
  "id": 1,
  "url": "https://github.com",
  "title": "GitHub",
  "duration": 120000,
  "timestamp": 1704571200000,
  "category_id": 2,
  "category_name": "Focused Work",
  "category_color": "#4CAF50"
}
```

---

### Update Session Category

**PATCH** `/sessions/:id/category`

Manually assign a category to a session.

**Request Body:**
```json
{
  "categoryId": 2
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### Trigger Categorization

**POST** `/sessions/categorize`

Manually trigger AI categorization of uncategorized sessions.

**Response:** `200 OK`
```json
{
  "message": "Categorization complete",
  "categorized": 15,
  "total": 15
}
```

---

## Statistics

### Get Today's Stats

**GET** `/stats/today`

**Response:** `200 OK`
```json
{
  "sessionCount": 24,
  "totalTime": 7200000,
  "categories": [
    {
      "name": "Focused Work",
      "color": "#4CAF50",
      "time": 3600000,
      "count": 10
    }
  ],
  "wellnessScore": 75
}
```

---

### Get Date Range Stats

**GET** `/stats/range?startDate=<timestamp>&endDate=<timestamp>`

**Response:** `200 OK`
```json
[
  {
    "date": "2025-01-10",
    "sessionCount": 24,
    "totalTime": 7200000
  }
]
```

---

### Get Category Breakdown

**GET** `/stats/categories?startDate=<timestamp>&endDate=<timestamp>`

**Response:** `200 OK`
```json
[
  {
    "name": "Focused Work",
    "color": "#4CAF50",
    "wellness_type": "productive",
    "totalTime": 3600000,
    "sessionCount": 10,
    "avgDuration": 360000
  }
]
```

---

### Get Wellness History

**GET** `/stats/wellness-history?days=7`

**Response:** `200 OK`
```json
[
  {
    "date": "2025-01-10",
    "score": 75,
    "focus_time": 3600000,
    "learning_time": 1800000,
    "rest_time": 1200000,
    "social_time": 600000,
    "mindless_time": 200000
  }
]
```

---

## Reflection

### Ask Reflection Question

**POST** `/reflection/ask`

Generate AI-powered reflection based on browsing data.

**Request Body:**
```json
{
  "query": "What did I learn today?",
  "timeRange": "today"
}
```

**Time Range Options:**
- `today` - Last 24 hours from midnight
- `week` - Last 7 days
- `month` - Last 30 days

**Response:** `200 OK`
```json
{
  "answer": "Today you spent 45 minutes on React documentation...",
  "context": [
    {
      "url": "https://react.dev/learn",
      "title": "React Docs",
      "duration": 2700000,
      "category": "Learning"
    }
  ],
  "timestamp": 1704571200000
}
```

---

### Get Reflection History

**GET** `/reflection/history?limit=20`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "query": "What did I learn today?",
    "response": "Today you spent...",
    "timestamp": 1704571200000
  }
]
```

---

### Get Reflection by ID

**GET** `/reflection/:id`

**Response:** `200 OK`
```json
{
  "id": 1,
  "query": "What did I learn today?",
  "response": "Today you spent...",
  "context": "[{...}]",
  "timestamp": 1704571200000
}
```

---

## Categories

### Get All Categories

**GET** `/categories`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Focused Work",
    "description": "Deep work, coding, writing",
    "color": "#4CAF50",
    "wellness_type": "productive"
  }
]
```

---

### Create Category

**POST** `/categories`

**Request Body:**
```json
{
  "name": "Custom Category",
  "description": "My custom browsing category",
  "color": "#FF5722",
  "wellness_type": "productive"
}
```

**Wellness Types:**
- `productive` - Focus, work, productivity
- `growth` - Learning, skill development
- `rest` - Relaxation, entertainment
- `social` - Social connection
- `drain` - Mindless, unfocused
- `unknown` - Uncategorized

**Response:** `201 Created`
```json
{
  "id": 9,
  "name": "Custom Category",
  "description": "My custom browsing category",
  "color": "#FF5722",
  "wellness_type": "productive"
}
```

---

### Update Category

**PATCH** `/categories/:id`

**Request Body:**
```json
{
  "name": "Updated Name",
  "color": "#2196F3"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### Delete Category

**DELETE** `/categories/:id`

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

## Error Responses

All endpoints may return these error codes:

**400 Bad Request**
```json
{
  "error": "Missing required fields"
}
```

**404 Not Found**
```json
{
  "error": "Session not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Something went wrong!"
}
```

---

## Rate Limiting

Currently no rate limiting implemented. For production:
- Implement rate limiting per IP
- Add authentication tokens
- Use API keys for extension

---

## Authentication (Future)

Currently no authentication required. For production:

**Recommended approach:**
- JWT tokens for dashboard
- API keys for Chrome extension
- OAuth for third-party integrations
