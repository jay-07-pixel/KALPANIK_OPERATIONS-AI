'''text
┌─────────────────────────────────────────────────────────────────┐
│ EVENT: Website order submitted                                  │
│                                                                 │
│ Product: Widget A                                               │
│ Quantity: 15 boxes                                              │
│ Priority: Urgent                                                │
│                                                                 │
│ [Place Order] ← User clicks                                     │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ INPUT GATEWAY                                                   │
│                                                                 │
│ • Channel: website                                              │
│ • Type: structured form data                                    │
│ • Needs parsing: NO                                             │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ STATE COORDINATOR                                               │
│                                                                 │
│ Routes to ORDER AGENT                                           │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORDER AGENT (ORDER INTENT ONLY)                                 │
│                                                                 │
│ • Receive structured data                                       │
│   - Product: Widget A → PROD-123                                │
│   - Quantity: 15 boxes                                          │
│   - Priority: HIGH (Urgent selected)                            │
│                                                                 │
│ • Identify customer                                             │
│   Logged-in user → Rajesh Kumar                                 │
│                                                                 │
│                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ INVENTORY AGENT                                                 │
│                                                                 │
│ • Check stock of Widget A                                       │
│   - Current: 150 boxes                                          │
│   - Reserved: 135 boxes                                         │
│   - Available: 15 boxes ✓                                       │
│                                                                 │
│ • Reserve 15 units temporarily                                  │
│ • Status: AVAILABLE                                             │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ ORDER CREATION                                                  │
│                                                                 │
│ • Create Order                                                  │
│ {                                                               │
│   "order_id": "ORD-156",                                        │
│   "customer": "Rajesh Kumar",                                   │
│   "channel": "website",                                         │
│   "items": [{"product": "PROD-123", "qty": 15}],                │
│   "priority": "HIGH"                                            │
│ }                                                               │
│                                                                 │
│ • Order Status: READY_TO_FULFILL                                │
│ • Send WhatsApp:                                                │
│    Order placed Rajesh! Ref: ORD-155                            │
|                                                                 │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ DECISION ENGINE                                                 │
│                                                                 │
│ • Analyzes situation                                            │
│ • Plan: Can fulfill now                                         │
│                                                                 │
│ • Create tasks                                                  │
│   T1: Prepare 15x Widget A (90 min)                             │
│   T2: Quality check (20 min)                                    │
│   T3: Pack for delivery (25 min)                                │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ WORKFORCE AGENT                                                 │
│                                                                 │
│ • Check availability                                            │
│   - Amit: Busy (4h workload)                                    │
│   - Priya: Available (1h workload)                              │
│   - Raj: Offline                                                │
│                                                                 │
│ Priya is best choice                                            │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ COORDINATION AGENT                                              │
│                                                                 │
│ • Assign tasks to Priya                                         │
│ • Update her workload: 1h → 3.25h                               │
│ • Check: Still within capacity ✓                                │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ CRITIC AGENT                                                    │
│                                                                 │
│ Validate                                                        │
│ ✓ Stock available (15 boxes)                                    │
│ ✓ Staff has time (Priya: 3.25h < 8h)                            │
│                                                                 │
│ → APPROVED                                                      │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ TASK EXECUTOR                                                   │
│                                                                 │
│ • Save tasks to database                                        │
│                                                                 │
│ • Notify Priya (Staff App)                                      │
│  New task: Prepare 15x Widget A                                 │
│                                                                 │
│ • Website update                                                │
│   Order confirmed. Preparing items.                             │
│                                                                 │
│ • Update inventory: Reserved = 135 + 15                         │
│ • Log all actions                                               │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ MEMORY                                                          │
│                                                                 │
│ Log decision                                                    │
│ "Order ORD-156 → Ready → Task assigned to Priya "     │
└────────────────────┬────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUTS SENT                                                    │
│                                                                 │
│ • Website order tracking updated                                │
│ • Staff App notification to Priya                               │
│ • Dashboard updated (owner can see)                             │
└─────────────────────────────────────────────────────────────────┘
'''