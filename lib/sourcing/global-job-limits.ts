/**
 * Keep global-job AI qualification bounded per source and per cron run.
 * The ingestion layer persists a source cursor, so smaller batches make progress
 * over successive hourly invocations without allowing a slow provider to dominate one run.
 */
export const GLOBAL_JOBS_MAX_ITEMS_PER_SOURCE_RUN = 2;
