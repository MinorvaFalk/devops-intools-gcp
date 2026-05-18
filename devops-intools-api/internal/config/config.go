package config

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	Server      ServerConfig
	GCP         GCPConfig
	Database    DatabaseConfig
	Auth        AuthConfig
	Log         LogConfig
	ProjectRef ProjectRefConfig
}

type ProjectRefConfig struct {
	URL           string
	SkipTLSVerify bool // set true when the project ref API uses a self-signed certificate
}

type ServerConfig struct {
	Port         int
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	IdleTimeout  time.Duration
	CORSOrigins  []string
}

type GCPConfig struct {
	CredentialsFile string // path to service account json
}

type DatabaseConfig struct {
	URL string // postgres://user:password@host:port/dbname?sslmode=disable
}

type AuthConfig struct {
	APIKey      string
	EnableIAP   bool
	IAPAudience string
}

type LogConfig struct {
	Level  string
	Format string // "json" | "console"
}

// Load reads configuration from a .env file (if present) and environment
// variables. Environment variables take precedence over file values.
func Load() (*Config, error) {
	v := viper.New()

	v.SetConfigName(".env")
	v.SetConfigType("env")
	v.AddConfigPath(".")
	v.AddConfigPath("./config")

	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	setDefaults(v)

	if err := v.ReadInConfig(); err != nil {
		var notFound viper.ConfigFileNotFoundError
		if !errors.As(err, &notFound) {
			return nil, fmt.Errorf("read config: %w", err)
		}
	}

	cfg := &Config{
		Database: DatabaseConfig{
			URL: v.GetString("DATABASE_URL"),
		},
		Server: ServerConfig{
			Port:         v.GetInt("PORT"),
			ReadTimeout:  v.GetDuration("SERVER_READ_TIMEOUT"),
			WriteTimeout: v.GetDuration("SERVER_WRITE_TIMEOUT"),
			IdleTimeout:  v.GetDuration("SERVER_IDLE_TIMEOUT"),
			CORSOrigins:  splitAndTrim(v.GetString("CORS_ORIGIN"), ","),
		},
		GCP: GCPConfig{
			CredentialsFile: v.GetString("GOOGLE_APPLICATION_CREDENTIALS"),
		},
		Auth: AuthConfig{
			APIKey:      v.GetString("API_KEY"),
			EnableIAP:   v.GetBool("ENABLE_IAP"),
			IAPAudience: v.GetString("IAP_AUDIENCE"),
		},
		Log: LogConfig{
			Level:  v.GetString("LOG_LEVEL"),
			Format: v.GetString("LOG_FORMAT"),
		},
		ProjectRef: ProjectRefConfig{
			URL:           v.GetString("PROJECT_REF_URL"),
			SkipTLSVerify: v.GetBool("PROJECT_REF_SKIP_TLS_VERIFY"),
		},
	}

	return cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("PORT", 8080)
	v.SetDefault("SERVER_READ_TIMEOUT", 30*time.Second)
	v.SetDefault("SERVER_WRITE_TIMEOUT", 60*time.Second)
	v.SetDefault("SERVER_IDLE_TIMEOUT", 120*time.Second)
	v.SetDefault("CORS_ORIGIN", "*")

	v.SetDefault("ENABLE_IAP", false)

	v.SetDefault("LOG_LEVEL", "info")
	v.SetDefault("LOG_FORMAT", "console")
}

func splitAndTrim(s, sep string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, sep)
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}
