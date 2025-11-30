# Design Document

## Overview

The Thumbnail Generation System is a distributed, event-driven application built as a TypeScript monorepo. It consists of four main packages: a Fastify-based backend API, a standalone worker process, a Next.js frontend, and a shared types package. The system uses BullMQ with Redis for job queuing, MongoDB for metadata persistence, Socket.io for real-time updates, Sharp for image processing, and FFmpeg for video frame extraction.

The architecture follows a clear separation of concerns:
- **Backend API**: Handles authentication, file uploads, and serves as the Socket.io server
- **Worker Process**: Consumes jobs from the queue and generates thumbnails
- **Web Client**: Provides the user interface with real-time status updates
- **Shared Package**: Contains TypeScript types and interfaces used across all packages

## Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Web Client    │
│   (Next.js)     │
└────────┬────────┘
         │ HTTP/WebSocket
         ▼
┌─────────────────┐      ┌──────────────┐
│  Backend API    │◄────►│   MongoDB    │
│   (Fastify)     │      │  (Metadata)  │
└────────┬────────┘      └──────────────┘
         │
         │ Pub/Sub
         ▼
┌─────────────────┐      ┌──────────────┐
│     Redis       │◄────►│    Worker    │
│ (Queue+Pub/Sub) │      │   Process    │
└─────────────────┘      └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │  File System │
                         │ (Thumbnails) │
                         └──────────────┘
```

### Request Flow

1. **Upload Flow**:
   - User uploads files via Web Client
   - Backend API validates, stores files to disk, creates metadata in MongoDB
   - Backend API enqueues jobs to BullMQ (Redis)
   - Backend API returns job IDs immediately

2. **Processing Flow**:
   - Worker consumes jobs from BullMQ (per-user FIFO)
   - Worker updates job status to 'processing' in MongoDB
   - Worker generates thumbnail (Sharp for images, FFmpeg+Sharp for videos)
   - Worker saves thumbnail to disk and updates status to 'completed'
   - Worker publishes status change to Redis Pub/Sub

3. **Real-Time Update Flow**:
   - Backend Socket.io server subscribes to Redis Pub/Sub
   - On status change, Socket.io emits update to connected clients
   - Web Client receives update and updates UI via Jotai state

## Components and Interfaces

### Backend API (Fastify)

**Responsibilities**:
- User authentication (registration, login, JWT validation)
- File upload handling and validation
- Job metadata CRUD operations
- Socket.io server for real-time updates
- Static file serving for thumbnails

**Key Routes**:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/upload` - Multi-file upload (authenticated)
- `GET /api/jobs` - List user's jobs (authenticated)
- `GET /api/jobs/:id` - Get specific job details (authenticated)
- `GET /api/thumbnails/:filename` - Serve thumbnail file
- `GET /api/download/:filename` - Download thumbnail

**Dependencies**:
- `fastify` - Web framework
- `@fastify/multipart` - File upload handling
- `@fastify/jwt` - JWT authentication
- `@fastify/cors` - CORS support
- `socket.io` - Real-time communication
- `mongoose` - MongoDB ODM
- `ioredis` - Redis client for Pub/Sub
- `bcrypt` - Password hashing

### Worker Process

**Responsibilities**:
- Consume jobs from BullMQ queue
- Process images with Sharp
- Extract video frames with FFmpeg and process with Sharp
- Update job status in MongoDB
- Publish status changes to Redis Pub/Sub
- Maintain per-user FIFO ordering

**Key Components**:
- `ThumbnailWorker` - Main worker class
- `ImageProcessor` - Sharp-based image thumbnail generation
- `VideoProcessor` - FFmpeg frame extraction + Sharp processing
- `StatusPublisher` - Redis Pub/Sub publisher

**Dependencies**:
- `bullmq` - Job queue consumer
- `sharp` - Image processing
- `fluent-ffmpeg` - FFmpeg wrapper
- `mongoose` - MongoDB ODM
- `ioredis` - Redis client for Pub/Sub

### Web Client (Next.js)

**Responsibilities**:
- User authentication UI (login/register forms)
- Multi-file upload interface with drag-and-drop
- Real-time job status display
- Thumbnail preview and download
- Error message display

**Key Pages**:
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard with upload and job list
- `/jobs` - Detailed job list view

**Key Components**:
- `AuthForm` - Login/register form
- `FileUploader` - Multi-file upload with drag-and-drop
- `JobList` - Display jobs with status badges
- `ThumbnailPreview` - Show thumbnail with download option
- `StatusBadge` - Visual status indicator

**State Management (Jotai)**:
- `userAtom` - Current authenticated user
- `jobsAtom` - List of user's jobs
- `uploadProgressAtom` - Upload progress tracking

**Dependencies**:
- `next` - React framework
- `react` - UI library
- `jotai` - State management
- `socket.io-client` - Real-time updates
- `@shadcn/ui` - UI components
- `axios` - HTTP client

