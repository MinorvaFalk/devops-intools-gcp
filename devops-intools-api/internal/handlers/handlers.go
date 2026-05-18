package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"

	"devops-intools-api/internal/models"
	"devops-intools-api/internal/services"
	"devops-intools-api/pkg/gcperr"
	"devops-intools-api/pkg/response"
)

// ─── Health ──────────────────────────────────────────────────────────────────

func HealthCheck(c fiber.Ctx) error {
	return response.OK(c, map[string]string{"status": "ok"})
}

func ReadinessCheck(c fiber.Ctx) error {
	return response.OK(c, map[string]string{"status": "ready"})
}

// ─── Projects ────────────────────────────────────────────────────────────────

type ProjectsHandler struct {
	svc *services.ProjectsService
}

func NewProjectsHandler(svc *services.ProjectsService) *ProjectsHandler {
	return &ProjectsHandler{svc: svc}
}

func (h *ProjectsHandler) Register(r fiber.Router) {
	r.Get("/projects", h.ListProjects)
}

// GET /projects — populates the project picker the frontend uses to drive
// every other endpoint.
func (h *ProjectsHandler) ListProjects(c fiber.Ctx) error {
	projects, err := h.svc.ListProjects(c.Context())
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, projects)
}

// ─── GCE ─────────────────────────────────────────────────────────────────────

type GCEHandler struct {
	svc *services.GCEService
}

func NewGCEHandler(svc *services.GCEService) *GCEHandler {
	return &GCEHandler{svc: svc}
}

func (h *GCEHandler) Register(r fiber.Router) {
	g := r.Group("/gce")
	g.Get("/instances", h.ListInstances)
	g.Get("/instances/:name", h.GetInstance)
}

// GET /gce/instances?project=... — simplified list view across all zones.
func (h *GCEHandler) ListInstances(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	instances, err := h.svc.ListInstances(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.GCEInstanceSummary, len(instances))
	for i, v := range instances {
		out[i] = &models.GCEInstanceSummary{
			Name:        v.Name,
			Zone:        v.Zone,
			MachineType: v.MachineType,
			Status:      v.Status,
			InternalIP:  v.InternalIP,
			NetworkTags: v.NetworkTags,
		}
	}
	return response.OK(c, out)
}

// GET /gce/instances/:name?project=...&zone=... — instance detail view.
func (h *GCEHandler) GetInstance(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	zone, err := requireQuery(c, "zone")
	if err != nil {
		return err
	}
	inst, err := h.svc.GetInstance(c.Context(), project, zone, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, inst)
}

// ─── CloudSQL ────────────────────────────────────────────────────────────────

type CloudSQLHandler struct {
	svc *services.CloudSQLService
}

func NewCloudSQLHandler(svc *services.CloudSQLService) *CloudSQLHandler {
	return &CloudSQLHandler{svc: svc}
}

func (h *CloudSQLHandler) Register(r fiber.Router) {
	g := r.Group("/cloudsql")
	g.Get("/instances", h.ListInstances)
	g.Get("/instances/:name", h.GetInstance)
}

func (h *CloudSQLHandler) ListInstances(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	instances, err := h.svc.ListInstances(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.CloudSQLInstanceSummary, len(instances))
	for i, v := range instances {
		out[i] = &models.CloudSQLInstanceSummary{
			Name:            v.Name,
			DatabaseVersion: v.Database,
			Region:          v.Region,
			Status:          v.Status,
			MachineType:     v.Tier,
			PublicIP:        v.PublicIP,
			PrivateIP:       v.PrivateIP,
		}
	}
	return response.OK(c, out)
}

func (h *CloudSQLHandler) GetInstance(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	inst, err := h.svc.GetInstance(c.Context(), project, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, inst)
}

// ─── GKE ─────────────────────────────────────────────────────────────────────

type GKEHandler struct {
	svc *services.GKEService
}

func NewGKEHandler(svc *services.GKEService) *GKEHandler {
	return &GKEHandler{svc: svc}
}

func (h *GKEHandler) Register(r fiber.Router) {
	g := r.Group("/gke")
	g.Get("/clusters", h.ListClusters)
	g.Get("/clusters/:name", h.GetCluster)
	g.Get("/clusters/:name/nodepools", h.ListNodePools)
}

func (h *GKEHandler) ListClusters(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	clusters, err := h.svc.ListClusters(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.GKEClusterSummary, len(clusters))
	for i, v := range clusters {
		out[i] = &models.GKEClusterSummary{
			Name:      v.Name,
			Location:  v.Location,
			Version:   v.Version,
			Endpoint:  v.Endpoint,
			NodeZones: v.NodeZones,
		}
	}
	return response.OK(c, out)
}

func (h *GKEHandler) GetCluster(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	location, err := requireQuery(c, "location")
	if err != nil {
		return err
	}
	cluster, err := h.svc.GetCluster(c.Context(), project, location, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, cluster)
}

// GET /gke/clusters/:name/nodepools?project=...&location=...
func (h *GKEHandler) ListNodePools(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	location, err := requireQuery(c, "location")
	if err != nil {
		return err
	}
	pools, err := h.svc.ListNodePools(c.Context(), project, location, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, pools)
}

// ─── GCS ─────────────────────────────────────────────────────────────────────

type GCSHandler struct {
	svc *services.GCSService
}

func NewGCSHandler(svc *services.GCSService) *GCSHandler {
	return &GCSHandler{svc: svc}
}

