# NestJS TypeScript Service - Candidate Document Intake & AI Summary Workflow

## Overview & Purpose

This service is a modular NestJS/TypeScript backend that enables recruiters to upload candidate documents (resumes, cover letters, etc.) and asynchronously generate structured AI-powered candidate summaries using a pluggable LLM provider.

The system is built around three core concerns:
- **Document ingestion** — storing raw text documents associated with candidates
- **Async summarisation** — queuing summary jobs processed by a background worker
- **Workspace access control** — ensuring recruiters only access their own candidates

### Key Design Principle
Summary generation never happens inside the HTTP request cycle. A Bull/Redis queue decouples the API from the LLM call, enabling retries, failure isolation, and status polling without blocking the recruiter.

## Prerequisites

- Node.js >= 18
- PostgreSQL running locally (default: port 5432)
- Redis running locally (default: port 6379) 
- A Google Gemini API key (free from Google AI Studio at aistudio.google.com)

## Local Setup

1. **Clone and navigate to the service directory:**
   ```bash
   cd ts-service/
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` with your database and API credentials:
   ```
   DATABASE_URL=postgres://pgUser:pgPass1@localhost:5432/assessment_db?schema=public
   GEMINI_API_KEY=your-gemini-api-key-here
   NODE_ENV=development
   PORT=3000
   ```

   **Security Note:** Never commit API keys or secrets to version control.

5. **Run database migrations:**
   ```bash
   npm run migration:run
   ```

6. **Seed the database (optional):**
   ```bash
   npm run seed
   ```
   This creates sample workspaces, recruiters, and candidates for testing.

7. **Start the service:**
   ```bash
   npm run start:dev
   ```

The service will be available at `http://localhost:3000`

## API Endpoints

All routes are prefixed under `/candidates/:candidateId` and require workspace authentication via headers:
- `x-user-id`: UUID of the authenticated user 
- `x-workspace-id`: UUID of the user's workspace

### Document Management

#### POST /candidates/:candidateId/documents
Upload a candidate document with text content.

**Request Headers:**
```
x-user-id: 22222222-2222-2222-2222-222222222222
x-workspace-id: 11111111-1111-1111-1111-111111111111
Content-Type: application/json
```

**Request Body:**
```json
{
  "documentType": "resume",
  "fileName": "john_doe_resume.pdf", 
  "rawText": "John Doe\nSoftware Engineer\nExperience: 5 years..."
}
```

**Response (201):**
```json
{
  "id": "doc-uuid",
  "candidateId": "candidate-uuid",
  "documentType": "resume",
  "fileName": "john_doe_resume.pdf",
  "rawText": "John Doe\nSoftware Engineer\n...",
  "storageKey": "uploads/workspace-id/candidate-id/timestamp-filename",
  "uploadedAt": "2024-01-01T10:00:00Z"
}
```

#### GET /candidates/:candidateId/documents
List all documents for a candidate (workspace-scoped).

**Response (200):**
```json
[
  {
    "id": "doc-uuid",
    "candidateId": "candidate-uuid", 
    "documentType": "resume",
    "fileName": "john_doe_resume.pdf",
    "uploadedAt": "2024-01-01T10:00:00Z"
  }
]
```

### Summary Management

#### POST /candidates/:candidateId/summaries/generate
Create a pending summary and enqueue background AI processing.

**Response (202):**
```json
{
  "id": "summary-uuid",
  "status": "pending", 
  "candidateId": "candidate-uuid"
}
```

#### GET /candidates/:candidateId/summaries
List all summaries for a candidate (workspace-scoped, newest first).

**Response (200):**
```json
[
  {
    "id": "summary-uuid",
    "candidateId": "candidate-uuid",
    "status": "completed",
    "score": 85,
    "strengths": "Strong technical skills\nExcellent communication",
    "concerns": "Limited leadership experience", 
    "summary": "A promising candidate with strong technical background",
    "recommendedDecision": "advance",
    "provider": "gemini",
    "createdAt": "2024-01-01T10:00:00Z"
  }
]
```

#### GET /candidates/:candidateId/summaries/:summaryId
Get a specific summary by ID.

**Response (200):** Single summary object (same structure as above)

