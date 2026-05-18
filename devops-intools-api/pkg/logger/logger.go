package logger

import (
	"fmt"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"

	"devops-intools-api/internal/config"
)

// New builds a *zap.Logger from the given log config and installs it as the
// global logger (accessible via zap.L() / zap.S()).
func New(cfg config.LogConfig) (*zap.Logger, error) {
	level, err := zapcore.ParseLevel(cfg.Level)
	if err != nil {
		return nil, fmt.Errorf("parse log level %q: %w", cfg.Level, err)
	}

	var zc zap.Config
	switch cfg.Format {
	case "json":
		zc = zap.NewProductionConfig()
	default:
		zc = zap.NewDevelopmentConfig()
		zc.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	zc.Level = zap.NewAtomicLevelAt(level)
	zc.DisableStacktrace = true

	logger, err := zc.Build()
	if err != nil {
		return nil, fmt.Errorf("build logger: %w", err)
	}

	zap.ReplaceGlobals(logger)
	return logger, nil
}
