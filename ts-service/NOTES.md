# NOTES.md - Design Decisions & Technical Documentation

## Design Decisions & Rationales

### Database Design

**Decision: Multiple summaries per candidate allowed**  
**Rationale:** Supports re-runs, provider changes, and A/B prompt testing without destructive updates. Allows tracking of summary evolution over time and comparison between different LLM providers or prompt versions.  
**Alternative Considered:** Upsert single summary row — loses history and prevents comparisons.

**Decision: workspace_id stored on every row**  
**Rationale:** Enables simple WHERE-based scoping without JOINs to a workspace membership table. Provides clear data isolation and efficient queries.  
**Alternative Considered:** Separate workspace_members table — overly complex for this scope.

**Decision: VARCHAR candidate_id instead of foreign key relationship**  
**Rationale:** Candidates are managed by the existing sample system. This service focuses on document and summary management without duplicating candidate data or creating tight coupling.

**Decision: Status enum for summary lifecycle**  
**Rationale:** Clear state machine with three states: pending → completed/failed. Prevents invalid state transitions and provides clear debugging information.  
**Values:** `pending` (initial), `completed` (successful LLM processing), `failed` (error occurred)

### Queue Architecture

**Decision: Abstract provider class vs interface**  
**Rationale:** NestJS DI injects tokens, not TypeScript interfaces; an abstract class doubles as a runtime token for dependency injection.  
**Alternative Considered:** Plain interface — requires a separate injection token constant.

**Decision: Worker catches all errors and sets failed**  
**Rationale:** Prevents stuck pending rows and keeps Bull from infinite retries on deterministic failures. Ensures every job reaches a terminal state.  
**Alternative Considered:** Let Bull retry — appropriate for transient errors but not invalid LLM output.

**Decision: In-memory queue for development**  
**Rationale:** Simplifies development setup without requiring Redis infrastructure. Production deployments can easily swap for Redis/Bull implementation.  
**Limitation:** Jobs are lost on application restart.

### LLM Integration

**Decision: JSON-only prompt to Gemini**  
**Rationale:** Simplifies parsing and makes output validation deterministic. Reduces complexity of response processing and improves reliability.  
**Alternative Considered:** Ask for prose + regex parse — fragile and harder to validate.

**Decision: Structured output validation**  
**Rationale:** Ensures LLM responses conform to expected schema before persisting to database. Provides clear error messages for malformed responses.  
**Validation:** Type checking, range validation (score 0-100), enum validation (recommendedDecision).

**Decision: Provider abstraction with multiple implementations**  
**Rationale:** Allows swapping between real LLM providers and mock implementations for testing. Supports future addition of different LLM providers (OpenAI, Anthropic, etc.).

### Authentication & Access Control

**Decision: x-workspace-id header for auth**  
**Rationale:** Keeps the implementation simple and testable without a full JWT stack. Appropriate for assessment scope while demonstrating security principles.  
**Production Note:** Should be replaced with JWT with workspace claim for production.

**Decision: Service-layer workspace enforcement**  
**Rationale:** Every database query includes workspace filtering to prevent data leakage. Defense-in-depth approach that doesn't rely solely on controller-level validation.

### API Design

**Decision: RESTful endpoints with nested resources**  
**Rationale:** Follows REST conventions with clear resource hierarchy: `/candidates/:id/documents` and `/candidates/:id/summaries`. Intuitive URL structure for frontend consumption.

**Decision: 202 Accepted for async summary generation**  
**Rationale:** Correctly indicates that the request has been accepted for processing but not completed. Follows HTTP semantics for asynchronous operations.

**Decision: Separate endpoints for summary listing and individual retrieval**  
**Rationale:** Optimizes for different use cases - listing for dashboards, individual retrieval for detailed views. Allows different response structures and caching strategies.

## Schema Decisions

### Document Storage Strategy

**Current Implementation:** Local file paths with storage_key field  
**Rationale:** Simple implementation for development and assessment demonstration  
**Production Recommendation:** Replace with cloud storage (S3, GCS) with signed URLs for secure access

### Summary Data Structure

**Decision: Separate text fields for strengths/concerns**  
**Rationale:** Allows for structured display in UI and easier filtering/searching. More flexible than JSON blob storage.

**Decision: Nullable LLM output fields**  
**Rationale:** Supports pending and failed states where LLM output is not available. Prevents NOT NULL constraint violations during job processing.

**Decision: Integer score field (0-100)**  
**Rationale:** Simple numeric scoring system that's easy to understand and sort. Range validation ensures consistent scoring across providers.

## Known Limitations & Technical Debt

### File Upload Implementation
**Current State:** Text-only upload via JSON request body  
**Limitation:** No actual file processing, binary data handling, or multipart/form-data support  
**Future Work:** Implement FileInterceptor with proper file validation, virus scanning, and cloud storage integration

