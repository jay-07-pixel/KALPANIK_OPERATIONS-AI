┌─────────────────────────────────────────────────────────────────┐
│ EVENT: Order Request Received                                   │
│                                                                 │
│ • Source: Website form OR WhatsApp message                      │
│                                                                 │
│ Website:                                                        │
│   - Product, Quantity, Priority (structured)                    │
│                                                                 │
│ WhatsApp:                                                       │
│   - Free-text message                                           │
│     "I need 15 boxes of Widget A. Urgent!"                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ INPUT GATEWAY                                                   │
│                                                                 │
│ • Detect channel: website / whatsapp                            │
│ • Normalize input                                               │
│                                                                 │
│ Website:                                                        │
│   - Structured data                                             │
│   - Needs parsing: NO                                           │
│                                                                 │
│ WhatsApp:                                                       │
│   - Text message                                                │
│   - Needs parsing: YES (LLM)                                    │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ STATE COORDINATOR                                               │
│                                                                 │
│ • Update global system state                                    │
│ • Route request to ORDER AGENT                                  │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORDER AGENT (ORDER INTENT ONLY)                                 │
│                                                                 │
│ • Extract order details                                         │
│   - Product → PROD-123                                          │
│   - Quantity → 15 boxes                                         │
│   - Priority → HIGH                                             │
│                                                                 │
│ • Identify customer                                             │
│   - Website: logged-in user                                     │
│   - WhatsApp: phone number                                      │
│                                                                 │
│ • Create ORDER INTENT (temporary, not final order)              │
│                                                                 │
│ • Send acknowledgement                                          │
│   - Website: "Checking availability..."                         │
│   - WhatsApp: "Checking availability..."                        │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ INVENTORY AGENT                                                 │
│                                                                 │
│ • Check stock availability                                      │
│ • Reserve required quantity temporarily                         │
│                                                                 │
│ Result:                                                         │
│   - AVAILABLE  → proceed                                        │
│   - NOT AVAILABLE → stop / notify                               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORDER CREATION                                                  │
│                                                                 │
│ • Convert ORDER INTENT → CONFIRMED ORDER                        │
│                                                                 │
│ {                                                               │
│   "order_id": "ORD-XXX",                                        │
│   "customer": "Rajesh Kumar",                                   │
│   "channel": "website / whatsapp",                              │
│   "items": [{ "product": "PROD-123", "qty": 15 }],              │
│   "priority": "HIGH",                                           │
│   "status": "READY_TO_FULFILL"                                  │
│ }                                                               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ DECISION ENGINE (AGENTIC PLANNER)                               │
│                                                                 │
│ • Decide what should happen next                                │
│ • Break order into operational tasks                            │
│                                                                 │
│ Tasks:                                                          │
│   T1: Prepare items                                             │
│   T2: Quality check                                             │
│   T3: Pack for dispatch                                         │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ WORKFORCE AGENT                                                 │
│                                                                 │
│ • Check staff availability                                      │
│ • Select best staff member                                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ COORDINATION AGENT                                              │
│                                                                 │
│ • Assign tasks to staff                                         │
│ • Update workloads                                              │
│ • Schedule execution                                            │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ CRITIC AGENT                                                    │
│                                                                 │
│ Validate:                                                       │
│ ✓ Inventory reserved                                            │
│ ✓ Staff capacity available                                      │
│ ✓ No conflicts detected                                         │
│                                                                 │
│ → APPROVED                                                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ TASK EXECUTOR                                                   │
│                                                                 │
│ • Persist tasks                                                 │
│ • Notify staff (App / WhatsApp)                                 │
│ • Update inventory (final reservation)                          │
│                                                                 │
│ • Notify customer                                               │
│   - Website: live order status                                  │
│   - WhatsApp: confirmation message                              │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ MEMORY / AUDIT LOG                                              │
│                                                                 │
│ • Store decisions                                               │
│ • Track task progress                                           │
│ • Maintain system history                                       │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUTS                                                         │
│                                                                 │
│ • Website dashboard (owner view)                                │
│ • Live order tracking (customer)                                │
│ • WhatsApp notifications                                        │
│ • Staff task updates                                            │
└─────────────────────────────────────────────────────────────────┘