## Database Schema

The service uses PostgreSQL with TypeORM for data persistence.

### candidate_documents
Stores a single uploaded document associated with a candidate.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, auto-generated | Document identifier |
| candidate_id | varchar(64) | NOT NULL, indexed | Links to candidate |
| document_type | enum | NOT NULL | resume, cover_letter, portfolio, transcript, reference_letter, other |
| file_name | varchar(255) | NOT NULL | Original filename |
| storage_key | varchar(512) | NOT NULL | Storage path identifier |
| raw_text | text | NOT NULL | Extracted document content |
| uploaded_at | timestamptz | NOT NULL, default now() | Upload timestamp |

### candidate_summaries 
Stores a single AI-generated summary. Multiple summaries per candidate are allowed.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, auto-generated | Summary identifier |
| candidate_id | varchar(64) | NOT NULL, indexed | Links to candidate |
| status | varchar(20) | NOT NULL, default 'pending' | pending, completed, failed |
| score | integer | nullable | LLM-assigned score (0-100) |
| strengths | text | nullable | LLM strengths analysis |
| concerns | text | nullable | LLM concerns analysis |
| summary | text | nullable | LLM overall summary |
| recommended_decision | varchar(50) | nullable | advance, hold, reject |
| provider | varchar(50) | nullable | LLM provider used |
| prompt_version | varchar(20) | nullable | Prompt template version |
| error_message | text | nullable | Error details if failed |
| created_at | timestamptz | NOT NULL, default now() | Creation timestamp |
| updated_at | timestamptz | NOT NULL, auto-updated | Last update timestamp |

## Architecture & Components

### Repository Structure

```
ts-service/src/
├── main.ts                    # Bootstrap entry point
├── app.module.ts             # Root module - imports all feature modules
├── config/                   # Environment config (ConfigModule, validated env vars)
├── common/                   # Guards, decorators, interceptors, shared types  
├── entities/                 # TypeORM entity definitions
├── migrations/               # Database migration scripts
├── candidates/               # Feature module: documents + summaries
│   ├── candidates.controller.ts    # HTTP endpoints
│   ├── candidates.module.ts       # Module registration
│   ├── summaries.service.ts       # Summary business logic
│   ├── summary-processor.service.ts  # Background worker
│   └── dto/                       # Request/response DTOs
├── documents/                # Document management services
│   ├── documents.service.ts       # Document business logic
│   └── dto/
├── llm/                     # LLM provider abstractions
│   ├── summarization-provider.interface.ts  # Abstract provider
│   ├── gemini-summarization.provider.ts     # Gemini implementation
│   └── fake-summarization.provider.ts       # Mock for testing
├── queue/                   # Background job processing
│   ├── consumer.ts               # Job consumer
│   ├── queue.service.ts          # Queue management
│   └── queue.module.ts          # Module definition
└── auth/                    # Authentication guards
    ├── fake-auth.guard.ts        # Workspace validation
    └── auth.types.ts            # Auth interfaces
```

### LLM Provider System

The service uses an abstract `SummarizationProvider` interface that allows pluggable LLM implementations:

```typescript
interface SummarizationProvider {
  generateCandidateSummary(input: CandidateSummaryInput): Promise<CandidateSummaryResult>;
}
```

**Input Structure:**
```typescript
interface CandidateSummaryInput {
  candidateId: string;
  documents: string[];  // Array of raw text content
}
```

**Output Structure:**
```typescript
interface CandidateSummaryResult {
  score: number;           // Integer 0-100
  strengths: string[];     // Array of strength descriptions
  concerns: string[];      // Array of concern descriptions
  summary: string;         // Overall summary paragraph
  recommendedDecision: "advance" | "hold" | "reject";
}
```

**Current Providers:**
- `GeminiSummarizationProvider` - Google Gemini API integration
- `FakeSummarizationProvider` - Mock provider for testing

### Async Queue & Worker

Background summary generation uses a queue system to decouple API requests from LLM processing:

1. **Job Creation**: `POST /summaries/generate` creates pending summary and enqueues job
2. **Consumer Processing**: `SummaryConsumer` polls queue every 2 seconds for pending jobs
3. **LLM Integration**: `SummaryProcessor` calls provider to generate structured summary  
4. **Status Updates**: Summary status transitions from pending → completed/failed

