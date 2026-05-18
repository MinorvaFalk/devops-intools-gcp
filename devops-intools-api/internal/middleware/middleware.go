package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/requestid"
	"go.uber.org/zap"

	"devops-intools-api/internal/config"
	"devops-intools-api/pkg/audit"
	"devops-intools-api/pkg/response"
)

// UpstreamTimeout caps how long any single GCP SDK call can run. A stuck
// gRPC/REST call surfaces DeadlineExceeded quickly so one slow upstream can't
// drag the rest of the server down. Handlers must use c.Context() when calling
// services for this to take effect.
const UpstreamTimeout = 30 * time.Second

// Register installs the shared middleware stack on the given fiber app.
func Register(app *fiber.App, cfg *config.Config, logger *zap.Logger) {
	app.Use(requestid.New())
	app.Use(recover.New())
	app.Use(zapLogger(logger))

	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.Server.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Authorization", "Content-Type", "X-Request-ID"},
		ExposeHeaders:    []string{"X-Request-ID"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	app.Use(RequestTimeout(UpstreamTimeout))
	app.Use(actorContext())

	if cfg.Auth.APIKey != "" {
		app.Use(APIKeyAuth(cfg.Auth.APIKey))
	}
}

// RequestTimeout sets a hard deadline on every request's context. Handlers
// pass c.Context() into downstream calls to honor it.
func RequestTimeout(d time.Duration) fiber.Handler {
	return func(c fiber.Ctx) error {
		ctx, cancel := context.WithTimeout(c.Context(), d)
		defer cancel()
		c.SetContext(ctx)
		return c.Next()
	}
}

// APIKeyAuth enforces a static API key in the Authorization header.
// Skips /health and /readyz so probes can succeed without credentials.
func APIKeyAuth(apiKey string) fiber.Handler {
	return func(c fiber.Ctx) error {
		path := c.Path()
		if path == "/health" || path == "/readyz" {
			return c.Next()
		}

		token := c.Get("Authorization")
		token = strings.TrimPrefix(token, "Bearer ")

		if token != apiKey {
			return response.Unauthorized(c, "unauthorized")
		}
		return c.Next()
	}
}

// actorContext stamps every request's context with the caller's IP.
// When AzureAD is wired up, extract claims from the JWT here instead.
func actorContext() fiber.Handler {
	return func(c fiber.Ctx) error {
		ctx := audit.WithActor(c.Context(), audit.Actor{IP: c.IP()})
		c.SetContext(ctx)
		return c.Next()
	}
}

// zapLogger logs each request using the provided zap logger.
func zapLogger(logger *zap.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		logger.Info("request",
			zap.String("method", c.Method()),
			zap.String("path", c.Path()),
			zap.String("remote", c.IP()),
			zap.String("request_id", c.GetRespHeader("X-Request-Id")),
			zap.Int("status", c.Response().StatusCode()),
			zap.Int("bytes", len(c.Response().Body())),
			zap.Duration("duration", time.Since(start)),
		)
		return err
	}
}
