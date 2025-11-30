# Requirements Document

## Introduction

The Thumbnail Generation System is a full-stack application that enables users to upload images and videos, automatically generates 128×128 pixel thumbnails, and provides real-time status updates throughout the processing pipeline. The system uses a job queue architecture to handle thumbnail generation asynchronously while maintaining per-user FIFO ordering to ensure fair resource allocation.

## Glossary

- **System**: The Thumbnail Generation System
- **User**: An authenticated individual who uploads media files
- **Original File**: An image or video file uploaded by a User
- **Thumbnail**: A 128×128 pixel preview image generated from an Original File
- **Job**: A queued task representing the thumbnail generation work for a single Original File
- **Worker Process**: A separate Node.js process that consumes Jobs from the queue
- **Backend API**: The Fastify server that handles file uploads and metadata operations
- **Client Application**: The Next.js web application used by Users
- **Job Queue**: The BullMQ queue backed by Redis that stores pending Jobs
- **Metadata Store**: The MongoDB database storing file metadata and Job status

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to create an account and log in securely, so that I can upload files and track my thumbnail generation jobs.

#### Acceptance Criteria

1. WHEN a user submits valid registration credentials THEN the System SHALL create a new user account with hashed password storage
2. WHEN a user submits valid login credentials THEN the System SHALL issue a JWT token for authenticated requests
3. WHEN a user makes an authenticated request with a valid JWT token THEN the System SHALL authorize the request and identify the User
4. WHEN a user submits invalid credentials THEN the System SHALL reject the request and return an authentication error
5. WHEN a JWT token expires THEN the System SHALL reject subsequent requests using that token

### Requirement 2: Multi-File Upload

**User Story:** As a user, I want to upload multiple images and videos simultaneously, so that I can efficiently process many files at once.

#### Acceptance Criteria

1. WHEN a user uploads one or more image files (JPEG, PNG, GIF, WebP) THEN the System SHALL accept and store each Original File to disk
2. WHEN a user uploads one or more video files (MP4, AVI, MOV, WebM) THEN the System SHALL accept and store each Original File to disk
3. WHEN files are uploaded THEN the System SHALL validate file types and reject unsupported formats
4. WHEN files are stored THEN the System SHALL create metadata records in the Metadata Store with status 'pending'
5. WHEN upload processing completes THEN the System SHALL return upload identifiers immediately to the Client Application

### Requirement 3: Job Queue Management

**User Story:** As a system administrator, I want uploaded files to be processed through a reliable job queue, so that thumbnail generation is resilient and scalable.

#### Acceptance Criteria

1. WHEN an Original File is stored THEN the System SHALL enqueue a Job into the Job Queue with the file metadata
2. WHEN multiple Users upload files concurrently THEN the System SHALL maintain per-user FIFO ordering in the Job Queue
3. WHEN a Job is enqueued THEN the System SHALL update the Job status to 'queued' in the Metadata Store
4. WHEN the Job Queue contains Jobs THEN the Worker Process SHALL consume Jobs one at a time per User
5. WHEN a Job fails THEN the System SHALL update the status to 'failed' and store the error message

### Requirement 4: Image Thumbnail Generation

**User Story:** As a user, I want thumbnails generated from my uploaded images, so that I can quickly preview my content.

#### Acceptance Criteria

1. WHEN the Worker Process receives an image Job THEN the System SHALL update the Job status to 'processing'
2. WHEN processing an image file THEN the Worker Process SHALL use Sharp to generate a 128×128 pixel thumbnail
3. WHEN the thumbnail is created THEN the Worker Process SHALL preserve the aspect ratio and apply appropriate cropping
4. WHEN thumbnail generation succeeds THEN the Worker Process SHALL save the thumbnail to the thumbnails directory
5. WHEN thumbnail is saved THEN the Worker Process SHALL update the Job status to 'completed' in the Metadata Store

### Requirement 5: Video Thumbnail Generation

**User Story:** As a user, I want thumbnails generated from my uploaded videos, so that I can identify video content at a glance.

#### Acceptance Criteria

