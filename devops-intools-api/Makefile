POSTGRES_CONTAINER := devops-intools-postgres
POSTGRES_USER      := devtools
POSTGRES_PASSWORD  := devtools
POSTGRES_DB        := devtools
POSTGRES_PORT      := 5432

REGISTRY := docker.io

.PHONY: run db-start db-stop db-migrate db-rollback db-version

run:
	go run cmd/server/main.go

db-start:
	podman run -d \
		--name $(POSTGRES_CONTAINER) \
		-e POSTGRES_USER=$(POSTGRES_USER) \
		-e POSTGRES_PASSWORD=$(POSTGRES_PASSWORD) \
		-e POSTGRES_DB=$(POSTGRES_DB) \
		-p $(POSTGRES_PORT):5432 \
		$(REGISTRY)/postgres:16-alpine
	@echo "Postgres started → postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable"

db-stop:
	podman stop $(POSTGRES_CONTAINER) && podman rm $(POSTGRES_CONTAINER)
	@echo "Postgres stopped and removed"

db-migrate:
	go run cmd/migrate/main.go up

db-rollback:
	go run cmd/migrate/main.go down

db-version:
	go run cmd/migrate/main.go version
