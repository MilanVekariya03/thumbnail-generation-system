# Thumbnail Generation System

A full-stack TypeScript application for generating thumbnails from images and videos with real-time status updates.

## Features

- 🔐 User authentication (JWT-based)
- 📤 Multi-file upload (images and videos)
- 🖼️ Automatic thumbnail generation (256×256 pixels)
- ⚡ Real-time job status updates via WebSocket
- 🔄 Background job processing with BullMQ
- 📊 MongoDB for metadata storage
- 🚀 Redis for job queue and pub/sub

## Tech Stack

- **Backend**: Node.js, Fastify, TypeScript
- **Worker**: BullMQ, Sharp, FFmpeg
- **Frontend**: Next.js 14, React
- **Database**: MongoDB
- **Cache/Queue**: Redis
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg

## Prerequisites

### System Requirements

- Node.js 18+ and npm
- Docker and Docker Compose
- FFmpeg (for video processing)

### Installing FFmpeg

#### macOS (Homebrew)
```bash
brew install ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Windows (Chocolatey)
```bash
choco install ffmpeg
```

#### Windows (Scoop)
```bash
scoop install ffmpeg
```

### Verify FFmpeg Installation
```bash
ffmpeg -version
```

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd thumbnail-generation-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and configure your environment variables:
```env
MONGO_URL=mongodb://localhost:27017/thumbnail-system
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### 4. Start Docker services (Redis & MongoDB)
```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

### 5. Build shared package
```bash
npm run build --workspace=packages/shared
```

## Development

### Start all services in development mode
```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:3001`
- Worker process (background)
- Web client on `http://localhost:3000`

### Start services individually

#### Backend API
```bash
npm run dev:backend
```

#### Worker Process
```bash
npm run dev:worker
```

#### Web Client
```bash
npm run dev:web
```

## Production Build

### Build all packages
```bash
npm run build
```

### Start production servers
```bash
# Start backend
npm run start:backend

# Start worker (in separate terminal)
npm run start:worker

# Start web (in separate terminal)
npm run start:web
```

## Project Structure

```
thumbnail-generation-system/
├── packages/
│   ├── backend/          # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/   # API routes
│   │   │   ├── models/   # Mongoose models
│   │   │   ├── middleware/ # Auth, error handling
│   │   │   ├── services/ # Business logic
│   │   │   └── index.ts  # Server entry
│   │   └── package.json
│   ├── worker/           # Background job processor
│   │   ├── src/
│   │   │   ├── processors/ # Image/video processing
│   │   │   ├── services/   # Job queue, pub/sub
│   │   │   └── index.ts    # Worker entry
│   │   └── package.json
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   ├── components/ # React components
│   │   │   ├── lib/      # Utilities, API client
│   │   │   └── store/    # Jotai atoms
│   │   └── package.json
│   └── shared/           # Shared TypeScript types
│       ├── src/
│       │   ├── types/    # Type definitions
│       │   └── constants/ # Shared constants
│       └── package.json
├── docker-compose.yml    # Redis & MongoDB
├── .env.example          # Environment template
└── package.json          # Root workspace config
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### File Upload
- `POST /api/upload` - Upload files (authenticated)

### Jobs
- `GET /api/jobs` - List user's jobs (authenticated)
- `GET /api/jobs/:id` - Get job details (authenticated)

### Thumbnails
- `GET /api/thumbnails/:filename` - View thumbnail
- `GET /api/download/:filename` - Download thumbnail

## WebSocket Events

### Client → Server
- `authenticate` - Authenticate WebSocket connection
- `subscribeToJobs` - Subscribe to job updates

### Server → Client
- `jobStatusUpdate` - Real-time job status change
- `connected` - Connection established
- `error` - Error message

## Testing

### Run all tests
```bash
npm test
```

### Run tests for specific package
```bash
npm test --workspace=packages/backend
npm test --workspace=packages/worker
npm test --workspace=packages/web
```

## Usage

1. Register a new account at `http://localhost:3000/register`
2. Login at `http://localhost:3000`
3. Upload images or videos from the dashboard
4. View thumbnails and download them
5. Real-time status updates show processing progress
