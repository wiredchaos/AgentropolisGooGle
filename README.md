Use this for the README.

# Google Agent Engine

A separate Google-hosted backend for Agentropolis.

This service adds an **agentic LLM + RLM + proto-AGI layer** beside the existing Lovable apps without replacing or breaking the current Lovable backend.

## What it is

The Google Agent Engine is the judgment layer.

It handles:

- Gemini-powered reasoning
- semantic memory with embeddings
- observe → plan → act → reflect orchestration
- controlled crawl ingestion
- structured responses for frontend apps

It does **not** replace the existing Lovable backend.

## Architecture

```text
School of Base / Lovable Apps
        ↓
Google Agent Engine
        ↓
RLM Orchestrator
        ↓
Memory + Embeddings
        ↓
Crawl Broker + Normalizer

Layer roles
	•	Lovable backend → existing app logic, storage, UI flows
	•	Google Agent Engine → reasoning, memory, reflection, guidance
	•	Cloudflare Crawl → acquisition / sensor layer only
	•	Memory layer → semantic retrieval and persistence

Core ideas

Agentic LLM

This backend is not a one-shot chatbot wrapper. It is structured as a task-oriented reasoning service.

RLM

RLM stands for a loop-based runtime:
	1.	Observe
	2.	Plan
	3.	Memory
	4.	Act
	5.	Reflect

Proto-AGI

This backend is framed as proto-AGI because it includes:
	•	persistent goal handling within a request cycle
	•	semantic memory retrieval
	•	task decomposition
	•	bounded tool use
	•	reflection and retry logic

Main endpoints

POST /agent/run

Runs the main agent loop.

Example request

{
  "prompt": "Explain builder readiness like I'm a beginner.",
  "appId": "school-of-base",
  "mode": "teacher",
  "context": {
    "pageContext": {
      "page": "school-of-base-shell",
      "section": "lesson-detail"
    },
    "userContext": {
      "experienceLevel": "beginner"
    }
  }
}

Example response

{
  "answer": "Builder readiness is a way of checking whether someone is prepared to build and keep building effectively.",
  "reasoningSummary": "Generated through the RLM loop using prompt context and retrieved memory.",
  "nextAction": "Review the builder readiness lesson and compare it to a sample builder profile.",
  "confidence": 0.9,
  "memoryHits": [],
  "structuredData": {}
}


⸻

POST /memory/embed

Embeds and stores content for later retrieval.

Use for:
	•	lessons
	•	docs
	•	district descriptions
	•	mission content
	•	internal notes

⸻

POST /memory/search

Searches semantic memory using Gemini embeddings.

Use for:
	•	lesson guidance
	•	content retrieval
	•	agent context lookup
	•	recommendation support

⸻

POST /reflect/run

Runs a reflection/evaluation pass on generated output.

Use for:
	•	output scoring
	•	retry decisions
	•	response quality checking

⸻

POST /crawl/submit

Submits a crawl job through the crawl broker.

GET /crawl/status/:jobId

Checks crawl job status.

POST /crawl/ingest

Normalizes crawl output, stamps provenance, and stores validated chunks into memory.

Project structure

google-backend/
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   └── google-client.ts
│   ├── routes/
│   │   ├── agent-routes.ts
│   │   ├── memory-routes.ts
│   │   ├── reflect-routes.ts
│   │   └── crawl-routes.ts
│   ├── services/
│   │   ├── gemini-service.ts
│   │   ├── embedding-service.ts
│   │   ├── memory-service.ts
│   │   ├── rlm-orchestrator.ts
│   │   ├── crawl-broker-service.ts
│   │   └── normalizer-service.ts
│   └── index.ts
├── .env.example
├── package.json
├── tsconfig.json
└── Dockerfile

Environment variables

Create a .env file:

GOOGLE_API_KEY=your_google_api_key
PORT=8080
NODE_ENV=development

CRAWL_API_URL=your_crawl_api_url
CRAWL_API_KEY=your_crawl_api_key

Local development

Install dependencies:

npm install

Build:

npm run build

Run in development:

npm run dev

Cloud Run deployment

Build container:

gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/google-backend

Deploy:

gcloud run deploy google-backend \
  --image gcr.io/YOUR_PROJECT_ID/google-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY,NODE_ENV=production

How it connects to the apps

This backend is designed to sit beside the existing Lovable apps.

Example split

Lovable handles
	•	existing pages
	•	content flows
	•	UI state
	•	existing backend logic

Google Agent Engine handles
	•	reasoning
	•	semantic search
	•	agent guidance
	•	explanation generation
	•	reflections
	•	crawl ingestion

First target integration

The first intended shell is:
	•	School of Base as the main shell
	•	Agentropolis Framework embedded as an iframe
	•	Google Agent Engine as the shared backend intelligence layer

Notes
	•	Do not send raw crawl output directly into the agent loop
	•	Normalize and stamp provenance first
	•	Use embeddings for semantic memory
	•	Keep Lovable intact
	•	Keep Google as the separate intelligence layer

Status

Current status:
	•	Google client wiring in progress
	•	Gemini reasoning service in progress
	•	semantic memory in progress
	•	crawl ingestion membrane in progress
	•	School of Base shell integration next

If you want, paste your current repo file tree and I’ll tailor the README so it matches the exact files instead of the idealized version.