### Queue Reliability
**Current State:** In-memory queue with polling-based consumer  
**Limitations:** 
- Jobs lost on application restart
- No persistence or durability guarantees  
- Polling creates unnecessary CPU usage
- No retry logic or dead letter queue

**Future Work:** 
- Implement Redis/Bull queue for persistence
- Add exponential backoff retry logic
- Implement dead letter queue for permanently failed jobs
- Event-driven processing instead of polling

### Error Handling Improvements Needed

**LLM Provider Error Handling:**
- Limited retry logic for transient API failures
- No circuit breaker pattern for provider outages
- Generic error responses don't provide enough debugging information

**Database Error Handling:**
- No connection pooling configuration
- Limited transaction management
- No query timeout handling

### Performance Considerations

**Database Indexing:**
- Basic indexes on foreign keys implemented
- Missing composite indexes for common query patterns
- No pagination implemented for list endpoints

**Caching Strategy:**
- No caching layer implemented
- Could benefit from Redis caching for frequently accessed summaries
- Static content (like document metadata) could be cached

## Architecture Decisions

### Module Organization

**Decision: Feature-based module structure**  
**Rationale:** Groups related functionality (candidates, documents, summaries) together. Makes code easier to find and maintain. Supports future microservice extraction if needed.

**Structure:**
```
src/
├── candidates/    # Main feature module
├── documents/     # Document management (could be merged with candidates)
├── llm/          # Provider abstractions
├── queue/        # Background processing
├── auth/         # Authentication guards
├── common/       # Shared utilities
└── entities/     # Database entities
```

### Dependency Injection Strategy

**Decision: Interface-based DI with custom providers**  
**Rationale:** Enables easy testing with mock implementations. Supports configuration-based provider selection (development vs production).

**Example:**
```typescript
{
  provide: SUMMARIZATION_PROVIDER,
  useClass: NODE_ENV === 'test' ? FakeSummarizationProvider : GeminiSummarizationProvider
}
```

### Error Handling Philosophy

**Decision: Fail fast with descriptive errors**  
**Rationale:** Makes debugging easier and provides clear feedback to API consumers. Prevents cascading failures by catching errors early.

**Implementation:**
- Input validation at DTO level with class-validator
- Business logic errors with specific exception types
- Generic fallbacks for unexpected errors

## Testing Strategy

### Current Approach
- Unit tests for service classes with mocked dependencies
- No integration tests or end-to-end tests
- Mock implementations for all external dependencies

### Gaps & Improvements Needed
- Controller integration tests
- End-to-end API tests with test database
- Queue processing tests
- Error scenario testing
- Performance testing for database queries

### Test Data Management
- Static test fixtures in spec files
- No test data seeding or cleanup strategy
- Could benefit from factory pattern for test data generation

## Security Considerations

### Current Implementation
- Header-based authentication with workspace scoping
- Input validation with class-validator
- SQL injection protection via TypeORM

### Production Security Requirements
- JWT token validation with proper secret management
- Rate limiting for API endpoints
- File upload security (virus scanning, type validation)
- Input sanitization for user-generated content
- CORS configuration
- Security headers (helmet.js)

## Monitoring & Observability

### Current Implementation
- Basic console logging
- Health check endpoint
- No structured logging or metrics

### Production Requirements
- Structured logging with correlation IDs
- Metrics collection (Prometheus/DataDog)
- Distributed tracing
- Error tracking (Sentry)
- Database query performance monitoring
- Queue processing metrics

## Deployment Considerations

### Development Environment
- Local PostgreSQL database
- In-memory queue
- Environment variables in .env file

### Production Requirements
- Managed database service (AWS RDS, GCP Cloud SQL)
- Redis cluster for queue management
- Container deployment (Docker/Kubernetes)
- Secret management service
- Load balancing for multiple instances
- Database migration automation in CI/CD

## Future Enhancements

### Scalability Improvements
1. **Database Sharding:** Partition by workspace_id for multi-tenant scaling
2. **Read Replicas:** Separate read/write database connections
3. **Caching Layer:** Redis for frequently accessed data
4. **CDN Integration:** For document storage and retrieval

### Feature Enhancements
1. **Webhook Support:** Notify external systems when summaries complete
2. **Batch Processing:** Process multiple candidates simultaneously
3. **Template Management:** Configurable prompt templates
4. **Audit Logging:** Track all data access and modifications

### Developer Experience
1. **API Documentation:** OpenAPI/Swagger integration
2. **Development Tooling:** Better debugging and profiling tools
3. **Code Generation:** Automatic DTO generation from database schema
4. **Integration Testing:** Testcontainers for database testing

## Lessons Learned

1. **Start with Simple Solutions:** In-memory queue was sufficient for development and assessment
2. **Abstract Early:** LLM provider abstraction made testing much easier
3. **Validate Everything:** Input validation caught many issues during development
4. **Test Data Matters:** Good test fixtures are crucial for reliable tests
5. **Documentation First:** Writing this documentation helped identify design gaps