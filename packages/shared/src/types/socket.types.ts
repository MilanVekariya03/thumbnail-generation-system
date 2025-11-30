import { JobStatus } from './job.types';

export interface StatusUpdateMessage {
  jobId: string;
  userId: string;
  status: JobStatus;
  thumbnailPath?: string;
  errorMessage?: string;
  timestamp: number;
}

export interface ServerToClientEvents {
  jobStatusUpdate: (data: StatusUpdateMessage) => void;
  connected: () => void;
  error: (error: string) => void;
}

export interface ClientToServerEvents {
  authenticate: (token: string) => void;
  subscribeToJobs: () => void;
}

export interface SocketData {
  userId: string;
  email: string;
}
