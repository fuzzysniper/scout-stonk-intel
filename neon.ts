import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Postgres already exists on every Neon branch. Omitted services stay unmanaged.
  // No Auth/Data API/Functions/Storage/AI Gateway/Realtime, triggers, branch creation,
  // compute, retention or billing changes. SCOUT migrations are owner-run separately.
  // Context lives in ignored .neon; this file contains no credentials or RPC gate.
});