1. WHEN the Worker Process receives a video Job THEN the System SHALL update the Job status to 'processing'
2. WHEN processing a video file THEN the Worker Process SHALL use FFmpeg to extract a frame from the midpoint timestamp
3. WHEN the frame is extracted THEN the Worker Process SHALL use Sharp to generate a 128×128 pixel thumbnail
4. WHEN thumbnail generation succeeds THEN the Worker Process SHALL save the thumbnail to the thumbnails directory
5. WHEN thumbnail is saved THEN the Worker Process SHALL update the Job status to 'completed' in the Metadata Store

### Requirement 6: Real-Time Status Updates

**User Story:** As a user, I want to see live updates on my thumbnail generation progress, so that I know when my files are ready.

#### Acceptance Criteria

1. WHEN a Job status changes THEN the Worker Process SHALL publish the status change to Redis Pub/Sub
2. WHEN a status change is published THEN the Backend API Socket.io server SHALL receive the notification
3. WHEN the Socket.io server receives a notification THEN the System SHALL emit the update to connected Client Applications for that User
4. WHEN the Client Application receives a status update THEN the System SHALL update the UI to reflect the current Job status
5. WHEN a Job transitions through states THEN the System SHALL display status badges for: Queued, Processing, Completed, Failed

### Requirement 7: Thumbnail Viewing and Download

**User Story:** As a user, I want to view and download my generated thumbnails, so that I can use them in other applications.

#### Acceptance Criteria

1. WHEN a Job status is 'completed' THEN the Client Application SHALL display the thumbnail preview image
2. WHEN a user clicks on a completed thumbnail THEN the System SHALL provide a view option to see the full thumbnail
3. WHEN a user requests to download a thumbnail THEN the System SHALL serve the thumbnail file for download
4. WHEN a Job status is 'failed' THEN the Client Application SHALL display an error message with failure details
5. WHEN a user views their jobs list THEN the System SHALL display all jobs with their current status and thumbnails where available

### Requirement 8: Monorepo Project Structure

**User Story:** As a developer, I want the codebase organized as a TypeScript monorepo, so that code sharing and type safety are maintained across all packages.

#### Acceptance Criteria

1. WHEN the project is structured THEN the System SHALL organize code into packages: backend, worker, web, and shared
2. WHEN shared types are defined THEN the System SHALL make them available to all other packages through the shared package
3. WHEN TypeScript is compiled THEN the System SHALL enforce type checking across all package boundaries
4. WHEN dependencies are installed THEN the System SHALL use a monorepo tool to manage inter-package dependencies
5. WHEN the project is built THEN the System SHALL compile all TypeScript packages successfully

### Requirement 9: Development Environment Setup

**User Story:** As a developer, I want clear setup instructions and containerized dependencies, so that I can quickly start developing and testing.

#### Acceptance Criteria

1. WHEN setting up the development environment THEN the System SHALL provide a docker-compose.yml file for Redis and MongoDB
2. WHEN Docker Compose is started THEN the System SHALL launch Redis and MongoDB containers with appropriate configurations
3. WHEN environment variables are needed THEN the System SHALL provide a .env.example file with all required variables
4. WHEN FFmpeg is required THEN the System SHALL document installation commands for macOS, Ubuntu, and Windows
5. WHEN running in development mode THEN the System SHALL provide npm scripts to start backend, worker, and web packages concurrently

### Requirement 10: Error Handling and Resilience

**User Story:** As a system administrator, I want robust error handling throughout the pipeline, so that failures are gracefully managed and reported.

#### Acceptance Criteria

1. WHEN file upload fails THEN the System SHALL return a descriptive error message to the Client Application
2. WHEN thumbnail generation fails THEN the Worker Process SHALL update the Job status to 'failed' with error details
3. WHEN the Worker Process encounters an invalid file THEN the System SHALL mark the Job as failed and continue processing other Jobs
4. WHEN Redis or MongoDB connections fail THEN the System SHALL log errors and attempt reconnection
5. WHEN a Job exceeds processing time limits THEN the System SHALL mark it as failed and release Worker resources
