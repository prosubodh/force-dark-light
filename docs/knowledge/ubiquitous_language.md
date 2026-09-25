# Living Ubiquitous Language Glossary: Force Dark/Light Mode

> **Source of Truth:** Authoritative terminology dictionary binding domain concepts, business definitions, and exact code identifiers for the Force Dark/Light Mode extension.

---

## Canonical Domain Vocabulary Matrix

| Canonical Term | Business Definition | Bounded Context | Forbidden Synonyms | Code & Schema Identifiers |
|---|---|---|---|---|
| **ThemeMode** | The visual rendering appearance mode applied to a web page or globally. | Theming Domain | ColorMode, StyleType, DarkSetting, Appearance | `ThemeMode` (`'dark' \| 'light' \| 'system' \| 'disabled'`) |
| **SiteHost** | The normalized origin hostname of an active web page (e.g. `example.com`). | Tenancy & Scope | URL, Hostname, WebAddress, DomainName | `SiteHost`, `domain` |
| **DomainRule** | The persistent preference configuring a specific SiteHost's ThemeMode and style overrides. | Preference Domain | SiteSetting, DomainConfig, OverrideRecord | `DomainRule`, `domainOverrides` |
| **ThemePreference** | The complete user settings state consisting of a global ThemeMode and dictionary of DomainRules. | Preference Domain | UserConfig, GlobalSettings, ExtensionSettings | `ThemePreference`, `preferences` |
| **InversionFilter** | The calculated CSS filter transformation string applied to root HTML elements. | Engine Domain | FilterString, CssRule, InvertMatrix | `InversionFilter`, `generateInversionCss` |
| **MediaPreservation** | The CSS rules and selectors designed to un-invert visual media elements (images, videos, canvases). | Engine Domain | MediaFix, ReverseInvert, Uninvert | `MediaPreservation`, `mediaSelectors` |
| **StyleInjection** | The physical `<style>` DOM element injected into the document head to enforce the active theme. | Presentation & DOM | InjectedCss, DomStyle, ThemeTag | `StyleInjection`, `INJECTED_STYLE_ID` |

---

## Linguistic Invariants & Rules
1. **The Single Name Rule:** Every domain concept has exactly one authoritative name. Synonyms (`ColorMode`, `SiteSetting`, `FilterString`) are strictly forbidden across code, schemas, and UI.
2. **Contextual Boundaries:** The core theming algorithms (`src/domain/`) operate strictly on `ThemeMode`, `InversionFilter`, and `MediaPreservation`, with zero awareness of browser extension APIs (`chrome.*`).
3. **Continuous Updating:** Whenever new capabilities (e.g., custom schedules, luminance calculations) are introduced, this glossary must be updated first.