**Queue Job Data:**
```typescript
interface SummaryJobData {
  summaryId: string;
  candidateId: string; 
  workspaceId: string;
}
```

### Access Control (Workspace Guard)

**Workspace-scoped Authentication:**
- All endpoints require `x-user-id` and `x-workspace-id` headers
- `FakeAuthGuard` validates headers format and user existence in database
- All database queries include workspace filtering for data isolation
- Cross-workspace access is prevented at the service layer

## Running Tests

Tests use Jest with @nestjs/testing framework. All external dependencies are mocked.

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run in watch mode  
npm run test:watch

# Coverage report only
npm run test:cov
```

**Current Test Coverage:** 23.89% overall
- Documents Service: 83.33% ✅
- Summaries Service: 58.62% ⚠️  
- Entities: 90.9% ✅
- Controllers: 0% (requires improvement)
- Queue Services: 8.47% (requires improvement)

### Test Structure
- `*.spec.ts` files contain unit tests for services
- Mock implementations for all external dependencies
- No live database or API connections in tests
- Comprehensive test data fixtures

## Environment Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | - | PostgreSQL connection string |
| GEMINI_API_KEY | Yes (prod) | - | Google Gemini API key |
| GEMINI_MODEL | No | gemini-3-flash-preview | Gemini model name |
| NODE_ENV | No | development | Environment mode |
| PORT | No | 3000 | Server port |

## Development Commands

```bash
# Start development server with watch mode
npm run start:dev

# Build for production  
npm run build

# Run production server
npm run start:prod

# Generate new migration
npm run migration:generate -- --name=MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Run database seeding (if implemented)
npm run seed
```

## Error Handling

The service implements consistent error handling with appropriate HTTP status codes:

- **400 Bad Request**: Validation errors (missing required fields, invalid data types)
- **401 Unauthorized**: Authentication errors (missing or invalid headers)  
- **403 Forbidden**: Access denied (workspace mismatch)
- **404 Not Found**: Resource not found (candidate, summary, or document)
- **500 Internal Server Error**: Server errors (database failures, LLM API errors)

All errors return structured JSON responses:
```json
{
  "message": "Descriptive error message",
  "error": "Error type",
  "statusCode": 400
}
```

## Deployment Notes

### Production Considerations

1. **Queue Infrastructure**: Replace in-memory queue with Redis/Bull for production
2. **File Storage**: Implement cloud storage (S3, GCS) instead of local storage paths
3. **Environment Secrets**: Use secure secret management (AWS Secrets Manager, etc.)
4. **Database**: Configure connection pooling and read replicas for scale
5. **Monitoring**: Add structured logging, metrics, and health checks
6. **Security**: Implement rate limiting, input sanitization, and security headers

### Health Checks

- Primary health check: `GET /health` returns `{"status": "ok"}`
- Database connectivity validation included
- Queue system status monitoring

## Known Limitations & Future Improvements

1. **File Upload**: Currently text-only upload. File upload with multipart/form-data needs implementation
2. **Queue Reliability**: In-memory queue loses jobs on restart. Production needs persistent queue  
3. **LLM Error Handling**: Limited retry logic and error recovery for API failures
4. **Test Coverage**: Controller and integration tests needed for production readiness
5. **Performance**: Database indexing and query optimization for large datasets
6. **Security**: File upload validation, rate limiting, and enhanced input sanitization

## Support & Troubleshooting

**Common Issues:**

1. **Migration Errors**: Ensure PostgreSQL is running and connection string is correct
2. **Authentication Failures**: Verify `x-user-id` and `x-workspace-id` headers are UUIDs
3. **Summary Generation Stuck**: Check GEMINI_API_KEY configuration and network connectivity
4. **Queue Not Processing**: Verify SummaryConsumer is starting (check application logs)

**Debugging:**
- Application logs show detailed queue processing information
- Database queries can be logged by setting TypeORM logging in development
- Health check endpoint provides system status verification

For additional support, review the application logs for detailed error messages and stack traces.
