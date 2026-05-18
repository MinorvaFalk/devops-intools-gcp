package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
	"go.uber.org/zap"

	"devops-intools-api/internal/config"
	"devops-intools-api/internal/handlers"
	"devops-intools-api/internal/middleware"
	"devops-intools-api/internal/repository"
	"devops-intools-api/internal/services"
	"devops-intools-api/pkg/database"
	"devops-intools-api/pkg/gcp"
	"devops-intools-api/pkg/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log, err := logger.New(cfg.Log)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to init logger: %v\n", err)
		os.Exit(1)
	}
	defer func() { _ = log.Sync() }()

	ctx := context.Background()

	gcpFactory, err := gcp.NewClientFactory(ctx, cfg.GCP)
	if err != nil {
		log.Fatal("failed to initialize GCP client factory", zap.Error(err))
	}
	defer gcpFactory.Close()

	db, err := database.New(ctx, cfg.Database.URL)
	if err != nil {
		log.Fatal("failed to connect to database", zap.Error(err))
	}
	defer db.Close()

	svcRegistry := services.NewRegistry(gcpFactory)

	auditRepo := repository.NewAuditLogRepository(db)
	appRefSvc := services.NewAppRefService(repository.NewAppRefRepository(db), auditRepo)
	refProjectSvc := services.NewRefProjectService(cfg.ProjectRef.URL, cfg.ProjectRef.SkipTLSVerify, log)

	app := buildApp(cfg, svcRegistry, appRefSvc, refProjectSvc, log)

	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	go func() {
		log.Info("server starting", zap.String("addr", addr))
		if err := app.Listen(addr); err != nil && !errors.Is(err, fiber.ErrServiceUnavailable) {
			log.Fatal("server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Fatal("server forced to shutdown", zap.Error(err))
	}
	log.Info("server exited gracefully")
}

func buildApp(
	cfg *config.Config,
	svc *services.Registry,
	appRefSvc *services.AppRefService,
	refProjectSvc *services.RefProjectService,
	log *zap.Logger,
) *fiber.App {
	app := fiber.New(fiber.Config{
		AppName:      "devops-intools-api",
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	})

	middleware.Register(app, cfg, log)

	app.Get("/health", handlers.HealthCheck)
	app.Get("/readyz", handlers.ReadinessCheck)

	v1 := app.Group("/api/v1")
	handlers.NewProjectsHandler(svc.Projects).Register(v1)
	handlers.NewGCEHandler(svc.GCE).Register(v1)
	handlers.NewCloudSQLHandler(svc.CloudSQL).Register(v1)
	handlers.NewGKEHandler(svc.GKE).Register(v1)
	handlers.NewGCSHandler(svc.GCS).Register(v1)
	handlers.NewRedisHandler(svc.Redis).Register(v1)
	handlers.NewOverviewHandler(svc).Register(v1)
	handlers.NewFirewallHandler(svc.Firewall).Register(v1)
	handlers.NewAppRefHandler(appRefSvc).Register(v1)
	handlers.NewRefProjectHandler(refProjectSvc).Register(v1)

	return app
}
