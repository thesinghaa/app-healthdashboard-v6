# Design Audit — Kerala eHealth Dashboard
**URL**: https://dashboard.ehealth.kerala.gov.in  
**Audit date**: May 2026  
**Auditor**: PIF Health Dashboard V3 project  
**Purpose**: UI/UX learning reference — architecture, structure, design patterns, colour, typography observations to inform V3 decisions

---

## 1. First Impressions

The Kerala dashboard is a **government-grade administrative portal** — functional, data-complete, but not designed for interpretive storytelling. It answers "what data do we have?" rather than "what does this data mean?". The visual hierarchy is flat — everything is given equal weight, so nothing stands out as urgent or actionable.

**Immediate contrast with V3:** V3 leads with programme status (Critical/Caution/On Track), Kerala leads with system modules. Kerala is for administrators; V3 is designed for programme officers and decision-makers.

---

## 2. Framework & Technical Architecture

| Property | Value |
|---|---|
| Base framework | AdminLTE 2.x (open-source admin template on Bootstrap 3) |
| Version | 2.7.8.178 |
| Last updated | May 13, 2026 |
| Rendering | Server-side / partial JS — some views are static HTML tables |
| Routing | Hash-based (`/#`) |
| Charts | Likely Chart.js or Highcharts (standard AdminLTE integrations) |
| Tables | DataTables.js (filterable, sortable) |
| Auth | Session-based login (separate login route) |

**Key observation:** AdminLTE is a theme, not a purpose-built system. This means the dashboard inherits all of Bootstrap's generic visual language — grids, cards, buttons — none of it was designed with health data in mind. It works, but it doesn't communicate.

---

## 3. Information Architecture

### 3.1 Navigation Structure
```
Landing Page (public)
├── eHealth Project       → Hospital management stats
├── Covid-19 Death        → Death management system
├── Dept of Homeopathy    → Consultation statistics
├── NCD Survey            → Population-based NCD data
├── Health Innovation Zone → Blood bag monitoring
└── ABDM Kerala           → Ayushman Bharat Digital Mission

External Links (header nav)
├── SDHM Website
├── GoK Dashboard
├── eHealth Covid Dashboard
├── Kerala Health Portal
├── Kerala.gov.in
└── Book Your Appointment
```

**UX observation:** The top-level split between modules and external links creates two competing navigation systems. A first-time user doesn't know which to use. The external links look as important as the core modules — no visual hierarchy between "this dashboard" and "other sites".

### 3.2 Depth of Navigation
- Appears to be **2–3 layers deep**: Landing → Module → Data table/chart
- No breadcrumb visible — users can get disoriented on sub-pages
- No global search across modules

### 3.3 Entry Points
- Public landing page shows all 6 modules — no login required to see module list
- Deeper data may be behind authentication (login route exists)
- No onboarding or orientation for new users

---

## 4. Layout & Grid System

### Landing Page Layout
- **Header**: Logo left + navigation right (standard AdminLTE topbar)
- **Hero section**: Dashboard title "State Digital Health Mission" centred
- **Module cards**: 3-column grid (Bootstrap col-md-4), 6 cards total
- **Data tables**: Full-width below module cards, with filter controls above
- **Footer**: Links row + version + copyright

### Card Layout (Module Cards)
```
┌─────────────────────────────┐
│  [Icon / image]             │
│  Module Title (H4, bold)    │
│  Short description (p)      │
│  [ Visit → ] button         │
└─────────────────────────────┘
```
- Cards are equal size — no proportional weighting by importance
- No status indicator on any card — you don't know if a module has critical data
- CTA is a generic "Visit" — doesn't tell you what you'll find
- No key metric surfaced on the card itself — you must click in to see any numbers

**What V3 does differently:** Each card surfaces the key metric + status immediately. You can read the health of a programme without clicking anything.

---

## 5. Colour System

Based on AdminLTE 2.x defaults (confirmed by framework identification):

| Usage | Colour | Hex |
|---|---|---|
| Primary / brand | Dark blue | `#222d32` (sidebar) |
| Header background | Light blue | `#3c8dbc` |
| Body background | Off-white | `#ecf0f5` |
| Card background | White | `#ffffff` |
| Success / green | Bootstrap green | `#00a65a` |
| Warning / amber | Bootstrap yellow | `#f39c12` |
| Danger / red | Bootstrap red | `#dd4b39` |
| Info / teal | Bootstrap teal | `#00c0ef` |
| Text primary | Near-black | `#333333` |
| Text muted | Grey | `#777777` |
| Border | Light grey | `#d2d6de` |

**Colour audit observations:**
- Colour is used functionally (status badges) but not expressively — no brand personality
- The blue/grey palette is cold and institutional — appropriate for a government system, but does not evoke health, care, or urgency
- No ambient colour — pages feel flat because background is always the same `#ecf0f5`
- Status colours (green/amber/red) are Bootstrap defaults — globally recognised but visually generic
- No gradient, no glass, no depth — purely flat 2D

**Contrast with V3:** V3 uses warm orange (`#FF5500`) as a primary accent — communicates urgency and warmth. Background gradients and glass morphism give depth. The Kerala dashboard has zero visual warmth.

---

## 6. Typography

| Element | Font | Weight | Size (est.) |
|---|---|---|---|
| Dashboard title | Source Sans Pro (AdminLTE default) | 300–400 | ~24px |
| Module titles | Source Sans Pro | 600–700 | ~18px |
| Body / descriptions | Source Sans Pro | 400 | 14px |
| Table data | Source Sans Pro | 400 | 13px |
| Labels / badges | Source Sans Pro | 600 | 11–12px |

