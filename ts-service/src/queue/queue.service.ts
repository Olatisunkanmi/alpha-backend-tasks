import { randomUUID } from "crypto";

import { Injectable } from "@nestjs/common";

export interface EnqueuedJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  enqueuedAt: string;
}

@Injectable()
export class QueueService {
  private readonly jobs: EnqueuedJob[] = [];

  enqueue<TPayload>(name: string, payload: TPayload): EnqueuedJob<TPayload> {
    const job: EnqueuedJob<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      enqueuedAt: new Date().toISOString(),
    };

    this.jobs.push(job);

    console.log(`Enqueued job: ${job.name} (${job.id})`);
    return job;
  }

  getQueuedJobs(): readonly EnqueuedJob[] {
    return this.jobs;
  }

  removeJob(jobId: string): boolean {
    const index = this.jobs.findIndex(job => job.id === jobId);
    if (index !== -1) {
      const removedJob = this.jobs.splice(index, 1)[0];
      console.log(`Removed job: ${removedJob.name} (${removedJob.id})`);
      return true;
    }
    return false;
  }

  getQueueSize(): number {
    return this.jobs.length;
  }
}
