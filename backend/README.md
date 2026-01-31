# MSME Agentic Operations Backend

Autonomous multi-agent system for MSME operations management.

## Architecture

This is **NOT** a chatbot. This is an **event-driven, stateful agentic system**.

### Agent Flow

```
Event → Input Gateway → State Coordinator → Agents → Task Executor
```

### Agents

1. **Order Agent** - Extracts order details (LLM for WhatsApp parsing only)
2. **Inventory Agent** - Checks stock availability
3. **Decision Engine** - Plans operational tasks
4. **Workforce Agent** - Selects staff for assignment
5. **Coordination Agent** - Assigns tasks and updates workload
6. **Critic Agent** - Validates plan before execution
7. **Task Executor** - Executes approved plan

### Key Principles

- **Stateful**: System maintains state (orders, inventory, staff)
- **Event-driven**: Actions triggered by events (order received, task completed)
- **Deterministic**: Core logic is rule-based and explainable
- **LLM Usage**: ONLY for parsing WhatsApp text → structured data
- **No Chatbot**: No conversational AI, no "How can I help you?"

## Project Structure

```
backend/
├── src/
│   ├── agents/              # Autonomous agents
│   │   ├── orderAgent.js
│   │   ├── inventoryAgent.js
│   │   ├── decisionEngine.js
│   │   ├── workforceAgent.js
│   │   ├── coordinationAgent.js
│   │   └── criticAgent.js
│   ├── state/               # State management
│   │   ├── stateManager.js
│   │   └── eventQueue.js
│   ├── services/            # Core services
│   │   ├── inputGateway.js
│   │   ├── stateCoordinator.js
│   │   ├── taskExecutor.js
│   │   ├── notificationService.js
│   │   └── llmParser.js
│   ├── routes/              # API routes
│   │   ├── webhook.routes.js
│   │   └── api.routes.js
│   ├── utils/               # Utilities
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── logger.js
│   └── server.js            # Entry point
├── package.json
├── .env.example
└── README.md
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Start development server:
```bash
npm run dev
```

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (state persistence)
- **Cache**: Redis (fast state access + event queue)
- **LLM**: Groq API (WhatsApp text parsing only)
- **WhatsApp**: Business API webhook

## Next Steps

1. Define data models (database schema)
2. Implement Input Gateway
3. Build Order Agent (with LLM parser)
4. Build remaining agents incrementally
5. Test with sample events

## Development Rules

- Build incrementally, one agent at a time
- Test each agent independently before integration
- All decisions must be deterministic and logged
- LLM only for parsing, never for decision-making
