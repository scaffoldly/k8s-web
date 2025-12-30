.PHONY: help clean clean-all stop-apiserver

# Default target
help:
	@echo "Usage: make <version>"
	@echo "Example: make 1.34"
	@echo ""
	@echo "This will:"
	@echo "  1. Start kube-apiserver v<version> in a Docker container"
	@echo "  2. Fetch OpenAPI v3 specs from https://localhost:6443/openapi/v3"
	@echo "  3. Generate TypeScript clients for Angular and React using orval"
	@echo ""
	@echo "Other targets:"
	@echo "  clean           - Remove generated code and built artifacts"
	@echo "  clean-all       - Clean everything including Docker containers and specs"
	@echo "  stop-apiserver  - Stop the running kube-apiserver container"

# Stop any running kube-apiserver container
stop-apiserver:
	@echo "Stopping kube-apiserver and etcd containers..."
	@docker compose down 2>/dev/null || true

# Clean generated files and built artifacts
clean:
	@echo "Cleaning generated files and built artifacts..."
	@rm -rf angular/src/generated react/src/generated angular/dist react/dist
	@rm -f angular/src/index.ts react/src/index.ts
	@rm -f openapi-specs/_merged.json openapi-specs/_merge-config.json
	@echo "✓ Cleaned generated code and dist directories"

# Clean everything including specs and Docker containers
clean-all: clean stop-apiserver
	@echo "Cleaning OpenAPI specs..."
	@rm -rf openapi-specs
	@echo "✓ Full cleanup complete"

# Pattern rule to handle version targets (e.g., make 1.34)
%:
	@if echo "$@" | grep -qE '^[0-9]+\.[0-9]+$$'; then \
		echo "Starting kube-apiserver v$@..."; \
		$(MAKE) stop-apiserver; \
		mkdir -p openapi-specs; \
		echo "Starting etcd and kube-apiserver with docker compose..."; \
		K8S_VERSION=$@ docker compose up -d || (echo "Failed to start services. Version v$@.0 may not exist."; exit 1); \
		echo "Waiting for kube-apiserver to be ready..."; \
		sleep 30; \
		echo "Generating client libraries..."; \
		K8S_VERSION=$@ yarn generate; \
		echo "Building packages..."; \
		yarn build; \
		echo "Done! Client libraries generated for Kubernetes v$@"; \
	else \
		echo "Error: Invalid target '$@'"; \
		echo "Use 'make help' for usage information"; \
		exit 1; \
	fi