func (h *GCSHandler) Register(r fiber.Router) {
	g := r.Group("/gcs")
	g.Get("/buckets", h.ListBuckets)
	g.Get("/buckets/:bucket", h.GetBucket)
	g.Get("/buckets/:bucket/metrics", h.GetBucketMetrics)
}

func (h *GCSHandler) ListBuckets(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	buckets, err := h.svc.ListBuckets(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.GCSBucketSummary, len(buckets))
	for i, v := range buckets {
		out[i] = &models.GCSBucketSummary{
			Name:         v.Name,
			Location:     v.Location,
			StorageClass: v.StorageClass,
		}
	}
	return response.OK(c, out)
}

func (h *GCSHandler) GetBucket(c fiber.Ctx) error {
	b, err := h.svc.GetBucket(c.Context(), c.Params("bucket"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, b)
}

// GET /gcs/buckets/:bucket/metrics?project=... — total bytes + object count
// from Cloud Monitoring (sampled daily).
func (h *GCSHandler) GetBucketMetrics(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	m, err := h.svc.GetBucketMetrics(c.Context(), project, c.Params("bucket"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, m)
}

// ─── Redis ────────────────────────────────────────────────────────────────────

type RedisHandler struct {
	svc *services.RedisService
}

func NewRedisHandler(svc *services.RedisService) *RedisHandler {
	return &RedisHandler{svc: svc}
}

func (h *RedisHandler) Register(r fiber.Router) {
	g := r.Group("/redis")
	g.Get("/instances", h.ListInstances)
	g.Get("/instances/:name", h.GetInstance)
}

func (h *RedisHandler) ListInstances(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	instances, err := h.svc.ListInstances(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.RedisInstanceSummary, len(instances))
	for i, v := range instances {
		out[i] = &models.RedisInstanceSummary{
			Name:    v.Name,
			Region:  v.Region,
			Tier:    v.Tier,
			Version: v.RedisVersion,
			Host:    v.Host,
		}
	}
	return response.OK(c, out)
}

func (h *RedisHandler) GetInstance(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	location, err := requireQuery(c, "location")
	if err != nil {
		return err
	}
	inst, err := h.svc.GetInstance(c.Context(), project, location, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, inst)
}

// ─── Overview ────────────────────────────────────────────────────────────────

type OverviewHandler struct {
	svc *services.Registry
}

func NewOverviewHandler(svc *services.Registry) *OverviewHandler {
	return &OverviewHandler{svc: svc}
}

func (h *OverviewHandler) Register(r fiber.Router) {
	r.Get("/overview", h.GetOverview)
}

// GET /overview?project=... — aggregates counts from all services.
func (h *OverviewHandler) GetOverview(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	ctx := c.Context()

	gceInstances, _ := h.svc.GCE.ListInstances(ctx, project)
	sqlInstances, _ := h.svc.CloudSQL.ListInstances(ctx, project)
	gkeClusters, _ := h.svc.GKE.ListClusters(ctx, project)
	gcsBuckets, _ := h.svc.GCS.ListBuckets(ctx, project)
	redisInstances, _ := h.svc.Redis.ListInstances(ctx, project)

	summary := models.OverviewSummary{
		GCE:      countByStatus(gceStatusFn(gceInstances)),
		CloudSQL: countByStatus(sqlStatusFn(sqlInstances)),
		GKE:      countByStatus(gkeStatusFn(gkeClusters)),
		GCS:      models.ResourceSummary{Total: len(gcsBuckets), ByStatus: map[string]int{"active": len(gcsBuckets)}},
		Redis:    countByStatus(redisStatusFn(redisInstances)),
	}

	return response.OK(c, summary)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// handleGCPError maps GCP API errors to the appropriate HTTP status.
// NotFound → 404, API-disabled/PermissionDenied → 403, etc.
// Falls back to 500 for unrecognised errors.
func handleGCPError(c fiber.Ctx, err error) error {
	if e := gcperr.Classify(err); e != nil {
		return response.JSON(c, e.HTTPStatus, response.Envelope{Error: e.Message})
	}
	return response.InternalError(c, err)
}

// requireQuery returns the named query parameter or writes a 400 and returns
// the resulting error so the handler can short-circuit with `return err`.
func requireQuery(c fiber.Ctx, name string) (string, error) {
	v := c.Query(name)
	if v == "" {
		return "", response.BadRequest(c, errorf("%s query parameter is required", name))
	}
	return v, nil
}

func errorf(format string, args ...any) error { return fmt.Errorf(format, args...) }

type statusPair struct{ status string }

func countByStatus(items []statusPair) models.ResourceSummary {
	s := models.ResourceSummary{ByStatus: make(map[string]int)}
	for _, item := range items {
		s.Total++
		s.ByStatus[item.status]++
	}
	return s
}

func gceStatusFn(items []*models.GCEInstance) []statusPair {
	out := make([]statusPair, len(items))
	for i, v := range items {
		out[i] = statusPair{v.Status}
	}
	return out
}

func sqlStatusFn(items []*models.CloudSQLInstance) []statusPair {
	out := make([]statusPair, len(items))
	for i, v := range items {
		out[i] = statusPair{v.Status}
	}
	return out
}

func gkeStatusFn(items []*models.GKECluster) []statusPair {
	out := make([]statusPair, len(items))
	for i, v := range items {
		out[i] = statusPair{v.Status}
	}
	return out
}

func redisStatusFn(items []*models.RedisInstance) []statusPair {
	out := make([]statusPair, len(items))
	for i, v := range items {
		out[i] = statusPair{v.Status}
	}
	return out
}
