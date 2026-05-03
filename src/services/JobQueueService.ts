import { randomUUID } from "crypto";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobInfo<T = unknown> {
  id: string;
  taskName: string;
  status: JobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  queuePosition?: number;
  error?: string;
  result?: T;
}

interface QueueTask<T> extends JobInfo<T> {
  action: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: any) => void;
}

export class JobQueueService {
  private queue: Array<QueueTask<any>> = [];
  private activeCount = 0;
  private tasks = new Map<string, QueueTask<any>>();

  constructor(
    private readonly maxWorkers: number = 2,
    private readonly maxQueueLength: number = 20,
    private readonly historyTtlMs: number = 60 * 60 * 1000
  ) {}

  enqueue<T>(taskName: string, action: () => Promise<T>): Promise<T> {
    if (this.queue.length + this.activeCount >= this.maxQueueLength) {
      throw new Error("Job queue full: too many pending inference tasks");
    }

    const id = randomUUID();
    let resolveFn: (value: T) => void;
    let rejectFn: (reason?: any) => void;

    const promise = new Promise<T>((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    const task: QueueTask<T> = {
      id,
      taskName,
      status: "pending",
      createdAt: new Date().toISOString(),
      queuePosition: this.queue.length + 1,
      action,
      resolve: resolveFn!,
      reject: rejectFn!,
    };

    this.queue.push(task);
    this.tasks.set(id, task);
    this.logQueueState();
    this.startNext();

    return promise;
  }

  getJobStatus(jobId: string): JobInfo | null {
    this.cleanupExpiredJobs();
    const task = this.tasks.get(jobId);
    if (!task) {
      return null;
    }

    return {
      id: task.id,
      taskName: task.taskName,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      queuePosition: task.queuePosition,
      error: task.error,
      result: task.result
    };
  }

  private startNext(): void {
    if (this.activeCount >= this.maxWorkers || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    task.status = "running";
    task.startedAt = new Date().toISOString();
    this.activeCount += 1;
    this.updateQueuePositions();
    this.logQueueState();

    task.action()
      .then((result) => {
        task.status = "completed";
        task.completedAt = new Date().toISOString();
        task.result = result;
        task.resolve(result);
      })
      .catch((error) => {
        task.status = "failed";
        task.completedAt = new Date().toISOString();
        task.error = String(error?.message || error);
        task.reject(error);
      })
      .finally(() => {
        this.activeCount -= 1;
        this.logQueueState();
        this.startNext();
      });
  }

  private updateQueuePositions(): void {
    this.queue.forEach((task, index) => {
      task.queuePosition = index + 1;
    });
  }

  private cleanupExpiredJobs(): void {
    const now = Date.now();
    for (const [jobId, task] of this.tasks.entries()) {
      if (
        task.completedAt &&
        now - new Date(task.completedAt).getTime() > this.historyTtlMs
      ) {
        this.tasks.delete(jobId);
      }
    }
  }

  private logQueueState(): void {
    console.log(
      `[JobQueue] active=${this.activeCount} queued=${this.queue.length} maxWorkers=${this.maxWorkers}`
    );
  }
}
