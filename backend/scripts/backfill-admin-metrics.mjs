import { rebuildAdminMetricSnapshotsFromOutbox } from "../src/db/repository.js";

const result = rebuildAdminMetricSnapshotsFromOutbox();
console.log(JSON.stringify({ success: true, ...result }, null, 2));
