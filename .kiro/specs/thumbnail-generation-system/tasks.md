# Implementation Plan

- [x] 1. Set up monorepo structure and shared types
  - Create root package.json with npm workspaces configuration
  - Create packages/shared with TypeScript types and interfaces
  - Define User, Job, JobStatus, FileType, API request/response types
  - Set up TypeScript configs for all packages with proper references
  - Create .env.example with all required environment variables
  - _Requirements: 8.1, 8.2, 9.3_

- [x] 2. Set up infrastructure and Docker configuration
  - Create docker-compose.yml for Redis and MongoDB services
  - Configure Redis with persistence and appropriate memory limits
  - Configure MongoDB with authentication and data volume
  - Create README.md with installation instructions for FFmpeg (macOS, Ubuntu, Windows)
  - Document Docker Compose startup commands
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 3. Implement backend API authentication
  - [x] 3.1 Set up Fastify server with TypeScript
    - Initialize Fastify with CORS and multipart support
    - Configure MongoDB connection with Mongoose
    - Set up JWT plugin and authentication middleware
    - Create error handling middleware
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 3.2 Create User model and authentication routes
    - Define Mongoose User schema with email and passwordHash
    - Implement POST /api/auth/register endpoint with password hashing
    - Implement POST /api/auth/login endpoint with JWT issuance
    - Add JWT verification middleware for protected routes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 3.3 Write property tests for authentication
    - **Property 1: Password hashing invariant**
    - **Property 2: JWT token issuance**
    - **Property 3: Token authorization**
    - **Property 4: Invalid credentials rejection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 4. Implement file upload and job creation
  - [x] 4.1 Create Job model and file validation
    - Define Mongoose Job schema with all required fields
    - Create file type validation utility (MIME type and extension checking)
    - Set up file storage directories (uploads/ and thumbnails/)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 4.2 Implement upload endpoint
    - Create POST /api/upload endpoint with multipart handling
    - Validate uploaded files and reject unsupported formats
    - Store files to disk with unique filenames
    - Create Job records in MongoDB with 'pending' status
    - Return job identifiers to client
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 4.3 Write property tests for file upload
    - **Property 5: Image file acceptance**
    - **Property 6: Video file acceptance**
    - **Property 7: File type validation**
    - **Property 8: Metadata creation invariant**
    - **Property 9: Upload identifier return**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [x] 5. Implement BullMQ job queue integration
  - [x] 5.1 Set up BullMQ queue in backend
    - Initialize BullMQ Queue with Redis connection
    - Create job enqueue function with per-user FIFO configuration
    - Update upload endpoint to enqueue jobs after file storage
    - Update job status to 'queued' when enqueued
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 5.2 Write property tests for job queue
    - **Property 10: Job enqueue invariant**
    - **Property 11: Per-user FIFO ordering**
    - **Property 12: Enqueue status update**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 6. Implement job query endpoints
  - Create GET /api/jobs endpoint to list user's jobs
  - Create GET /api/jobs/:id endpoint for specific job details
  - Add authentication middleware to protect endpoints
  - Implement pagination and sorting by createdAt
  - _Requirements: 7.5_

- [x] 7. Implement worker process core structure
  - [x] 7.1 Set up worker package with BullMQ Worker
    - Initialize separate worker package with TypeScript
    - Create BullMQ Worker with Redis connection
    - Configure worker to process one job at a time per user
    - Set up MongoDB connection for status updates
    - Add error handling and job timeout configuration
    - _Requirements: 3.4, 3.5, 10.5_
  
  - [x] 7.2 Write property tests for worker consumption
    - **Property 13: Worker consumption pattern**
    - **Property 14: Failure status update**
    - **Property 38: Job timeout handling**
    - **Validates: Requirements 3.4, 3.5, 10.5**

