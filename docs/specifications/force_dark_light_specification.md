# Product Specification: Force Dark/Light Mode Browser Extension

## 1. Strategic Alignment & Product Goal
- **Product Goal:** Provide an instant, zero-flicker, universal dark and light mode toggle across any web page with zero media color corruption and seamless cross-session persistence.
- **Target OKR:**
  - **Objective:** Deliver the most reliable, lightweight, and unintrusive forced theming browser extension.
  - **Key Result 1:** Sub-5ms CSS generation and injection execution time per page navigation.
  - **Key Result 2:** 100% media preservation rate across standard web elements (`img`, `video`, `canvas`, `picture`, `svg`).
  - **Key Result 3:** 100.00% automated test coverage across domain, ports, and adapters.
- **Target Satisfaction Gap:** Eliminates eye strain from blindingly white pages and avoids ugly color inversion on diagrams, videos, and profile pictures.
- **Prioritization:**
  - **Kano Classification:** *Must-be* (instant inversion, media preservation, persistence), *Performance* (keyboard shortcut, sub-millisecond response).
  - **MoSCoW:**
    - *Must Have:* Hybrid CSS engine, media un-inversion, popup toggle, chrome.storage persistence.
    - *Should Have:* Global keyboard shortcut (`Alt+Shift+D`), reactive storage synchronization.
    - *Could Have:* Custom site-specific CSS injection rules.
    - *Won't Have (v1):* Cloud syncing accounts, third-party analytics, remote code loading.

---

## 2. In-Scope vs. Out-of-Scope (Non-Goals)
- **In-Scope (v1):**
  - Instant smart CSS filter generation (`invert(1) hue-rotate(180deg)`) for dark mode.
  - Automatic preservation / un-inverting of visual media (`img`, `video`, `canvas`, `picture`, `svg`).
  - Origin / Hostname extraction and normalization (`SiteHost`).
  - Per-domain override state (`dark`, `light`, `system`, `disabled`).
  - Global default fallback state.
  - Chrome Extension MV3 storage sync with local fallback.
  - Reactive DOM style injection (`StyleInjection`) with mutation observation for dynamic elements.
  - Popup UI for active domain control.
  - Keyboard shortcut toggle (`Alt+Shift+D` / `Cmd+Shift+D`).
- **Out-of-Scope (v1 Non-Goals):**
  - Arbitrary remote CSS downloads (violates Manifest V3 security policy).
  - Cloud user accounts or remote server telemetry.
  - Full DOM AST re-rendering engine (excessive memory footprint).

---

## 3. Ubiquitous Language Contract
- **ThemeMode**: The visual appearance mode (`'dark' | 'light' | 'system' | 'disabled'`).
- **SiteHost**: Normalized hostname of an active web page (e.g. `example.com`).
- **DomainRule**: Per-site configuration mapping `SiteHost` to a `ThemeMode`.
- **ThemePreference**: Aggregated user settings containing `globalMode` and `domainOverrides`.
- **InversionFilter**: CSS filter string applied to page root.
- **MediaPreservation**: CSS selectors and rules that un-invert media.
- **StyleInjection**: Physical `<style id="force-dark-light-style">` DOM node.

---

## 4. INVEST User Stories & Executable Gherkin Criteria

### US-01: Smart CSS Theming Engine & Media Preservation (Engine Domain)
**As a** web reader,  
**I want** the extension to generate and inject CSS that forces dark mode while keeping images, videos, and canvases in their true colors,  
**So that** I can browse comfortably at night without corrupted photos or diagrams.

```gherkin
Feature: Smart CSS Theme Inversion Engine

  Scenario: Generating CSS rules for forced dark mode
    Given a target ThemeMode of "dark"
    When the ThemeEngine generates CSS rules
    Then the root html filter is set to "invert(1) hue-rotate(180deg)"
    And media selectors "img, video, canvas, picture, svg" have counter-filter "invert(1) hue-rotate(180deg)"

  Scenario: Generating CSS rules for forced light mode on dark pages
    Given a target ThemeMode of "light"
    When the ThemeEngine generates CSS rules
    Then light mode normalization CSS rules are returned

  Scenario: Generating CSS rules for disabled mode
    Given a target ThemeMode of "disabled"
    When the ThemeEngine generates CSS rules
    Then empty CSS rules are returned
```

---

### US-02: Domain-Scoped Preference Resolution & Persistence (Storage Domain)
**As a** user,  
**I want** my theme preference for specific websites to be saved and remembered,  
**So that** my preferred visual appearance is automatically applied whenever I visit those sites.

```gherkin
Feature: Domain Preference Resolution

  Scenario: Resolving preference when domain override exists
    Given the global ThemeMode is "system"
    And a domain override for "github.com" is set to "dark"
    When resolving the active ThemeMode for URL "https://github.com/trending"
    Then the resolved ThemeMode is "dark"

  Scenario: Falling back to global preference when no domain override exists
    Given the global ThemeMode is "dark"
    And no domain override exists for "news.ycombinator.com"
    When resolving the active ThemeMode for URL "https://news.ycombinator.com"
    Then the resolved ThemeMode is "dark"

  Scenario: Domain normalization strips subpaths, query parameters, and ports
    When normalizing URL "https://sub.example.com:8080/path/to/page?query=1#hash"
    Then the extracted SiteHost is "sub.example.com"
```