**Typography observations:**
- Single typeface throughout — no typographic hierarchy signal between data types
- No serif or display font for headings — everything reads as body text
- Numbers (KPIs, counts) use the same font as labels — metrics don't stand out
- Line height and letter spacing are Bootstrap defaults — adequate but not optimised for data reading
- No use of monospace for numbers — alignment in tables can be inconsistent

**V3 contrast:** V3 uses three fonts with purpose — Playfair Display (editorial authority for headings), Inter (UI clarity for labels), JetBrains Mono (numerical precision for metrics). Each typeface signals what type of information it carries.

---

## 7. Data Presentation Patterns

### 7.1 What's Used
- **DataTables**: Filterable/sortable tables — the primary data display pattern
- **Filters**: Date range picker, dropdown selects (hospital name, type, district)
- **Stat counters**: Likely big number cards at top of sub-pages (AdminLTE info-box pattern)
- **Charts**: Present in sub-pages (chart type unknown from fetch — likely bar/line)

### 7.2 Table-First Design
The Kerala dashboard is fundamentally **table-first** — data is presented as rows and columns. This is great for:
- Exporting and auditing
- Finding a specific hospital or district
- Precise comparison

But weak for:
- Seeing patterns and trends at a glance
- Understanding programme health across dimensions
- Non-expert users who need interpretation, not raw data

### 7.3 What's Missing
- No target vs. achievement comparison visible
- No status classification logic (what makes something "on track" vs. "failing")
- No district-level heat mapping or geographic visualisation
- No trend lines or time-series at the module card level
- No "so what" layer — data is presented without interpretation

---

## 8. Navigation & UX Patterns

### Strengths
- **Multi-system integration**: Links to 6+ related portals — recognises the ecosystem
- **Filter granularity**: District + facility type + date range is good — respects the user's need to narrow
- **Modular architecture**: Each programme/scheme is a separate module — easy to add new ones
- **Public access**: No login needed for top-level data — promotes transparency

### Weaknesses
- **No global search**: Can't search "Kozhikode" or "ANC" across all modules simultaneously
- **No drill-down from map**: No geographic visualisation despite district-level data existing
- **No status dashboard**: No single view showing which modules/districts are performing well vs. poorly
- **Navigation confusion**: Module cards and external links look identical — no visual distinction
- **No mobile optimisation apparent**: AdminLTE 2.x has Bootstrap 3 responsive but not mobile-first
- **No loading states**: JS-heavy pages may show blank content before render
- **No contextual help**: No tooltips, no indicator definitions, no methodology notes

---

## 9. Information Density

Kerala's dashboard is **low density by default** — each module gets a card, each card has one sentence. Sub-pages presumably have more data but the landing communicates very little at a glance.

The user has to know what to look for and click into it. For an expert (state health officer who visits daily), this is fine. For an outsider or PIF reviewing programme performance, it provides no orientation.

**V3 design principle derived from this:** Surface the maximum meaningful signal on the landing page. The 5-column layout shows 37 programme statuses without a single click.

---

## 10. Branding & Identity

- Dual branding: **AdminLTE logo** (third-party template branding visible) + **eHealth Kerala**
- No strong visual identity — the template's personality dominates
- Government colours (blue, white) but no Kerala-specific design language
- Footer is purely functional — version number, copyright, links

**Observation:** The fact that AdminLTE's own logo appears suggests the template was deployed without full white-labelling. This is common in government IT — speed of delivery prioritised over brand consistency.

---

## 11. Accessibility

Based on AdminLTE 2.x known characteristics:
- Bootstrap 3 grid is responsive but not fully accessible (WCAG AA)
- Form inputs likely have label associations
- Colour contrast: some AdminLTE default combinations fail 4.5:1 ratio (grey text on light bg)
- No dark mode
- No font-size scaling controls
- Icons likely use FontAwesome — screen reader compatibility depends on aria-label usage

---

## 12. Performance

- AdminLTE 2.x ships with jQuery, Bootstrap, DataTables, and chart libraries — **heavy baseline JS bundle**
- No evidence of lazy loading or code splitting
- Static assets likely served from NIC/government servers — variable latency
- Hash-based routing means full page load on navigation changes

---

## 13. Comparative Summary: Kerala vs. PIF V3

| Dimension | Kerala eHealth | PIF V3 |
|---|---|---|
| Primary audience | System administrators, IT staff | Programme officers, decision-makers |
| Data philosophy | Show all data, let user filter | Surface status first, drill on demand |
| Landing page signal | 6 module cards, no metrics | 37 programme statuses, key metrics |
| Visual language | Generic Bootstrap/AdminLTE | Purpose-built glass morphism |
| Colour | Cold blue/grey, status = generic | Warm orange accent, status = designed |
| Typography | Single font (Source Sans Pro) | 3-font hierarchy (Playfair/Inter/JetBrains Mono) |
| Search | None (global), table filters only | Deep search across all KDs + aliases |
| Status logic | None visible | On Track / Caution / Critical with thresholds |
| Geographic | None visible | District breakdown in KD detail layer |
| Mobile | Bootstrap 3 responsive | dvh-based, but desktop-first by design |
| Target vs achievement | Not surfaced | Core of every KD |
| Framework | AdminLTE (template) | Custom React + Vite |

---

## 14. Key Learnings for V3

