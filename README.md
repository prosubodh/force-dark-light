# Force Dark/Light Mode Browser Extension

> **High-performance cross-browser extension allowing users to force dark or light mode on any web page with intelligent media preservation.**

---

## 🌟 Architecture & Stack

- **Architecture:** Hexagonal (Ports & Adapters) isolating core theming algorithms from WebExtension platform APIs.
- **Language & Runtime:** TypeScript 5.8+ (Strict Sound Typing) / Node.js 24
- **Package Manager & Build:** `pnpm` / `Vite`
- **Extension Standard:** Manifest V3 (`public/manifest.json`)
- **Presentation Layer:** Vanilla TypeScript + Modern CSS (Vite bundle, zero framework runtime overhead)
- **Theming Strategy:** Hybrid Inversion Engine (Instant smart CSS filter inversion with media protection + per-site custom rules)
- **Persistence Engine:** `chrome.storage.sync` with automatic fallback to `chrome.storage.local` and Zod schema validation
- **Tenancy / Domain Scope:** Origin/Hostname-scoped theme rules and custom CSS overrides
- **Testing & Verification:** Vitest unit test suite (100.00% coverage gate) and Playwright E2E extension harness
- **Security & DevSecOps:** Strict CSP, no remote code execution, Semgrep SAST, Gitleaks, Trivy lockfile auditing

---

## 🗂️ Project Structure

```
.
├── public/
│   └── manifest.json                 # Manifest V3 specification
├── specs/                            # Canonical contract specifications
│   ├── openapi/v1/                   # OpenAPI 3.1 health and diagnostic probes
│   ├── schemas/                      # Universal JSON Schema Draft 2020-12
│   └── tokens/                       # W3C DTCG Design Tokens (tokens.json)
├── src/                              # Hexagonal Application Source
│   ├── domain/                       # Pure Invariant Domain (Theming rules, health entities)
│   ├── ports/                        # Primary (Use Cases) and Secondary (Storage/Tab) Ports
│   │   ├── primary/                  # HealthCheckUseCase, ToggleThemeUseCase
│   │   └── secondary/                # StorageHealthPort, StoragePort
│   ├── adapters/                     # Platform Adapters
│   │   ├── primary/                  # HealthCheckController, MessageListenerController
│   │   └── secondary/                # ChromeStorageAdapter, MemoryStorageAdapter
│   └── entrypoints/                  # Extension Entrypoints
│       ├── background/               # Background Service Worker (hotkeys, tab events)
│       ├── content/                  # In-page Content Script (DOM injection)
│       └── popup/                    # Popup UI (Vanilla TS & CSS)
├── tests/
│   ├── unit/                         # Vitest unit tests (100% coverage threshold)
│   └── integration/                  # Adapter tests with test doubles
├── deploy/                           # OCI Distroless Dockerfiles & Compose manifests
├── docs/rules/                       # 41 atomic single-responsibility architectural rules
├── memory.md                         # Master memory hub & Lightweight ADR ledger (ADR-015)
└── AGENTS.md                         # Lean agentic directives (< 120 lines)
```

---

## ⚡ Quickstart & Development

### 1. Prerequisites
- Node.js `24.x`
- `pnpm` (>= 9.x)

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Run Development Build (Watch Mode)
```bash
pnpm run dev
```

### 4. Build Production Extension Bundle
```bash
pnpm run build
```
The output will be generated in `dist/`.

### 5. Load Extension in Browser
1. Open your Chromium-based browser (Chrome, Edge, Brave) and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `dist/` directory.

### 6. Run Tests & Boundary Smoke Test
```bash
# Run unit tests
pnpm run test

# Run tests with 100% coverage gate
pnpm run test:coverage

# Run boundary verification smoke test
pnpm run smoke-test
```

---

## 🏛️ Architecture Governance & Decisions

This project is governed by the **41 Atomic Domain Rules** located in [`docs/rules/`](./docs/rules/) and Architectural Decision Records in [`memory.md`](./memory.md):
- **ADR-015:** Browser Extension Technical Architecture, Hybrid Theming Engine & Scaffolding Baseline (see [`memory.md`](./memory.md)).
- **Domain Rules:** See [`docs/rules/`](./docs/rules/) for TDD, Clean Code, TypeScript Strictness, and DevSecOps directives.