- [ ] 8. Implement image thumbnail generation
  - [ ] 8.1 Create image processor with Sharp
    - Implement image processing function using Sharp
    - Generate 128×128 thumbnails with cover mode (aspect ratio preserved)
    - Save thumbnails to thumbnails directory with unique names
    - Update job status to 'processing' before generation
    - Update job status to 'completed' after successful save
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 8.2 Write property tests for image processing
    - **Property 15: Image job status transition**
    - **Property 16: Image thumbnail dimensions**
    - **Property 17: Aspect ratio preservation**
    - **Property 18: Image thumbnail file existence**
    - **Property 19: Image completion status**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ] 9. Implement video thumbnail generation
  - [ ] 9.1 Create video processor with FFmpeg and Sharp
    - Implement FFmpeg frame extraction at midpoint timestamp
    - Use fluent-ffmpeg to capture frame to temporary file
    - Process extracted frame with Sharp to create 128×128 thumbnail
    - Save thumbnails to thumbnails directory
    - Update job status to 'processing' and 'completed' appropriately
    - Clean up temporary frame files
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 9.2 Write property tests for video processing
    - **Property 20: Video job status transition**
    - **Property 21: Midpoint frame extraction**
    - **Property 22: Video thumbnail dimensions**
    - **Property 23: Video thumbnail file existence**
    - **Property 24: Video completion status**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 10. Implement error handling in worker
  - [ ] 10.1 Add comprehensive error handling
    - Wrap processing in try-catch blocks
    - Update job status to 'failed' on errors
    - Store error messages in job errorMessage field
    - Handle invalid files gracefully and continue processing
    - Add reconnection logic for MongoDB and Redis
    - _Requirements: 10.2, 10.3, 10.4_
  
  - [ ] 10.2 Write property tests for error handling
    - **Property 35: Generation failure status**
    - **Property 36: Invalid file error recovery**
    - **Property 37: Connection failure recovery**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [ ] 11. Checkpoint - Ensure all backend and worker tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 12. Implement Redis Pub/Sub for real-time updates
  - [x] 12.1 Add status change publisher in worker
    - Create Redis Pub/Sub publisher in worker
    - Publish status change messages after each status update
    - Include jobId, userId, status, thumbnailPath, errorMessage in messages
    - _Requirements: 6.1_
  
  - [x] 12.2 Add Pub/Sub subscriber in backend
    - Create Redis Pub/Sub subscriber in backend
    - Subscribe to status change channel on server startup
    - _Requirements: 6.2_
  
  - [ ] 12.3 Write property tests for Pub/Sub
    - **Property 25: Status change publication**
    - **Property 26: Pub/Sub message receipt**
    - **Validates: Requirements 6.1, 6.2**

- [-] 13. Implement Socket.io real-time updates
  - [x] 13.1 Set up Socket.io server in backend
    - Initialize Socket.io server with Fastify
    - Add JWT authentication for Socket.io connections
    - Create room-based connections (one room per user)
    - _Requirements: 6.3_
  
  - [x] 13.2 Connect Pub/Sub to Socket.io
    - On Pub/Sub message receipt, emit to user's Socket.io room
    - Send status update events with job data
    - Handle client disconnections and reconnections
    - _Requirements: 6.3_
  
  - [ ] 13.3 Write property tests for Socket.io
    - **Property 27: Client notification emission**
    - **Validates: Requirements 6.3**

- [x] 14. Implement thumbnail serving endpoints
  - Create GET /api/thumbnails/:filename endpoint
  - Create GET /api/download/:filename endpoint with download headers
  - Add authentication and authorization checks
  - Verify user owns the job before serving thumbnail
  - _Requirements: 7.3_

- [ ] 14.1 Write property tests for thumbnail serving
  - **Property 31: Thumbnail download serving**
  - **Validates: Requirements 7.3**

- [ ] 15. Set up Next.js web client structure
  - Initialize Next.js 14 with App Router and TypeScript
  - Install dependencies: Jotai, Socket.io-client, Axios, Shadcn UI
  - Configure Shadcn UI components
  - Set up environment variables for API and WebSocket URLs
  - Create layout with navigation
  - _Requirements: 8.1_

