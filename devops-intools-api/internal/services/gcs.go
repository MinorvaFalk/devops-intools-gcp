package services

import (
	"context"
	"fmt"
	"time"

	monitoring "cloud.google.com/go/monitoring/apiv3/v2"
	"cloud.google.com/go/monitoring/apiv3/v2/monitoringpb"
	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
	"google.golang.org/protobuf/types/known/timestamppb"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// GCSService encapsulates read-only Cloud Storage operations. Create/Delete
// are intentionally omitted — credentials we use don't have those permissions.
type GCSService struct {
	client  *storage.Client
	metrics *monitoring.MetricClient
}

func NewGCSService(f *gcp.ClientFactory) *GCSService {
	return &GCSService{
		client:  f.StorageClient,
		metrics: f.MetricClient,
	}
}

// ListBuckets returns all GCS buckets in the given project.
func (s *GCSService) ListBuckets(ctx context.Context, projectID string) ([]*models.GCSBucket, error) {
	var result []*models.GCSBucket
	it := s.client.Buckets(ctx, projectID)
	for {
		attrs, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list gcs buckets: %w", err)
		}
		result = append(result, &models.GCSBucket{
			Name:              attrs.Name,
			Location:          attrs.Location,
			StorageClass:      attrs.StorageClass,
			VersioningEnabled: attrs.VersioningEnabled,
			Labels:            attrs.Labels,
			CreatedAt:         attrs.Created,
		})
	}
	return result, nil
}

// GetBucket retrieves attributes for a single GCS bucket. Bucket names are
// globally unique, so no project ID is needed.
func (s *GCSService) GetBucket(ctx context.Context, bucketName string) (*models.GCSBucket, error) {
	attrs, err := s.client.Bucket(bucketName).Attrs(ctx)
	if err != nil {
		return nil, fmt.Errorf("get gcs bucket %s: %w", bucketName, err)
	}
	return &models.GCSBucket{
		Name:              attrs.Name,
		Location:          attrs.Location,
		StorageClass:      attrs.StorageClass,
		VersioningEnabled: attrs.VersioningEnabled,
		Labels:            attrs.Labels,
		CreatedAt:         attrs.Created,
	}, nil
}

// GetBucketMetrics queries Cloud Monitoring for the latest total_bytes and
// object_count samples for the bucket. The metrics are sampled roughly every
// 24h, so a 24h window covers the most recent point without slowing the call.
func (s *GCSService) GetBucketMetrics(ctx context.Context, projectID, bucketName string) (*models.BucketMetrics, error) {
	end := time.Now()
	start := end.Add(-24 * time.Hour)

	out := &models.BucketMetrics{Bucket: bucketName}

	bytes, sampledAt, err := s.latestMetric(ctx, projectID, bucketName,
		"storage.googleapis.com/storage/total_bytes", start, end)
	if err != nil {
		return nil, fmt.Errorf("get bucket size %s: %w", bucketName, err)
	}
	out.TotalBytes = int64(bytes)
	out.SampledAt = sampledAt

	count, _, err := s.latestMetric(ctx, projectID, bucketName,
		"storage.googleapis.com/storage/object_count", start, end)
	if err != nil {
		return nil, fmt.Errorf("get object count %s: %w", bucketName, err)
	}
	out.ObjectCount = int64(count)

	return out, nil
}

// latestMetric returns the most recent point of the given gauge metric for
// the bucket. Returns 0 / zero-time when no sample exists in the window.
func (s *GCSService) latestMetric(ctx context.Context, projectID, bucketName, metricType string, start, end time.Time) (float64, time.Time, error) {
	req := &monitoringpb.ListTimeSeriesRequest{
		Name:   fmt.Sprintf("projects/%s", projectID),
		Filter: fmt.Sprintf(`metric.type="%s" AND resource.labels.bucket_name="%s"`, metricType, bucketName),
		Interval: &monitoringpb.TimeInterval{
			StartTime: timestamppb.New(start),
			EndTime:   timestamppb.New(end),
		},
		View: monitoringpb.ListTimeSeriesRequest_FULL,
	}

	it := s.metrics.ListTimeSeries(ctx, req)
	series, err := it.Next()
	if err == iterator.Done {
		return 0, time.Time{}, nil
	}
	if err != nil {
		return 0, time.Time{}, err
	}
	if len(series.Points) == 0 {
		return 0, time.Time{}, nil
	}

	// Points are ordered most-recent-first.
	p := series.Points[0]
	val := p.Value.GetDoubleValue()
	if val == 0 {
		val = float64(p.Value.GetInt64Value())
	}
	return val, p.Interval.EndTime.AsTime(), nil
}