---

### US-03: Reactive DOM Style Injection & Dynamic Content Observation (DOM Adapter)
**As a** reader on a single-page application (SPA),  
**I want** the forced dark mode to apply to dynamically loaded images and infinite scroll content without flickering,  
**So that** newly loaded elements remain properly themed and media remains un-inverted.

```gherkin
Feature: Reactive DOM Style Injection

  Scenario: Injecting theme styles into a document head
    Given an HTML document with head and body
    When StyleInjector applies "dark" mode CSS
    Then a style element with id "force-dark-light-style" is present in document head
    And its text content matches the dark mode CSS rules

  Scenario: Removing theme styles when disabled
    Given a document with an existing "force-dark-light-style" element
    When StyleInjector removes the theme styles
    Then no style element with id "force-dark-light-style" exists in the document
```

---

### US-04: Interactive Popup UI for Active Tab Control (Popup Presentation)
**As a** browser user,  
**I want** to click the extension icon to see the current site domain and change its theme mode with one click,  
**So that** I have immediate, intuitive control over any web page.

```gherkin
Feature: Popup UI Mode Selection

  Scenario: Displaying active site details on popup open
    Given the user is on active tab "https://wikipedia.org/wiki/Main_Page"
    When the popup UI initializes
    Then the site hostname "wikipedia.org" is displayed
    And the active theme mode button is highlighted

  Scenario: Changing site mode from popup
    Given the user selects "Dark" mode in the popup
    When the mode selection is confirmed
    Then a domain override for "wikipedia.org" with mode "dark" is saved
    And a message is dispatched to the active tab to apply "dark" mode immediately
```

---

### US-05: Global Keyboard Shortcut Toggle (Service Worker & Commands)
**As a** power user,  
**I want** to press Alt+Shift+D (or Cmd+Shift+D on Mac) to quickly toggle the current page theme,  
**So that** I can invert a page instantly without touching the mouse.

```gherkin
Feature: Keyboard Shortcut Command

  Scenario: Pressing toggle command cycles the active tab theme
    Given the active tab currently has resolved mode "light"
    When the "toggle-theme" shortcut is triggered
    Then the domain override for the active tab is toggled to "dark"
    And the new theme is applied to the active tab without page reload
```

---

## 5. SMART Developer Tasks Breakdown

### Sprint Backlog (WIP = 1, Outside-In TDD)

| Task ID | Component / Layer | SMART Description | Timebox |
|---|---|---|---|
| **TASK-01** | `src/domain/theme-engine/` | Implement pure `ThemeEngine` domain service with inversion CSS generation, media preservation selectors, and URL hostname normalizer with 100% unit tests. | 2.5h |
| **TASK-02** | `src/domain/preferences/` | Implement `ThemePreference` domain aggregate, Zod validation schema, and domain resolution logic with 100% unit tests. | 2.0h |
| **TASK-03** | `src/ports/` & `src/adapters/` | Implement `StoragePort` & `ChromeStorageAdapter` (sync with local fallback), and `StyleInjectorPort` & `DomStyleInjectorAdapter` with unit & integration tests. | 3.0h |
| **TASK-04** | `src/entrypoints/content/` | Implement content script coordinator that listens for tab messages, storage changes, and injects/cleans styles via `StyleInjector`. | 2.5h |
| **TASK-05** | `src/entrypoints/popup/` | Implement active tab domain resolution, one-click toggle buttons (Dark / Light / Reset), and reactive UI state updates in popup UI. | 3.0h |
| **TASK-06** | `src/entrypoints/background/` | Implement keyboard shortcut handler (`Alt+Shift+D`), storage sync dispatch, and tab lifecycle synchronization in service worker. | 2.0h |
| **TASK-07** | E2E & Smoke Verification | Run full suite: Vitest unit tests (100% coverage gate), Vite extension production build, and boundary smoke test. | 1.5h |

---

## 6. Edge Case & Failure Matrix

| Condition | Failure Mode | Mitigation / Expected Behavior |
|---|---|---|
| Restricted browser pages (`chrome://*`, `edge://*`, `about:*`) | Content scripts cannot run; tabs API throws security error. | Gracefully disable popup controls and display "Restricted browser page". |
| Storage quota exceeded in `chrome.storage.sync` | `chrome.runtime.lastError` returned during write. | Automatically fall back to `chrome.storage.local` and notify user in popup. |
| Malformed or corrupted storage data | `JSON.parse` or schema violation on load. | Zod schema validator catches corrupted state, repairs with safe default values. |
| Rapid repeated hotkey presses | Race condition with overlapping DOM mutations. | Debounce toggle commands in service worker (150ms window). |
| Pages with shadow DOM or custom iframes | Root filter might not pierce cross-origin iframes. | Content script injects into `all_frames: true` where browser security allows. |
