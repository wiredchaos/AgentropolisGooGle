# Google Agent Engine

A TypeScript/Node.js backend service providing an AI agent engine powered by Google Gemini, with RLM (Reason-Learn-Memorize) orchestration and Cloudflare Browser Rendering crawl ingestion.

## Prerequisites

- Node.js 18+
- A [Google AI API key](https://aistudio.google.com/app/apikey)
- (Optional) [Cloudflare API credentials](https://dash.cloudflare.com/) for web crawling

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`:

   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id_here
   PORT=3001
   NODE_ENV=development
   ```

## Running the server

**Development mode** (uses `ts-node`, no build step required):

```bash
npm run dev
```

**Production mode** (compile first, then run):

```bash
npm run build
npm start
```

The server listens on `http://localhost:3001` by default.

## API Endpoints

### Health check

```
GET /health
```

Returns `{ "status": "ok", "service": "google-agent-engine" }`.

---

### Agent — RLM orchestration

#### Run the agent

```
POST /agent/run
```

**Body:**

```json
{
  "prompt": "Explain the concept of machine learning",
  "appId": "my-app",
  "context": {}
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "observation": "...",
    "plan": "...",
    "action": "...",
    "reflection": "...",
    "finalResponse": "..."
  }
}
```

---

### Crawl — Cloudflare Browser Rendering ingestion

#### Submit a crawl job

```
POST /crawl/submit
```

**Body:**

```json
{ "url": "https://example.com" }
```

**Response (202 Accepted):**

```json
{ "success": true, "jobId": "crawl_<uuid>", "status": "pending" }
```

#### Check crawl job status

```
GET /crawl/status/:jobId
```

#### Ingest content into agent memory

```
POST /crawl/ingest
```

**Body:**

```json
{
  "content": "<html>...</html>",
  "sourceUrl": "https://example.com",
  "appId": "my-app"
}
```

**Response:**

```json
{
  "success": true,
  "memoryId": "mem_<uuid>",
  "wordCount": 142,
  "provenance": "https://example.com"
}
```

## Project structure

```
google-backend/
├── src/
│   ├── index.ts                   # Express app entry point
│   ├── routes/
│   │   ├── agentRoutes.ts         # POST /agent/run
│   │   └── crawlRoutes.ts         # POST /crawl/submit, GET /crawl/status/:id, POST /crawl/ingest
│   └── services/
│       ├── GeminiService.ts       # Google Gemini API wrapper (generate content + embeddings)
│       ├── MemoryService.ts       # In-memory vector store with cosine-similarity search
│       ├── RLMOrchestrator.ts     # Observe → Plan → Act → Reflect pipeline
│       ├── CrawlBrokerService.ts  # Cloudflare Browser Rendering crawl jobs
│       └── NormalizerService.ts   # HTML stripping and text normalization
├── .env.example
├── package.json
└── tsconfig.json
```
