.PHONY: help clean clean-all stop-apiserver test test-angular test-react publish publish-dry-run update-version angular react .check-apiserver .install-playwright

# Default target
help:
	@echo "Usage: make <version>"
	@echo "       make <framework> <version>"
	@echo ""
	@echo "Examples:"
	@echo "  make 1.34                      # Build and test both Angular and React"
	@echo "  make angular 1.34              # Build and test Angular only"
	@echo "  make react 1.34                # Build and test React only"
	@echo "  PUBLISH=true make angular 1.34 # Build, test, and publish Angular"
	@echo ""
	@echo "This will:"
	@echo "  1. Start kube-apiserver v<version> in a Docker container"
	@echo "  2. Update package.json versions to <version>.0-angular and <version>.0-react"
	@echo "  3. Fetch OpenAPI v3 specs from https://localhost:6443/openapi/v3"
	@echo "  4. Generate TypeScript clients for Angular and React using orval"
	@echo "  5. Build packages"
	@echo "  6. Run integration tests"
	@echo "  7. Stop Docker containers"
	@echo "  8. Publish to npm (if PUBLISH=true)"
	@echo ""
	@echo "Other targets:"
	@echo "  clean              - Remove generated code and built artifacts"
	@echo "  clean-all          - Clean everything including Docker containers and specs"
	@echo "  stop-apiserver     - Stop the running kube-apiserver container"
	@echo "  test               - Run all integration tests and stop Docker containers when done"
	@echo "  test-angular       - Run Angular integration tests only"
	@echo "  test-react         - Run React integration tests only"
	@echo "  publish            - Publish packages to npm"
	@echo "  publish-dry-run    - Test publish without actually publishing to npm"
	@echo "  update-version     - Update package.json versions (make update-version VERSION=1.34)"

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

# Internal function to check apiserver (starts it if not running)
.check-apiserver:
	@if ! docker ps | grep -q k8s-apiserver; then \
		echo "kube-apiserver is not running, starting it..."; \
		K8S_VERSION=1.35 docker compose up -d || exit 1; \
		echo "Waiting for kube-apiserver to be ready..."; \
		sleep 30; \
	fi
	@echo "✓ kube-apiserver is running"

# Internal function to install Playwright
.install-playwright:
	@echo "Installing Playwright browsers (if needed)..."
	@npx playwright install chromium --with-deps > /dev/null 2>&1 || true
	@echo "✓ Playwright browsers ready"

# Run Angular integration tests
test-angular:
	@echo "Running Angular integration tests..."
	@$(MAKE) .check-apiserver
	@$(MAKE) .install-playwright
	@echo ""
	@echo "Cleaning up any orphaned servers on port 4200..."
	@pkill -f "serve -l 4200" 2>/dev/null || true
	@sleep 1
	@echo "Starting test server on port 4200..."
	@cd angular-tests && npx serve -l 4200 --no-request-logging --no-clipboard . > /tmp/angular-test-server.log 2>&1 & \
	SERVER_PID=$$!; \
	sleep 3; \
	yarn --cwd angular-tests run test || TEST_FAILED=1; \
	kill $$SERVER_PID 2>/dev/null || true; \
	if [ "$$TEST_FAILED" = "1" ]; then \
		echo "✗ Tests failed (see /tmp/angular-test-server.log)"; \
		exit 1; \
	fi; \
	echo "✓ Angular tests passed!"

# Run React integration tests
test-react:
	@echo "Running React integration tests..."
	@$(MAKE) .check-apiserver
	@$(MAKE) .install-playwright
	@echo ""
	@echo "Cleaning up any orphaned servers on port 3000..."
	@pkill -f "serve -l 3000" 2>/dev/null || true
	@sleep 1
	@echo "Starting test server on port 3000..."
	@cd react-tests && npx serve -l 3000 . > /tmp/react-test-server.log 2>&1 & \
	SERVER_PID=$$!; \
	sleep 3; \
	yarn --cwd react-tests run test || TEST_FAILED=1; \
	kill $$SERVER_PID 2>/dev/null || true; \
	if [ "$$TEST_FAILED" = "1" ]; then \
		echo "✗ Tests failed (see /tmp/react-test-server.log)"; \
		exit 1; \
	fi; \
	echo "✓ React tests passed!"

# Run all integration tests
test: test-angular test-react
	@echo ""
	@echo "✓ All integration tests passed!"
	@echo ""
	@echo "Stopping Docker containers..."
	@$(MAKE) stop-apiserver
	@echo "✓ Docker containers stopped"

# Publish packages to npm
publish:
	@node scripts/publish.js

# Dry-run publish (shows what would be published without actually publishing)
publish-dry-run:
	@node scripts/publish.js --dry-run

