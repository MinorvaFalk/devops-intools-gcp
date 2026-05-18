IMAGE   ?= devops-intools-app
TAG     ?= latest
PORT    ?= 8080

VITE_API_BASE_URL  ?= /api/v1
VITE_CACHE_TTL_MS  ?= 300000
VITE_API_KEY       ?=

.PHONY: install dev build preview clean docker-build docker-run docker-stop

install:
	bun install

dev:
	bun run dev

build:
	bun run build

preview:
	bun run preview

clean:
	rm -rf dist

docker-build:
	docker build \
		--build-arg VITE_API_BASE_URL=$(VITE_API_BASE_URL) \
		--build-arg VITE_CACHE_TTL_MS=$(VITE_CACHE_TTL_MS) \
		--build-arg VITE_API_KEY=$(VITE_API_KEY) \
		-t $(IMAGE):$(TAG) .

docker-run:
	docker run --rm -d \
		--name $(IMAGE) \
		-p $(PORT):80 \
		$(IMAGE):$(TAG)

docker-stop:
	docker stop $(IMAGE)
