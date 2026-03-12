import axios from "axios";

export interface CrawlJob {
  jobId: string;
  url: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  error?: string;
  submittedAt: Date;
  completedAt?: Date;
}

export class CrawlBrokerService {
  private jobs: Map<string, CrawlJob> = new Map();
  private apiToken: string;
  private accountId: string;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN ?? "";
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  }

  async submitCrawl(url: string): Promise<CrawlJob> {
    const jobId = `crawl_${crypto.randomUUID()}`;
    const job: CrawlJob = {
      jobId,
      url,
      status: "pending",
      submittedAt: new Date(),
    };
    this.jobs.set(jobId, job);

    this.runCrawl(job).catch((err) => {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : String(err);
      job.completedAt = new Date();
    });

    return job;
  }

  getJobStatus(jobId: string): CrawlJob | undefined {
    return this.jobs.get(jobId);
  }

  private async runCrawl(job: CrawlJob): Promise<void> {
    job.status = "running";

    if (!this.apiToken || !this.accountId) {
      job.status = "failed";
      job.error =
        "Cloudflare credentials not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.";
      job.completedAt = new Date();
      return;
    }

    const crawlUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/browser_rendering/crawl`;

    const response = await axios.post(
      crawlUrl,
      { url: job.url },
      {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    job.result = JSON.stringify(response.data);
    job.status = "completed";
    job.completedAt = new Date();
  }
}
