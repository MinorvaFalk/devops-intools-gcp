import { get } from "./client";
import { bustCache, cachedGet } from "./cache";
import type { BucketMetrics, GCSBucket, GCSBucketSummary } from "../types/api";

const listPath = (project: string) =>
  `/gcs/buckets?project=${encodeURIComponent(project)}`;

export const listBuckets = (project: string) =>
  cachedGet<GCSBucketSummary[]>(listPath(project));

export const bustBuckets = (project: string) => bustCache(listPath(project));

export const getBucket = (bucket: string) =>
  get<GCSBucket>(`/gcs/buckets/${encodeURIComponent(bucket)}`);

export const getBucketMetrics = (project: string, bucket: string) =>
  get<BucketMetrics>(
    `/gcs/buckets/${encodeURIComponent(bucket)}/metrics?project=${encodeURIComponent(project)}`
  );