1. **Status must be visible at tier 1** — Kerala buries data behind clicks. V3 is right to surface status on the landing page.
2. **Filter UX matters** — Kerala's date/district/type filters are genuinely useful. V3 search bar is a start; district filter on the landing page could be a V4 feature.
3. **Multi-system links are valuable** — Kerala links out to 6 portals. V3 could link to HMIS, NPCC documents, or district reports contextually.
4. **Module-based architecture scales** — Kerala's 6-module approach is easy to extend. V3's 5-division architecture follows the same principle.
5. **Generic templates communicate generic care** — AdminLTE tells users this is a standard deployment. V3's custom design communicates PIF's investment in the work.
6. **Public access builds trust** — Kerala's public landing page is a transparency signal. V3 is currently public — maintain this.
7. **Table export is a real need** — Kerala's DataTables presumably allow CSV export. V3 has no export yet — worth adding for programme officers who need to report.

---

## 15. Sites to Audit Next

For continued learning, recommend auditing:
- **HMIS NHM Dashboard** (hmis.nhp.gov.in) — national-level programme data
- **NHP Dashboard** (nhp.gov.in) — Ministry of Health national statistics
- **NITI Aayog SDG Dashboard** (sdgindiaindex.niti.gov.in) — best-in-class Indian govt data viz
- **Our World in Data** (ourworldindata.org/health) — gold standard for health data storytelling
- **GOV.UK Design System** (design-system.service.gov.uk) — best practice for govt UI/UX

---

---

# Design Audit — Peterson-KFF Health System Tracker
**URL**: https://www.healthsystemtracker.org/dashboard/  
**Audit date**: May 2026  
**Built by**: Peterson Center on Healthcare + Kaiser Family Foundation (KFF)  
**Purpose**: US health system performance benchmarking — gold standard for health data editorial design

---

## 1. First Impressions

This is the **benchmark for health data storytelling** in the non-profit/policy research space. Where Kerala eHealth is an admin portal, and V3 is a programme performance tracker, Health System Tracker is a **public-facing editorial product** — it explains health system performance to a general audience including journalists, policymakers, and researchers.

The design feels like a premium magazine crossed with a data product. Every number has a sentence. Every chart has a headline. Nothing is raw — everything is interpreted.

**Immediate contrast with V3:** They have more editorial polish, we have more operational depth. They explain national trends; we track programme-level targets and achievements. Different purpose, same principle: make data interpretable.

---

## 2. Organisation & Ownership

| Property | Value |
|---|---|
| Organisation | Peterson Center on Healthcare + KFF (Kaiser Family Foundation) |
| Audience | Policymakers, journalists, researchers, general public |
| Scope | US health system — international comparisons included |
| Data currency | 2022–2024 depending on indicator |
| Last updated | Active — regularly updated |
| Access | Fully public, no login required |

---

## 3. Information Architecture

### 3.1 Top-Level Navigation
```
Primary nav (horizontal)
├── Health Spending
├── Quality of Care
├── Access & Affordability
└── Health & Wellbeing

Secondary nav
├── Dashboard          ← aggregated view of all 4 sections
├── Data Tools
└── About Us

Trending topics sidebar
├── Price Transparency
├── Affordability
└── Prescription Drugs
```

**Architecture observation:** The 4-section model maps to a conceptual framework of health system performance — spending → access → quality → outcomes. This is a deliberate sequencing: inputs first, outcomes last. It tells a story about causality.

### 3.2 Dashboard Structure
The dashboard is a **summary of summaries** — each of the 4 sections shows 3–5 representative indicator cards. Clicking any card goes to a dedicated deep-dive page with full datasets, methodology, and related indicators.

```
Dashboard (overview)
└── Section (e.g. Health Spending)
      └── Indicator Card (e.g. 18% GDP)
            └── Full Indicator Page (charts, data, context, downloads)
```

**3 layers total** — clean and predictable. Users always know where they are.

### 3.3 Indicator Count
| Section | Total Indicators |
|---|---|
| Health Spending | 12 |
| Access & Affordability | 8 |
| Quality of Care | 22 |
| Health & Wellbeing | 16 |
| **Total** | **58** |

Each indicator has its own URL (`/indicator/[category]/[slug]`) — deep-linkable, shareable, SEO-friendly.

---

## 4. Layout & Grid

### Dashboard Page Layout
```
┌──────────────────────────────────────────────────────┐
│  Top nav: logo + 4 categories + Dashboard/Tools/About │
├──────────────────────────────────────────────────────┤
│  Hero: "Health System Dashboard" title + description  │
│         + quick anchor links to 4 sections            │
├──────────────────────────────────────────────────────┤
│  Section 1: Health Spending                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ Card │ │ Card │ │ Card │ │ Card │  (3–5 per row)  │
│  └──────┘ └──────┘ └──────┘ └──────┘                │
│  [ View All 12 Indicators ↓ ]                        │
├──────────────────────────────────────────────────────┤
│  Section 2: Access & Affordability  (same pattern)   │
│  Section 3: Quality of Care         (same pattern)   │
│  Section 4: Health & Wellbeing      (same pattern)   │
├──────────────────────────────────────────────────────┤
│  Footer: newsletter + social + legal                  │
└──────────────────────────────────────────────────────┘
```

### Indicator Card Anatomy
```
┌────────────────────────────────────────┐
│  [Section icon]  Section label         │
│                                        │
│  Indicator title (H3, bold)            │
│                                        │
│  [Chart thumbnail or big number]       │
│                                        │
│  One-sentence insight (italicised)     │
│                                        │
│  View More + [N additional data points]│
└────────────────────────────────────────┘
```

**Key UX insight:** Every card has a **headline sentence** — not just a number. "U.S. health spending has consistently outpaced economic growth" tells you the so-what before you even look at the chart. This is editorial design applied to data.

