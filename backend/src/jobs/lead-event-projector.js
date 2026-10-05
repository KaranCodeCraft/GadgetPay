import { projectLeadEventOutboxBatch } from "../db/repository.js";

let projectorTimer = null;

export async function runLeadEventProjectorOnce(limit = 200) {
  return await projectLeadEventOutboxBatch(limit);
}

export function startLeadEventProjectorWorker({ intervalMs = 5000, batchSize = 200 } = {}) {
  if (projectorTimer) return;

  const run = async () => {
    try {
      await runLeadEventProjectorOnce(batchSize);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Lead event projector error:", message);
    }
  };

  run();
  projectorTimer = setInterval(run, Math.max(1000, intervalMs));
}

export function stopLeadEventProjectorWorker() {
  if (!projectorTimer) return;
  clearInterval(projectorTimer);
  projectorTimer = null;
}
