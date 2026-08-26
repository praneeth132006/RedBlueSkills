.PHONY: help install validate catalog provenance check test clean site site-build validate-labs release

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dev dependencies
	python -m pip install -r tools/requirements-dev.txt

validate: ## Validate every SKILL.md against the spec
	python tools/validate.py

catalog: ## Regenerate catalog.json, INDEX.md, badges, coverage heatmap, README stats
	python tools/build_catalog.py

provenance: ## Regenerate the SBOM (sbom.cdx.json) and provenance manifest
	python tools/build_provenance.py

validate-labs: ## Re-prove validated skills by replaying the self-contained labs
	python tools/replay_labs.py

test: ## Run the tooling test suite
	python -m pytest tools/tests -q

check: ## Full CI gate: validate + catalog/provenance/site freshness + tests
	python tools/validate.py
	python tools/build_catalog.py --check
	python tools/build_provenance.py --check
	python tools/build_site_content.py --check
	python -m pytest tools/tests -q

site-build: catalog provenance ## Regenerate the site's served catalog, provenance + content bundle
	cp catalog.json site/catalog.json
	python tools/build_site_content.py

site: site-build ## Build the site, then serve it at http://localhost:8799
	@echo ""
	@echo "  →  http://localhost:8799"
	@echo ""
	python -m http.server 8799 --directory site

release: ## Cut a release (usage: make release VERSION=1.1.0)
	@test -n "$(VERSION)" || { echo "usage: make release VERSION=1.1.0"; exit 1; }
	tools/release.sh $(VERSION)

clean: ## Remove Python caches
	find . -type d -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