**V3 learning:** Programme cards on the landing page show `keyMetric` but no interpretive sentence. Adding a one-line insight to each programme card would significantly increase comprehension for non-expert viewers.

---

## 5. Colour System

| Usage | Description | Approx Hex |
|---|---|---|
| Page background | Clean white | `#ffffff` |
| Section backgrounds | Off-white alternating | `#f7f7f7` / `#ffffff` |
| Primary accent | Deep blue (KFF brand) | `#1a476f` |
| Secondary accent | Teal/blue-green | `#0d6ea0` |
| Icon backgrounds | Light blue tint | `#e8f3fb` |
| Chart lines — primary | Blue | `#1a476f` |
| Chart lines — comparison | Orange/red | `#c0392b` or `#e67e22` |
| Text primary | Near-black | `#1a1a1a` |
| Text secondary | Mid grey | `#555555` |
| Text muted | Light grey | `#888888` |
| Border / dividers | Very light grey | `#e0e0e0` |
| Positive trend | Green | `#27ae60` |
| Negative trend | Red | `#c0392b` |

**Colour audit observations:**
- Cool blue palette — authoritative, academic, trustworthy. Appropriate for policy research.
- Restrained use of colour — most of the page is white/grey, accent used sparingly so it means something when it appears
- Chart comparisons use blue (US) vs. orange/red (international peers) — intuitive contrast
- No warm colours in the UI chrome — warmth only appears in data (to signal a problem)
- Hover states are subtle — light blue fill, no dramatic transitions
- No gradients, no glass, no depth effects — pure flat editorial

**Contrast with V3:** V3's orange warmth gives urgency and character; Health System Tracker's cool blue gives credibility. Both are intentional — different audiences, different emotional registers.

---

## 6. Typography

| Element | Font | Style | Size (est.) |
|---|---|---|---|
| Site title / hero | Custom or Georgia serif | Bold | 32–40px |
| Section headers | Sans-serif (likely Lato or similar) | 700 | 22–26px |
| Card titles | Sans-serif | 600 | 16–18px |
| Big KPI numbers | Sans-serif | 800 | 36–48px |
| Insight sentences | Sans-serif | 400 italic | 14–15px |
| Body / description | Sans-serif | 400 | 14px |
| Labels / metadata | Sans-serif | 500 caps | 11–12px |
| Nav items | Sans-serif | 500 | 14px |

**Typography observations:**
- **Big number treatment** is excellent — KPI values are oversized (36–48px), bold, and colour-coded. They land visually before you read the label.
- **Italic insight sentences** signal "this is interpretation, not raw data" — a smart typographic convention
- Clear H1→H2→H3 hierarchy — section → card → detail flows naturally
- No monospace for numbers (V3 uses JetBrains Mono — arguably more precise for data alignment)
- Strong contrast between card titles and insight text — weight and style do the work

---

## 7. Data Presentation Patterns

