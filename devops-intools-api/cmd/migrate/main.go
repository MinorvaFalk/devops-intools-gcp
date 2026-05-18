package main

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	"devops-intools-api/internal/config"
	"devops-intools-api/migrations"
)

// Usage:
//
//	go run cmd/migrate/main.go           → apply all pending migrations (up)
//	go run cmd/migrate/main.go down      → roll back the latest migration
//	go run cmd/migrate/main.go version   → print current migration version
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}
	if cfg.Database.URL == "" {
		log.Fatal("DATABASE_URL is not set")
	}

	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		log.Fatalf("create migration source: %v", err)
	}

	// golang-migrate's pgx/v5 driver requires the pgx5:// scheme.
	dsn := strings.Replace(cfg.Database.URL, "postgres://", "pgx5://", 1)

	m, err := migrate.NewWithSourceInstance("iofs", source, dsn)
	if err != nil {
		log.Fatalf("init migrator: %v", err)
	}
	defer m.Close()

	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}

	switch cmd {
	case "up":
		if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate up: %v", err)
		}
		fmt.Println("migrations applied")

	case "down":
		if err := m.Steps(-1); err != nil && !errors.Is(err, migrate.ErrNoChange) {
			log.Fatalf("migrate down: %v", err)
		}
		fmt.Println("rolled back one migration")

	case "version":
		version, dirty, err := m.Version()
		if err != nil && !errors.Is(err, migrate.ErrNilVersion) {
			log.Fatalf("get version: %v", err)
		}
		fmt.Printf("version=%d dirty=%v\n", version, dirty)

	default:
		log.Fatalf("unknown command %q — use up, down, or version", cmd)
	}
}
