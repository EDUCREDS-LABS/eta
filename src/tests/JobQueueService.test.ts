import test from "node:test";
import assert from "node:assert/strict";
import { JobQueueService } from "../services/JobQueueService";

test("JobQueueService processes queued tasks with concurrency limits", async () => {
  const queue = new JobQueueService(1, 5, 1000);
  let activeCount = 0;

  const task1 = queue.enqueue("task-1", async () => {
    activeCount += 1;
    assert.equal(activeCount, 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    activeCount -= 1;
    return "done-1";
  });

  const task2 = queue.enqueue("task-2", async () => {
    activeCount += 1;
    assert.equal(activeCount, 1);
    await new Promise((resolve) => setTimeout(resolve, 10));
    activeCount -= 1;
    return "done-2";
  });

  const results = await Promise.all([task1, task2]);
  assert.deepEqual(results, ["done-1", "done-2"]);
});

test("JobQueueService rejects new jobs when the queue is full", async () => {
  const queue = new JobQueueService(1, 1, 1000);

  queue.enqueue("task-1", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "first";
  });

  assert.throws(
    () => {
      queue.enqueue("task-2", async () => "second");
    },
    /Job queue full/
  );
});

test("JobQueueService exposes job status for queued and completed tasks", async () => {
  const queue = new JobQueueService(1, 5, 1000);
  const promise = queue.enqueue("task-status", async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return "status-ok";
  });

  const jobId = Array.from((queue as any).tasks.keys())[0] as string;
  assert.ok(jobId, "Expected a jobId to be created");

  const pendingStatus = queue.getJobStatus(jobId);
  assert.ok(
    pendingStatus?.status === "pending" || pendingStatus?.status === "running",
    `Expected pending or running status but got ${pendingStatus?.status}`
  );

  const result = await promise;
  assert.equal(result, "status-ok");

  const completedStatus = queue.getJobStatus(jobId);
  assert.equal(completedStatus?.status, "completed");
  assert.equal(completedStatus?.result, "status-ok");
});
