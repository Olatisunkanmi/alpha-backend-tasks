import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  SummaryJobData,
  SummaryProcessorService,
} from "src/candidates/summary-processor.service";
import { QueueService } from "./queue.service";

@Injectable()
export class SummaryConsumer implements OnModuleInit {
  private readonly logger = new Logger(SummaryConsumer.name);
  private isProcessing = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly summaryProcessor: SummaryProcessorService,
  ) {}

  async onModuleInit() {
    this.startProcessing();
  }

  private async startProcessing() {
    this.logger.log("Starting summary job consumer...");

    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNextJob();
      }
    }, 2000);
  }

  private async processNextJob() {
    const jobs = this.queueService.getQueuedJobs();
    const summaryJob = jobs.find((job) => job.name === "SUMMARY_GENERATE");

    if (!summaryJob) {
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log(`Processing job ${summaryJob.id}`);

      const jobData = summaryJob.payload as SummaryJobData;
      await this.summaryProcessor.processSummaryGeneration(jobData);

      this.queueService.removeJob(summaryJob.id);

      this.logger.log(`Successfully processed job ${summaryJob.id}`);
    } catch (error) {
      this.logger.error(`Failed to process job ${summaryJob.id}:`, error);

      this.queueService.removeJob(summaryJob.id);
    } finally {
      this.isProcessing = false;
    }
  }
}