- [ ] 16. Implement authentication UI
  - [ ] 16.1 Create auth pages and forms
    - Create /login page with login form
    - Create /register page with registration form
    - Implement form validation with React Hook Form or native validation
    - Add error message display for auth failures
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [ ] 16.2 Implement auth state management
    - Create userAtom in Jotai for current user state
    - Create auth service with login/register/logout functions
    - Store JWT token in localStorage or httpOnly cookie
    - Add axios interceptor for authentication headers
    - Implement protected route wrapper
    - _Requirements: 1.2, 1.3_

- [ ] 17. Implement file upload UI
  - [ ] 17.1 Create upload component
    - Create FileUploader component with drag-and-drop
    - Support multi-file selection
    - Display file previews before upload
    - Show upload progress per file
    - Display immediate feedback with 'pending' status
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ] 17.2 Implement upload service
    - Create upload service using axios with multipart/form-data
    - Handle upload errors and display error messages per file
    - Update jobsAtom with new jobs after upload
    - _Requirements: 2.5, 10.1_
  
  - [ ] 17.3 Write property tests for upload error handling
    - **Property 34: Upload failure error messages**
    - **Validates: Requirements 10.1**

- [ ] 18. Implement job list and status display
  - [ ] 18.1 Create job list component
    - Create JobList component to display all user jobs
    - Fetch jobs from API on component mount
    - Display job metadata: filename, status, timestamps
    - Show status badges for: Queued, Processing, Completed, Failed
    - Display thumbnails for completed jobs
    - Display error messages for failed jobs
    - _Requirements: 6.5, 7.1, 7.4, 7.5_
  
  - [ ] 18.2 Create status badge component
    - Create StatusBadge component with color coding
    - Map status to appropriate colors and icons
    - _Requirements: 6.5_
  
  - [ ] 18.3 Write property tests for UI rendering
    - **Property 29: Status badge rendering**
    - **Property 30: Completed job thumbnail display**
    - **Property 32: Failed job error display**
    - **Property 33: Job list completeness**
    - **Validates: Requirements 6.5, 7.1, 7.4, 7.5**

- [ ] 19. Implement real-time updates in client
  - [ ] 19.1 Set up Socket.io client
    - Initialize Socket.io client with authentication token
    - Connect to backend WebSocket server
    - Handle connection/disconnection events
    - Display connection status to user
    - _Requirements: 6.3, 6.4_
  
  - [ ] 19.2 Implement status update handlers
    - Listen for status update events from Socket.io
    - Update jobsAtom when status changes received
    - Trigger UI re-render to show updated status
    - Update thumbnail display when job completes
    - _Requirements: 6.4_
  
  - [ ] 19.3 Write property tests for client state updates
    - **Property 28: UI state update**
    - **Validates: Requirements 6.4**

- [ ] 20. Implement thumbnail preview and download
  - Create ThumbnailPreview component
  - Display thumbnail image with click to view full size
  - Add download button that triggers download endpoint
  - Handle missing thumbnails gracefully
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 21. Create dashboard page
  - Create /dashboard page as main application view
  - Integrate FileUploader component
  - Integrate JobList component
  - Add user info display and logout button
  - Implement responsive layout
  - _Requirements: 7.5_

- [ ] 22. Add development scripts and documentation
  - Add npm scripts for dev/start/build in root package.json
  - Create scripts to run backend, worker, and web concurrently
  - Update README with complete setup instructions
  - Document environment variable configuration
  - Add troubleshooting section to README
  - _Requirements: 9.5_

- [ ] 23. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.
  - Verify complete upload-to-thumbnail flow works
  - Test real-time updates across multiple browser tabs
  - Verify error handling for invalid files
  - Test authentication flow completely
  - Verify MongoDB data is visible in MongoDB Compass