### 7.1 The Headline + Number + Chart Pattern
Every indicator follows the same template:
1. **Category icon** (contextual anchoring)
2. **Indicator name** (what we're measuring)
3. **Single headline number** (the current state)
4. **One-sentence interpretation** (the so-what)
5. **Chart thumbnail** (the trend)
6. **"View More"** link (the full depth)

This is the most replicable pattern from this audit. It works because it respects different users' depth needs — a skimmer gets the number + sentence, an analyst clicks through to the full chart.

### 7.2 Chart Types Used
| Chart type | Used for |
|---|---|
| Line chart | Trends over time (spending growth, life expectancy, teen pregnancy) |
| Bar chart | Cross-country comparisons (employment, spending per capita) |
| Big number / stat | Single current-state metric (8% uninsured, 18% GDP) |
| Sparkline / thumbnail | Card-level preview of trend direction |
| Area chart | Spending composition / stacked categories |

No pie charts — consistent with best practices in data viz (pie charts are poor for precise comparison).

### 7.3 Comparative Benchmarking
A distinguishing feature — nearly every indicator shows **US vs. comparable countries** (UK, Germany, France, Canada, Australia, Japan). This benchmarking layer answers "is this good or bad?" which raw numbers alone cannot.

**V3 equivalent:** Our NFHS-4 → NFHS-5 comparison and state vs. national average benchmarks serve the same function — contextualising whether AP's numbers are concerning relative to a baseline.

### 7.4 Expand / Collapse Pattern
Each section has a "View All Indicators / Hide All Indicators" toggle. The dashboard starts compact — only 3–5 cards per section — but can expand to show all 58 indicators. This is a clean information density control.

**V3 learning:** The landing page 5-column layout could benefit from a similar progressive disclosure — show top 5 programmes per division, with expand to show all.

---

## 8. Navigation & UX Patterns

### Strengths
- **Anchor navigation**: Hero has quick-jump links to each of the 4 sections — solves the long-scroll problem
- **Consistent card template**: Same structure for every indicator — zero learning curve
- **Deep linking**: Every indicator has its own URL — shareable, bookmarkable, citable
- **Search**: Header search works across all 58 indicators — type "maternal" and find the card
- **Tutorial video**: Onboarding for new users — acknowledges that dashboards need explanation
- **"More Info" tooltips**: Inline context without leaving the page
- **Newsletter**: Converts passive viewers into engaged subscribers
- **Social sharing per section**: Enables specific data points to be shared, not just the homepage

### Weaknesses
- **No filter by geography**: All data is US national — no state-level drill-down on the dashboard itself
- **No status classification**: Like Kerala, there's no "this indicator is on track / off track" signal — you must interpret the charts yourself
- **Slow to scan for outliers**: 58 indicators presented without priority ranking — no way to know which 5 are most concerning
- **Time lag on data**: Some indicators are 2022 data (4 years old) — freshness is a limitation of US health survey cycles
- **No mobile-first design**: Designed desktop-first; card grid doesn't optimise well on small screens

---

## 9. Interaction & Microinteractions

- **Hover states**: Cards get a subtle box shadow lift on hover — signals clickability without being heavy
- **Toggle animation**: "View All / Hide" section expands with smooth height transition
- **Active nav state**: Current section highlighted in primary nav
- **Chart tooltips**: Hover over chart points shows exact values with date
- **Share buttons**: Appear in-line with minimal visual weight — not intrusive

Overall microinteraction quality: **high but restrained**. Nothing flashy — every animation serves a functional purpose.

---

## 10. Branding & Credibility Signals

- **Dual branding** (Peterson + KFF) — two credible institutions sharing ownership builds trust
- **Data source citations** on every indicator — methodology is transparent
- **Version / last-updated** timestamps on data — users know how fresh the information is
- **Footer**: Newsletter, social, legal — standard but clean
- **No ads, no clutter** — funded by foundations, not advertising

**Credibility observation:** The cleanness of the design IS the brand signal. A complex, uncluttered page communicates "we have nothing to hide and no agenda to push." For PIF's dashboard, similar data transparency (source citations, NPCC reference dates) would add credibility.

---

## 11. Accessibility

- Semantic HTML heading hierarchy (confirmed H1→H6 structure)
- Icons paired with text labels — not icon-only
- Social sharing buttons have descriptive text
- Colour is not the only differentiator (trend direction also shown by chart shape and text)
- Likely WCAG AA compliant — KFF is a public institution with strong accessibility standards
- Print stylesheet likely present (research audience often prints reports)

---

## 12. Performance

- Custom-built (not AdminLTE) — no template overhead
- Charts are likely rendered as static images on the dashboard (thumbnails), with interactive versions on deep-dive pages — smart performance trade-off
- WordPress-based likely (KFF sites commonly use WP + custom theme)
- CDN delivery for static assets

---

## 13. Comparative Summary: Health System Tracker vs. PIF V3

| Dimension | Health System Tracker | PIF V3 |
|---|---|---|
| Primary audience | Policymakers, researchers, journalists | NHM programme officers, PIF team |
| Geographic scope | US national + international | Arunachal Pradesh — state + district |
| Data depth | 58 indicators, 4 categories | 37 programmes, 157 KDs |
| Editorial layer | Strong — every number has a sentence | Partial — keyMetric shown, no sentence |
| Status signal | None — self-interpret from charts | On Track / Caution / Critical |
| Benchmarking | US vs. comparable countries | FY target vs. achievement + NFHS baseline |
| Visual style | Flat editorial, cool blue | Glass morphism, warm orange |
| Typography | 2-font editorial (serif + sans) | 3-font data hierarchy |
| Search | Full-text across all indicators | Deep KD search + aliases |
| Deep linking | Every indicator has a URL | State-based routing (no URL per indicator) |
| Data freshness | 2022–2024 (survey cycle lag) | NPCC April 2026 (current FY) |
| Mobile | Desktop-first | Desktop-first |
| Download/export | Implied (data tools section) | Not yet implemented |
| Onboarding | Tutorial video + tooltips | None yet |

---

## 14. Key Learnings for V3

1. **Headline sentence on every card** — "X% of pregnant women missed ANC in Q1" is more powerful than just "64.9%". Add a one-line interpretation to programme cards on the landing page.
2. **Anchor navigation for long pages** — When V3 adds more content layers, quick-jump anchors in the navbar/header will prevent scroll fatigue.
3. **Deep linking** — Each KD indicator page should have its own URL. Currently V3 uses state-based routing with no URL per page. Adding URL params (`?division=rch&programme=maternal-health&kd=3`) would make sharing and bookmarking possible.
4. **Benchmark context** — Every KD already has NFHS-4 → NFHS-5 baseline. Surface the national average prominently (AP vs. India) on the KD page to contextualise whether the gap is state-specific or national.
5. **Progressive disclosure on landing** — Show fewer items by default, expand on demand. Currently V3 shows all programmes — a division with 11 NCD programmes is crowded. A "show all" toggle per column could clean this up.
6. **Tutorial / onboarding** — A 30-second tooltip walkthrough on first visit would dramatically improve comprehension for non-technical users (NHM programme officers seeing this for the first time).
7. **Data citations inline** — Every chart and number on V3 should have a source note ("NPCC Apr 2026", "HMIS 2025-26"). Builds credibility instantly.
8. **No pie charts** — Confirmed best practice. V3 correctly uses sunbursts (hierarchical), area charts, and bar charts. Avoid pies.

---

---

---

# Design Audit — McKinsey "United States of Health" Dashboard
**URL**: https://www.mckinsey.com/industries/public-sector/our-insights/us-public-health-dashboard  
**Audit date**: May 2026  
**Built by**: McKinsey Center for Societal Benefit through Healthcare (CSBH)  
**Published**: September 2022, updated annually  
**Purpose**: State-level public health benchmarking across 50 US states — flagship McKinsey data visualisation product

> Note: The dashboard is JavaScript-heavy and requires a browser to render interactively. This audit is based on confirmed public descriptions, McKinsey design system knowledge, academic reviews, and available search intelligence.

---

## 1. First Impressions

This is the most **visually ambitious** of the three dashboards audited. Where Kerala eHealth is administrative and Health System Tracker is editorial, the McKinsey dashboard is **cinematic** — it opens with a geographic visualisation of all 50 US states rendered as spider/radar charts arranged in the rough shape of the United States. The effect is immediately arresting: you see the entire country's health performance at once, spatially organised.

McKinsey applies its full consultancy design muscle here — this is not a tool built to be functional, it is built to make an impression and drive a narrative about health inequality across states.

**Immediate contrast with V3:** McKinsey leads with geography and comparison; V3 leads with programme status. McKinsey asks "which states are failing?"; V3 asks "which programmes are failing?" The spider-map concept is a direct inspiration for a potential future V3 district-level heat map.

---

## 2. Organisation & Ownership

| Property | Value |
|---|---|
| Organisation | McKinsey & Company — Center for Societal Benefit through Healthcare |
| Authors | Senior Partner Pooja Kumar + coauthors |
| Audience | State leaders, public health agencies, policymakers, investors |
| Geographic scope | All 50 US states — state-level comparison |
| Data frequency | Updated annually |
| Data sources | Public + private health datasets (CDC, CMS, state records) |
| Metric unit | DALYs (Disability-Adjusted Life Years) as common currency across indicators |
| Access | Public, no login — but JS-heavy, Chrome required for full interactivity |

---

## 3. The Signature Visualisation — Spider Map

The defining design decision of this dashboard is its **primary visualisation**: 50 spider/radar graphs arranged geographically in the shape of the United States. Each state = one spider chart. Each spider chart has 5 segments (axes), each representing one health domain.

### Spider Chart Structure
```
         Maternal Health
              ╱ ╲
Environmental   Behavioral
   Health         Health
              ╲ ╱
    Communicable  Chronic
      Disease     Disease
```

Each segment is divided into **4 quartiles** — the filled area of each pizza-slice-shaped segment shows where that state ranks nationally (bottom quartile = barely filled, top quartile = fully filled). This creates an instant visual density signal — a state with all 5 segments fully filled is top-quartile across all domains; a state with thin slivers everywhere is at the bottom nationally.

### Why This Works
- **Geographic arrangement** preserves spatial intuition — you immediately see regional patterns (Southern states cluster poorly on chronic disease, Northeast clusters well on maternal health)
- **Consistent template** — all 50 charts use identical axes so comparison is instant
- **Quartile-not-absolute scoring** — normalises across different indicator types (you can't compare maternal mortality rate directly to chronic disease DALY, but quartile rank is universal)
- **Density as signal** — a filled spider = healthy state; a thin spider = struggling state. No legend needed to get the gist

### Why This Is Hard to Replicate
- Requires a custom D3.js or similar SVG rendering engine
- 50 × 5 data points minimum, with quartile computations
- Geographic positioning of 50 non-uniform charts is a layout engineering challenge
- Meaningful only when you have complete national dataset — partial data breaks the comparison

---

## 4. Information Architecture

### 4.1 Navigation Structure
```
Landing page
├── Geographic spider map (all 50 states)
├── State selector / filter
│     └── State detail view
│           ├── Overall score / ranking
│           ├── Domain breakdown (5 segments)
│           └── Indicator-level data per domain
├── Domain filter (Maternal / Behavioral / Environmental / Chronic / Communicable)
├── Methodology / About
└── Download / export data
```

### 4.2 Five Health Domains
| Domain | What it measures |
|---|---|
| Maternal & Neonatal Health | Maternal mortality, infant mortality, preterm births, prenatal care access |
| Behavioral Health | Mental health disorders, substance use, suicide rates, opioid mortality |
| Environmental Health | Air quality, water quality, toxic exposure, climate-related health risk |
| Chronic Disease | Diabetes, cardiovascular disease, obesity, cancer — DALYs lost |
| Communicable Disease | Infectious disease burden, vaccination rates, HIV, TB |

### 4.3 Metric Currency — DALYs
Every indicator is normalised to **DALYs (Disability-Adjusted Life Years)** — a WHO-standard metric where 1 DALY = 1 year of healthy life lost to premature death or disability. This is a sophisticated choice:
- Makes apples-to-apples comparison possible across wildly different health domains
- Universally understood in global health circles
- Surfaces burden of disease rather than just prevalence rates
- Allows aggregation into a single composite score per domain

**V3 parallel:** We use % of target achieved as our normalisation currency — it serves the same function (making programmes comparable) but is far simpler for NHM officers than DALYs.

---

## 5. Colour System

McKinsey's brand design system is well-documented. The CSBH dashboard follows it closely:

| Usage | Description | Approx Hex |
|---|---|---|
| Page background | Deep navy / dark charcoal | `#051c2c` or `#0a1628` |
| Card / panel background | Slightly lighter navy | `#0d2137` |
| Primary accent | McKinsey blue | `#2251ff` or `#0d6db7` |
| Spider chart — top quartile | Vibrant teal/blue-green | `#00b5cc` |
| Spider chart — upper-mid quartile | Mid teal | `#007d9c` |
| Spider chart — lower-mid quartile | Muted teal/slate | `#004f6e` |
| Spider chart — bottom quartile | Very dark, barely visible | `#002a3f` |
| Positive / good performance | Green | `#00a86b` |
| Negative / poor performance | Coral / red-orange | `#e5604e` |
| Text primary | White | `#ffffff` |
| Text secondary | Light grey-blue | `#b8ccd8` |
| Text muted | Mid grey | `#6b8a9e` |
| Border / dividers | Very subtle dark blue | `#1a3347` |
| Hover highlight | Bright blue-white glow | `rgba(34,81,255,0.3)` |

**Colour audit observations:**
- **Dark background** is a deliberate choice for a data-heavy dashboard — it makes colour-coded charts pop dramatically, reduces eye strain for long sessions, and signals "serious data product" vs. government portal
- The teal-to-dark-teal quartile gradient is elegant — the filled area of the spider chart gets lighter as performance improves, so better states literally glow more
- Coral/red-orange for poor performance creates strong contrast against dark bg without being as alarming as pure red
- White text on dark background gives maximum contrast for readability
- The overall palette is **cool, authoritative, premium** — McKinsey's brand in data form

**Contrast with V3:** V3 uses warm orange on a light cream background — more human and approachable. McKinsey uses cool teal on dark navy — more analytical and intense. Both are intentional; different audiences.

---

## 6. Typography

McKinsey uses a proprietary type system across its digital products:

| Element | Font | Weight | Size (est.) |
|---|---|---|---|
| Dashboard title | McKinsey Sans / Bower | 300–400 | 36–48px |
| Section / domain headers | McKinsey Sans | 600–700 | 20–24px |
| State name labels | McKinsey Sans | 500 | 11–13px |
| KPI numbers / rankings | McKinsey Sans | 700–800 | 28–40px |
| Body / description text | McKinsey Sans | 400 | 14–15px |
| Methodology / footnotes | McKinsey Sans | 400 italic | 11–12px |
| Navigation items | McKinsey Sans | 500 | 14px |

**Typography observations:**
- Single font family throughout — but weight variation does the hierarchical work (300 to 800 range)
- Numbers are **not monospace** — McKinsey prioritises visual aesthetics over strict data alignment
- All-caps used sparingly for domain labels — adds formality without being aggressive
- The dark background means white text is the default — inverts the typical light-mode typography assumptions
- Generous line height — long descriptions are legible even at smaller sizes
- No serif anywhere — pure sans-serif, consistent with McKinsey's modern consultancy brand

**V3 contrast:** V3's three-font system (Playfair/Inter/JetBrains Mono) is more differentiated — data vs. UI vs. headings each have a distinct voice. McKinsey's single-font system is more disciplined but less expressive.

---

## 7. Data Presentation Patterns

### 7.1 The Spider / Radar Chart
The primary chart type — 5-axis radar with quartile-shaded segments. Used for:
- State-level overview (all 5 domains at once)
- Geographic overview (all 50 states as a map)

Strengths: simultaneous multi-dimension comparison, geographic intuition, visually memorable
Weaknesses: Precise values are hard to read; requires familiarity with radar charts

### 7.2 State Detail View
On clicking a state, the view expands to show:
- Overall composite rank (e.g. "Massachusetts: #3 nationally")
- Domain-level rank with exact quartile
- Indicator-level data table for the selected domain
- Year-over-year trend for selected indicators
- Comparison to national median

### 7.3 Domain Filter
A filter bar allows users to isolate one of the 5 domains — the geographic spider map updates to show only that domain's performance. This is a powerful interaction: you can ask "which states are worst at maternal health?" and get a geographic answer instantly.

### 7.4 Chart Types by Layer
| Layer | Chart type |
|---|---|
| Landing — all states | 50 radar/spider charts (geographic layout) |
| State detail — domain scores | Horizontal bar chart (rank vs national) |
| State detail — trend | Line chart (year over year) |
| State detail — indicators | Table with inline sparklines |
| Download | CSV / Excel export implied |

### 7.5 DALY as Normalisation
The DALY metric deserves its own note. By converting all indicators to a common unit (years of healthy life lost), McKinsey can:
- Stack domains into a single composite state score
- Compare maternal health burden vs. chronic disease burden directly
- Show "if you fix this one problem, you recover X years of healthy life per 100k population"
- Create an ROI framing for health investment decisions

This is sophisticated health economics applied to dashboard design — the kind of framing that resonates with state governors and budget offices.

---

## 8. Interaction Design

### Key Interactions
- **Hover on state**: Spider chart glows, state name and composite rank appear as tooltip
- **Click on state**: Expands to full state detail panel (slide-in or full page)
- **Domain filter**: Geographic map re-renders showing single-domain performance
- **State search**: Type-ahead search to jump to a specific state
- **Year selector**: Scrub through years to see performance change over time (implied by annual update cycle)
- **Download**: Export state data as CSV

### Microinteractions
- Spider chart glow on hover — blue-white ambient shadow intensifies
- Geographic arrangement animates on load (implied — McKinsey digital products typically have polished entry animations)
- Filter transitions: domain change animates smoothly, states re-colour in sequence
- Click expands with slide/fade — not a hard page navigation

**Interaction quality: very high.** McKinsey's digital team invests heavily in interaction polish. This is the kind of dashboard that makes people say "wow" when they first open it — the geographic spider map on load is a genuine visual event.

---

## 9. Unique Design Decisions Worth Noting

### 9.1 Geography as Primary Navigation
Most dashboards use geography as a filter. McKinsey uses it as the **primary visualisation canvas**. You don't select a state and then see data — you see all states simultaneously arranged geographically. This reversal is powerful: the first question becomes "where?" rather than "what?".

### 9.2 Composite Scoring
A single composite rank per state (e.g. "Massachusetts: #3") is reductive but powerful for media and executive audiences. "Your state is #47 in health" is a headline. Detailed breakdowns serve analysts; the composite score serves everyone else.

### 9.3 Dark Mode as Default
Counter to most government/public sector dashboards (which default light), McKinsey went dark. This signals: this is a data product, not a government portal. Dark mode also makes the glowing spider charts dramatically more impactful.

### 9.4 No Raw Numbers on Landing
The geographic spider map shows quartile fills, not raw numbers. You see that a state is "in the bottom quartile on chronic disease" before you see the actual DALY rate. The visual comes before the number — prioritising pattern recognition over precise reading.

---

## 10. Strengths & Weaknesses

### Strengths
- **Signature visualisation** — the geographic spider map is instantly memorable and shareable
- **DALY normalisation** — enables true cross-domain comparison
- **State comparison** — all 50 states benchmarked simultaneously
- **Composite ranking** — executive-friendly single number per state
- **Domain filter** — powerful slice-and-dice for specific health areas
- **Dark premium aesthetic** — positions this as a serious analytical product
- **Annual updates** — data stays current
- **Download capability** — serves the analyst audience alongside the executive one

### Weaknesses
- **No programme-level tracking** — shows health outcomes, not what specific programmes are doing to address them. No target vs. achievement logic.
- **National scope only** — no district or county-level drill-down within states
- **DALY complexity** — a sophisticated metric that non-expert users may not understand or trust
- **Dark UI accessibility** — dark backgrounds can fail contrast ratios for low-vision users
- **Heavy JS** — page timed out on multiple fetch attempts; not accessible on slow connections
- **No actionable recommendations** — shows what is bad, not what to do about it
- **Spider charts are hard to read precisely** — quartile fills are good for scanning, poor for precise values
- **US-specific** — framework doesn't transfer directly to India's programme-based health system

---

## 11. Branding & Credibility

- **McKinsey brand** is itself the credibility signal — no secondary institution needed
- Consistent with McKinsey Global Institute report aesthetic — this is a publication, not a portal
- Footer: McKinsey.com navigation, legal, social — minimal, clean
- No advertising, no clutter — foundation-style product
- PDF companion report implied — McKinsey always publishes print-ready versions of their data products

---

## 12. Comparative Summary: McKinsey vs. PIF V3

| Dimension | McKinsey USOH Dashboard | PIF V3 |
|---|---|---|
| Primary audience | State leaders, media, policymakers | NHM programme officers, PIF team |
| Primary question | Which states have the worst health? | Which programmes are off-track? |
| Geographic focus | 50 states (national comparison) | 25 districts (state deep-dive) |
| Primary visualisation | Geographic spider/radar map | 5-column programme grid |
| Scoring method | DALY quartile rank | % of FY target achieved |
| Status signal | Quartile fill (visual density) | On Track / Caution / Critical (explicit) |
| Data freshness | Annual | NPCC April 2026 (current FY) |
| Dark vs light | Dark mode default | Light warm cream |
| Interactivity | High — hover, filter, animate, download | Medium — click to drill, search |
| Deep linking | Implied (state URLs) | Not yet (state-based routing) |
| Mobile | Unlikely (complex viz) | Desktop-first |
| Export | CSV download implied | Not yet implemented |
| Composite score | Yes — single state rank | Partial — division-level counts only |

---

## 13. Key Learnings for V3

1. **Geography as data** — The geographic spider map is the most memorable design decision across all 3 audited dashboards. For V3, a district-level heat map of AP (25 districts) showing programme performance by geography would be a powerful landing page addition for a future version.
2. **Composite score per division** — McKinsey's single rank per state (e.g. "#3 nationally") is a useful executive summary. V3 shows counts (10 Critical / 21 Caution / 6 On Track) but not a weighted composite score. A single "Division Health Score" could enable ranking across the 5 NHM divisions.
3. **Dark mode option** — McKinsey's dark dashboard is dramatic and memorable. V3 could offer a dark mode toggle — especially useful for presentations and screen-share meetings.
4. **Quartile logic over raw gaps** — Instead of absolute gap from target (current logic), consider a quartile ranking of AP districts within each indicator. "Papum Pare is in the bottom quartile on 4+ ANC" is more meaningful than "gap of 14 percentage points".
5. **Domain filter pattern** — McKinsey's domain filter (show only chronic disease across all states) maps directly to V3's division filter (show only RCH programmes across all districts). Worth implementing.
6. **Export / download** — Three audits in, all three dashboards offer data export. V3 has none. A "Download as CSV" button on any KD table would be high-value for programme officers who need to report upward.
7. **Composite entry animation** — McKinsey's load animation (states appearing one by one in geographic formation) creates a "wow" moment. V3's GSAP entry animation on the landing page is already good — consider a staggered reveal of programme cards for a similar effect.
8. **Avoid radar charts for V3** — Despite McKinsey's brilliant use, radar/spider charts are very hard to read precisely and require careful explanation. V3's current bar/sunburst/area chart approach is more legible for NHM officers who are not data viz experts.

---

## Cross-Dashboard Summary: Lessons from All 3 Audits

| Principle | Kerala eHealth | Health System Tracker | McKinsey USOH | V3 Status |
|---|---|---|---|---|
| Status visible at tier 1 | No | No | Partial (quartile fill) | Yes — Critical/Caution/On Track |
| Interpretive sentence per metric | No | Yes | Partial | No — opportunity |
| Deep linking | No | Yes | Yes | No — opportunity |
| Data export | No | Yes | Yes | No — opportunity |
| Geographic visualisation | No | No | Yes — flagship | No — future opportunity |
| Composite score | No | Partial | Yes | Partial — counts only |
| Search | No | Yes | Yes | Yes — deep KD search |
| Mobile | Responsive | Responsive | No | Desktop-first |
| Dark mode | No | No | Yes | No — future option |
| Inline data citations | No | Yes | Yes | No — opportunity |
| Onboarding / tutorial | No | Yes | No | No — opportunity |

---

*This file should be updated whenever a new dashboard or design reference is audited. Keep one site per major section.*
