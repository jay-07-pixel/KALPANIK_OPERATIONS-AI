# Input Gateway

Entry point for all external order requests from website and WhatsApp.

## Overview

The Input Gateway is responsible for:
1. **Channel Detection**: Identify if order is from website or WhatsApp
2. **Input Normalization**: Convert different formats into standard format
3. **Validation**: Ensure required fields are present
4. **Event Routing**: Route to State Coordinator for processing

---

## API Endpoints

### 1. POST `/order/website`

**Purpose**: Accept structured orders from website forms

**Request Body**:
```json
{
  "userId": "user123",
  "customerId": "CUST-001",
  "customerName": "Rajesh Kumar",
  "productId": "PROD-123",
  "productName": "Widget A",
  "quantity": 15,
  "unit": "boxes",
  "priority": "HIGH",
  "deadline": "2026-02-01T15:00:00Z",
  "notes": "Please pack carefully"
}
```

**Required Fields**:
- `productId`
- `productName`
- `quantity`

**Optional Fields**:
- `userId` / `customerId`
- `customerName`
- `unit` (default: "pieces")
- `priority` (default: "MEDIUM", options: LOW, MEDIUM, HIGH, URGENT)
- `deadline` (ISO timestamp)
- `notes`

**Response (Success)**:
```json
{
  "success": true,
  "message": "Order received successfully",
  "orderId": "pending",
  "channel": "website",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Missing required fields: productId, productName",
  "channel": "website"
}
```

---

### 2. POST `/order/whatsapp`

**Purpose**: Accept raw WhatsApp messages

**Request Body**:
```json
{
  "phone": "+91-98765-43210",
  "name": "Rajesh Kumar",
  "message": "Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

**Required Fields**:
- `phone` or `from` (customer phone number)
- `message` or `text` (raw message text)

**Optional Fields**:
- `name` (customer name, if known)
- `timestamp` (when message was sent)

**Response (Success)**:
```json
{
  "success": true,
  "message": "Message received successfully",
  "note": "Message will be parsed and processed",
  "channel": "whatsapp",
  "timestamp": "2026-01-31T10:30:00Z"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Message cannot be empty",
  "channel": "whatsapp"
}
```

---

### 3. GET `/order/status`

**Purpose**: Health check for Input Gateway

**Response**:
```json
{
  "status": "operational",
  "channels": {
    "website": "ready",
    "whatsapp": "ready"
  },
  "timestamp": "2026-01-31T10:30:00Z"
}
```

---

## Data Flow

### Website Order Flow
```
1. Website Form → POST /order/website
2. Input Gateway validates required fields
3. Input Gateway normalizes to standard format
4. Creates ORDER_RECEIVED event
5. Routes to State Coordinator
6. State Coordinator → Order Agent (not yet implemented)
```

### WhatsApp Order Flow
```
1. WhatsApp Message → POST /order/whatsapp
2. Input Gateway validates phone and message
3. Input Gateway stores raw text (NO parsing yet)
4. Creates ORDER_RECEIVED event
5. Routes to State Coordinator
6. State Coordinator → Order Agent → LLM Parser (to be implemented)
```

---

## Normalized Data Format

After processing, both channels produce this format:

**Website Order (Normalized)**:
```javascript
{
  channel: 'website',
  customerId: 'user123',
  customerName: 'Rajesh Kumar',
  productId: 'PROD-123',
  productName: 'Widget A',
  quantity: 15,
  unit: 'boxes',
  priority: 'HIGH',
  deadline: '2026-02-01T15:00:00Z',
  notes: 'Please pack carefully',
  rawInput: { ... } // Original request
}
```

**WhatsApp Message (Normalized)**:
```javascript
{
  channel: 'whatsapp',
  customerId: '+91-98765-43210',
  customerName: 'Rajesh Kumar', // May be null
  message: 'I need 15 boxes of Widget A by tomorrow 3pm. Urgent!',
  timestamp: '2026-01-31T10:30:00Z',
  rawInput: { ... } // Original request
}
```

---

## Validation Rules

### Website Orders
- ✓ `productId`, `productName`, `quantity` are required
- ✓ `quantity` must be a positive number
- ✓ `priority` must be: LOW, MEDIUM, HIGH, or URGENT
- ✓ Invalid data returns 400 error

### WhatsApp Messages
- ✓ `phone` or `from` is required
- ✓ `message` or `text` is required
- ✓ Message cannot be empty or whitespace only
- ✓ Invalid data returns 400 error

---

## Testing

### Run Unit Tests
```bash
node src/services/testInputGateway.js
```

### Test API Endpoints

**Option 1: PowerShell Script**
```bash
powershell -ExecutionPolicy Bypass -File test-api.ps1
```

**Option 2: REST Client (VS Code extension)**
Open `test-api.http` and click "Send Request"

**Option 3: curl (Git Bash or WSL)**
```bash
# Website order
curl -X POST http://localhost:3000/order/website \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PROD-123",
    "productName": "Widget A",
    "quantity": 15,
    "unit": "boxes",
    "priority": "HIGH"
  }'

# WhatsApp message
curl -X POST http://localhost:3000/order/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+91-98765-43210",
    "message": "I need 15 boxes of Widget A"
  }'
```

---

## Key Design Decisions

### 1. **No WhatsApp Parsing Yet**
- WhatsApp messages are stored as raw text
- Parsing will happen in Order Agent using LLM (Groq API)
- This keeps Input Gateway simple and focused

### 2. **Channel-Specific Normalization**
- Website: Already structured, just validate
- WhatsApp: Store raw, parse later

### 3. **Validation Early**
- Catch errors at entry point
- Return clear error messages
- Don't waste resources on invalid data

### 4. **Store Raw Input**
- Always preserve original request in `rawInput`
- Useful for debugging and audit trail
- Can replay requests if needed

---

## Next Steps

1. **Implement Order Agent** to process normalized data
2. **Add LLM Parser** for WhatsApp text parsing
3. **Connect to real WhatsApp API** (webhook integration)
4. **Add authentication** for website orders (JWT tokens)
5. **Add rate limiting** to prevent abuse

---

## Example Usage (Code)

```javascript
const inputGateway = require('./services/inputGateway');

// Process website order
const websiteResult = await inputGateway.processWebsiteOrder({
  productId: 'PROD-123',
  productName: 'Widget A',
  quantity: 15,
  priority: 'HIGH'
});

// Process WhatsApp message
const whatsappResult = await inputGateway.processWhatsAppOrder({
  phone: '+91-98765-43210',
  message: 'I need 15 boxes of Widget A'
});

// Check status
const status = inputGateway.getStatus();
console.log(status); // { status: 'operational', channels: { ... } }
```

---

## Troubleshooting

**Server not responding?**
- Check if server is running: `node src/server.js`
- Check port 3000 is not in use: `netstat -ano | findstr :3000`

**Validation errors?**
- Check required fields are present
- Check field types (quantity should be number)
- Check priority values (must be uppercase)

**WhatsApp messages not processing?**
- Verify phone number format
- Verify message is not empty
- Check server logs for detailed errors