### Shared Package

**Exports**:
- Type definitions for User, Job, File metadata
- Enums for JobStatus, FileType
- API request/response interfaces
- Socket.io event types

## Data Models

### User Model (MongoDB)

```typescript
interface User {
  _id: ObjectId;
  email: string;           // Unique, indexed
  passwordHash: string;    // Bcrypt hashed
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- `email` (unique)

### Job Model (MongoDB)

```typescript
interface Job {
  _id: ObjectId;
  userId: ObjectId;        // Reference to User, indexed
  originalFilename: string;
  originalPath: string;    // Path to uploaded file
  thumbnailPath?: string;  // Path to generated thumbnail
  fileType: 'image' | 'video';
  mimeType: string;
  fileSize: number;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

**Indexes**:
- `userId` (for user-specific queries)
- `status` (for queue management)
- `createdAt` (for sorting)

### BullMQ Job Data

```typescript
interface ThumbnailJobData {
  jobId: string;           // MongoDB Job _id
  userId: string;
  originalPath: string;
  fileType: 'image' | 'video';
  mimeType: string;
}
```

### Redis Pub/Sub Message

```typescript
interface StatusUpdateMessage {
  jobId: string;
  userId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  thumbnailPath?: string;
  errorMessage?: string;
  timestamp: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication Properties

**Property 1: Password hashing invariant**
*For any* valid registration credentials, the stored password in the database should be hashed and not equal to the plaintext password.
**Validates: Requirements 1.1**

**Property 2: JWT token issuance**
*For any* registered user with valid login credentials, the login operation should return a valid JWT token that can be decoded to identify the user.
**Validates: Requirements 1.2**

**Property 3: Token authorization**
*For any* authenticated request with a valid JWT token, the system should successfully authorize the request and correctly identify the user.
**Validates: Requirements 1.3**

**Property 4: Invalid credentials rejection**
*For any* invalid credentials (wrong password, non-existent user), the authentication attempt should be rejected with an error.
**Validates: Requirements 1.4**

### File Upload Properties

**Property 5: Image file acceptance**
*For any* valid image file (JPEG, PNG, GIF, WebP), the upload operation should store the file to disk and return success.
**Validates: Requirements 2.1**

**Property 6: Video file acceptance**
*For any* valid video file (MP4, AVI, MOV, WebM), the upload operation should store the file to disk and return success.
**Validates: Requirements 2.2**

**Property 7: File type validation**
*For any* file with an unsupported extension or MIME type, the upload operation should reject the file with a validation error.
**Validates: Requirements 2.3**

**Property 8: Metadata creation invariant**
*For any* successfully stored file, a corresponding metadata record should exist in MongoDB with status 'pending'.
**Validates: Requirements 2.4**

**Property 9: Upload identifier return**
*For any* completed upload operation, the response should contain valid job identifiers for all uploaded files.
**Validates: Requirements 2.5**

### Job Queue Properties

**Property 10: Job enqueue invariant**
*For any* stored original file, a corresponding job should be enqueued in the BullMQ queue with correct metadata.
**Validates: Requirements 3.1**

**Property 11: Per-user FIFO ordering**
*For any* user with multiple jobs, the jobs should be processed in the order they were enqueued (FIFO per user).
**Validates: Requirements 3.2**

**Property 12: Enqueue status update**
*For any* job added to the queue, the job status in MongoDB should be updated to 'queued'.
**Validates: Requirements 3.3**

**Property 13: Worker consumption pattern**
*For any* user with jobs in the queue, the worker should process only one job at a time for that user.
**Validates: Requirements 3.4**

**Property 14: Failure status update**
*For any* failed job, the status should be updated to 'failed' and an error message should be stored in MongoDB.
**Validates: Requirements 3.5**

### Image Processing Properties

**Property 15: Image job status transition**
*For any* image job received by the worker, the status should transition to 'processing' before thumbnail generation begins.
**Validates: Requirements 4.1**

**Property 16: Image thumbnail dimensions**
*For any* processed image file, the generated thumbnail should have dimensions of 128×128 pixels.
**Validates: Requirements 4.2**

**Property 17: Aspect ratio preservation**
*For any* image thumbnail, the aspect ratio should be preserved through appropriate cropping (cover mode).
**Validates: Requirements 4.3**

**Property 18: Image thumbnail file existence**
*For any* successfully processed image, a thumbnail file should exist in the thumbnails directory.
**Validates: Requirements 4.4**

**Property 19: Image completion status**
*For any* saved image thumbnail, the job status in MongoDB should be updated to 'completed'.
**Validates: Requirements 4.5**

### Video Processing Properties

**Property 20: Video job status transition**
*For any* video job received by the worker, the status should transition to 'processing' before frame extraction begins.
**Validates: Requirements 5.1**

**Property 21: Midpoint frame extraction**
*For any* video file, FFmpeg should extract a frame from the midpoint timestamp (duration / 2).
**Validates: Requirements 5.2**

**Property 22: Video thumbnail dimensions**
*For any* extracted video frame, the generated thumbnail should have dimensions of 128×128 pixels.
**Validates: Requirements 5.3**

**Property 23: Video thumbnail file existence**
*For any* successfully processed video, a thumbnail file should exist in the thumbnails directory.
**Validates: Requirements 5.4**

**Property 24: Video completion status**
*For any* saved video thumbnail, the job status in MongoDB should be updated to 'completed'.
**Validates: Requirements 5.5**

### Real-Time Update Properties

**Property 25: Status change publication**
*For any* job status change, a corresponding message should be published to Redis Pub/Sub.
**Validates: Requirements 6.1**

**Property 26: Pub/Sub message receipt**
*For any* status change published to Redis, the Socket.io server should receive the notification.
**Validates: Requirements 6.2**

**Property 27: Client notification emission**
*For any* status update received by Socket.io, the update should be emitted to all connected clients for that user.
**Validates: Requirements 6.3**

**Property 28: UI state update**
*For any* status update received by the client, the Jotai state should be updated to reflect the new job status.
**Validates: Requirements 6.4**

**Property 29: Status badge rendering**
*For any* job status (queued, processing, completed, failed), the UI should render the appropriate status badge.
**Validates: Requirements 6.5**

### Thumbnail Viewing Properties

**Property 30: Completed job thumbnail display**
*For any* job with status 'completed', the client should display the thumbnail preview image.
**Validates: Requirements 7.1**

**Property 31: Thumbnail download serving**
*For any* download request for an existing thumbnail, the system should serve the file with appropriate headers.
**Validates: Requirements 7.3**

**Property 32: Failed job error display**
*For any* job with status 'failed', the client should display an error message with the failure details.
**Validates: Requirements 7.4**

**Property 33: Job list completeness**
*For any* user's job list view, all jobs should be displayed with their current status and thumbnails where available.
**Validates: Requirements 7.5**

### Error Handling Properties

**Property 34: Upload failure error messages**
*For any* failed upload operation, the response should contain a descriptive error message.
**Validates: Requirements 10.1**

**Property 35: Generation failure status**
*For any* thumbnail generation failure, the job status should be 'failed' with error details stored.
**Validates: Requirements 10.2**

**Property 36: Invalid file error recovery**
*For any* batch of jobs containing invalid files, the worker should mark invalid jobs as failed and continue processing valid jobs.
**Validates: Requirements 10.3**

**Property 37: Connection failure recovery**
*For any* Redis or MongoDB connection failure, the system should log the error and attempt reconnection.
**Validates: Requirements 10.4**

**Property 38: Job timeout handling**
*For any* job exceeding the processing time limit, the job should be marked as failed and worker resources released.
**Validates: Requirements 10.5**

## Error Handling

### Backend API Error Handling

- **Authentication Errors**: Return 401 with descriptive message
- **Validation Errors**: Return 400 with field-specific errors
- **File Upload Errors**: Return 400/413 with error details
- **Database Errors**: Return 500, log error, attempt reconnection
- **Not Found Errors**: Return 404 with resource information

### Worker Error Handling

- **Processing Errors**: Catch exceptions, update job status to 'failed', store error message
- **FFmpeg Errors**: Handle stderr output, mark job as failed with FFmpeg error details
- **Sharp Errors**: Catch processing errors, mark job as failed
- **Queue Errors**: Log and retry with exponential backoff
- **Timeout Handling**: Set job timeout (5 minutes), mark as failed if exceeded

### Client Error Handling

- **Network Errors**: Display user-friendly message, retry option
- **Upload Errors**: Show error per file, allow retry
- **Socket Disconnection**: Attempt reconnection, show connection status
- **Authentication Errors**: Redirect to login, clear stored tokens

## Testing Strategy

### Unit Testing

The system will use **Jest** as the testing framework for all packages. Unit tests will cover:

**Backend API**:
- Authentication middleware (JWT validation)
- File validation logic
- Route handlers (mocked database)
- Error handling middleware

**Worker**:
- Image processing functions
- Video frame extraction logic
- Status update publishing
- Error recovery mechanisms

**Web Client**:
- Component rendering
- Form validation
- State management (Jotai atoms)
- Socket.io event handlers

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript. Each correctness property will be implemented as a property-based test with a minimum of 100 iterations.

**Property Test Requirements**:
- Each test must be tagged with: `// Feature: thumbnail-generation-system, Property {number}: {property_text}`
- Each test must reference the requirements it validates
- Tests should use smart generators that constrain inputs to valid ranges
- Tests should avoid mocking where possible to test real functionality

**Key Property Tests**:
- Authentication: Password hashing, token generation, authorization
- File Upload: Type validation, metadata creation, identifier return
- Job Queue: FIFO ordering, status transitions, failure handling
- Thumbnail Generation: Dimension validation, file existence, status updates
- Real-Time Updates: Message publication, client notification, UI updates
- Error Handling: Failure recovery, timeout handling, error messages

**Testing Framework Configuration**:
```typescript
// fast-check configuration
fc.assert(
  fc.property(/* generators */, (/* inputs */) => {
    // Property assertion
  }),
  { numRuns: 100 } // Minimum 100 iterations
);
```

### Integration Testing

Integration tests will verify:
- End-to-end upload flow (API → Queue → Worker → Database)
- Real-time update flow (Worker → Redis → Socket.io → Client)
- Authentication flow (Register → Login → Authenticated Request)
- Error scenarios (Invalid files, connection failures, timeouts)

### Test Data Generators

Property-based tests will use custom generators:
- `arbitraryUser()` - Generate random valid user credentials
- `arbitraryImageFile()` - Generate random image file metadata
- `arbitraryVideoFile()` - Generate random video file metadata
- `arbitraryJobStatus()` - Generate random job status transitions
- `arbitraryInvalidFile()` - Generate files with invalid types/extensions

## Performance Considerations

### Scalability

- **Horizontal Scaling**: Multiple worker processes can run concurrently
- **Queue Partitioning**: BullMQ supports multiple queues for different priorities
- **Database Indexing**: Proper indexes on userId, status, createdAt for fast queries
- **Connection Pooling**: MongoDB and Redis connection pools for efficiency

### Optimization

- **Thumbnail Caching**: Generated thumbnails stored on disk, served statically
- **Lazy Loading**: Client loads thumbnails on-demand
- **Batch Processing**: Worker can process multiple jobs per user in sequence
- **Resource Limits**: FFmpeg and Sharp operations have memory limits

### Monitoring

- **Job Metrics**: Track queue length, processing time, failure rate
- **System Metrics**: Monitor CPU, memory, disk usage
- **Error Logging**: Structured logging with Winston or Pino
- **Health Checks**: Endpoints for service health monitoring

## Security Considerations

### Authentication & Authorization

- **Password Security**: Bcrypt with salt rounds (10+)
- **JWT Security**: Short expiration (1 hour), secure secret, HTTPS only
- **Token Storage**: HttpOnly cookies or secure localStorage
- **Authorization**: Verify user owns resources before access

### File Upload Security

- **File Type Validation**: Check MIME type and extension
- **File Size Limits**: Enforce maximum file size (e.g., 100MB)
- **Filename Sanitization**: Prevent path traversal attacks
- **Virus Scanning**: Optional integration with ClamAV

### API Security

- **CORS**: Restrict origins to known frontend domains
- **Rate Limiting**: Prevent abuse with rate limiting middleware
- **Input Validation**: Validate all inputs with schemas
- **SQL Injection**: Use parameterized queries (Mongoose handles this)

## Deployment Considerations

### Docker Containers

- **Backend API**: Dockerfile with Node.js, FFmpeg installed
- **Worker**: Separate Dockerfile with Node.js, FFmpeg, Sharp dependencies
- **Web Client**: Next.js production build, served by Node or Nginx
- **Redis & MongoDB**: Official Docker images via docker-compose

### Environment Variables

Required environment variables:
- `MONGO_URL` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret for JWT signing
- `PORT` - Backend API port (default: 3001)
- `NEXT_PUBLIC_API_URL` - Backend API URL for client
- `NEXT_PUBLIC_WS_URL` - WebSocket URL for client

### File Storage

- **Development**: Local filesystem (backend/uploads, backend/thumbnails)
- **Production**: Consider cloud storage (S3, GCS) for scalability
- **Backup**: Regular backups of uploads and thumbnails

## Technology Stack Summary

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify 4.x
- **Database**: MongoDB 6.x with Mongoose
- **Queue**: BullMQ 4.x with Redis 7.x
- **Real-Time**: Socket.io 4.x
- **Image Processing**: Sharp 0.32+
- **Video Processing**: FFmpeg (system install) with fluent-ffmpeg
- **Authentication**: JWT with bcrypt

### Frontend
- **Framework**: Next.js 14.x (App Router)
- **UI Library**: React 18.x
- **UI Components**: Shadcn UI
- **State Management**: Jotai 2.x
- **HTTP Client**: Axios
- **Real-Time**: Socket.io-client 4.x

### Development
- **Language**: TypeScript 5.x
- **Monorepo**: npm workspaces
- **Testing**: Jest + fast-check
- **Linting**: ESLint
- **Formatting**: Prettier

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Redis**: Redis 7.x (Docker)
- **MongoDB**: MongoDB 6.x (Docker)