# Update package versions to match k8s version
update-version:
	@if [ -z "$(VERSION)" ]; then \
		echo "Error: VERSION not specified"; \
		echo "Usage: make update-version VERSION=1.34"; \
		exit 1; \
	fi
	@node scripts/update-versions.js $(VERSION)

# Pattern rule for framework-specific version targets (e.g., make angular 1.34)
angular react:
	@if [ -z "$(filter-out $@,$(MAKECMDGOALS))" ]; then \
		echo "Error: Version required after framework name"; \
		echo "Usage: make $@ <version>"; \
		echo "Example: make $@ 1.34"; \
		exit 1; \
	fi
	@VERSION=$(filter-out $@,$(MAKECMDGOALS)); \
	if echo "$$VERSION" | grep -qE '^[0-9]+\.[0-9]+$$'; then \
		echo "Building $@ for Kubernetes v$$VERSION..."; \
		$(MAKE) stop-apiserver; \
		mkdir -p openapi-specs; \
		echo "Starting etcd and kube-apiserver with docker compose..."; \
		K8S_VERSION=$$VERSION docker compose up -d || (echo "Failed to start services. Version v$$VERSION.0 may not exist."; exit 1); \
		echo "Waiting for kube-apiserver to be ready..."; \
		sleep 30; \
		echo "Updating package version to $$VERSION.0-$@..."; \
		$(MAKE) update-version VERSION=$$VERSION; \
		echo "Fetching OpenAPI specs from kube-apiserver..."; \
		yarn fetch-specs; \
		echo "Generating $@ client..."; \
		yarn --cwd $@ run generate; \
		echo "Building $@ package..."; \
		yarn --cwd $@ run build; \
		echo "Running $@ tests..."; \
		$(MAKE) test-$@; \
		echo "Stopping Docker containers..."; \
		$(MAKE) stop-apiserver; \
		echo ""; \
		echo "✓ Done! $@ client generated for Kubernetes v$$VERSION"; \
		echo ""; \
		if [ "$(PUBLISH)" = "true" ]; then \
			echo "Publishing $@ to npm (PUBLISH=true)..."; \
			FRAMEWORK=$@ $(MAKE) publish; \
		else \
			echo "Skipping publish (set PUBLISH=true to publish)"; \
			echo ""; \
			echo "To publish manually:"; \
			echo "  FRAMEWORK=$@ make publish-dry-run  # Preview"; \
			echo "  FRAMEWORK=$@ make publish          # Publish"; \
		fi; \
	else \
		echo "Error: Invalid version '$$VERSION'"; \
		echo "Use 'make help' for usage information"; \
		exit 1; \
	fi

# Pattern rule to handle version targets (e.g., make 1.34)
# Also ignores version argument when used with framework targets
%:
	@if [ "$@" != "$(firstword $(MAKECMDGOALS))" ] && (echo "$(firstword $(MAKECMDGOALS))" | grep -qE '^(angular|react)$$'); then \
		: ; \
	elif echo "$@" | grep -qE '^[0-9]+\.[0-9]+$$'; then \
		echo "Starting kube-apiserver v$@..."; \
		$(MAKE) stop-apiserver; \
		mkdir -p openapi-specs; \
		echo "Starting etcd and kube-apiserver with docker compose..."; \
		K8S_VERSION=$@ docker compose up -d || (echo "Failed to start services. Version v$@.0 may not exist."; exit 1); \
		echo "Waiting for kube-apiserver to be ready..."; \
		sleep 30; \
		echo "Updating package versions to $@.0-angular and $@.0-react..."; \
		$(MAKE) update-version VERSION=$@; \
		echo "Fetching OpenAPI specs from kube-apiserver..."; \
		yarn fetch-specs; \
		echo "Generating client libraries..."; \
		yarn --cwd angular run generate && yarn --cwd react run generate; \
		echo "Building packages..."; \
		yarn build; \
		echo "Running tests..."; \
		$(MAKE) test; \
		echo "Stopping Docker containers..."; \
		$(MAKE) stop-apiserver; \
		echo ""; \
		echo "✓ Done! Client libraries generated for Kubernetes v$@"; \
		echo ""; \
		if [ "$(PUBLISH)" = "true" ]; then \
			echo "Publishing to npm (PUBLISH=true)..."; \
			$(MAKE) publish; \
		else \
			echo "Skipping publish (set PUBLISH=true to publish)"; \
			echo ""; \
			echo "To publish manually:"; \
			echo "  make publish-dry-run  # Preview"; \
			echo "  make publish          # Publish"; \
		fi; \
	else \
		echo "Error: Invalid target '$@'"; \
		echo "Use 'make help' for usage information"; \
		exit 1; \
	fi
