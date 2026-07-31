# GHG Calculator — KPN Downstream Sustainability

Web application for calculating greenhouse gas (GHG) emissions across the palm-oil downstream chain: refinery processing (**Ep**), biodiesel, transport & distribution (**ETD**), GHG savings vs fossil reference, ISCC/INS traceability, and monthly raw operational data.

Built for **KPN Downstream Sustainability**. Methodology aligns with **ISCC / EU Directive 2018/2001 (RED II)**, **RED III** (ETD exports), **EU 2022/996**, and Indonesian **IR 996/2022** emission factors.

---

## Table of contents

1. [Modules](#modules)
2. [Quick start](#quick-start)
3. [Formulas](#formulas)
4. [Emission factors & constants](#emission-factors--constants)
5. [Google Sheets / Apps Script](#google-sheets--apps-script)
6. [Project structure](#project-structure)
7. [Regulatory references](#regulatory-references)
8. [Notes for developers](#notes-for-developers)

---

## Modules

| Module | Purpose |
|--------|---------|
| **ETD** | Transport & distribution emissions (trucking / vessel) for RPOME routes |
| **Refinery — GHG (POME)** | Processing emissions (fuel, chemicals, electricity, water) → Ep kg CO₂eq/dry-ton |
| **Biodiesel — GHG** | Refinery features + methanol / sodium methylate / citric acid → Ep g CO₂eq/MJ PME |
| **GHG Savings Biodiesel** | Chain FoB → import; % savings vs 94 g CO₂eq/MJ fossil reference |
| **Traceability Export Shipment** | Supplier distances, BL data, farthest-distance pick, push to ETD |
| **Raw Data — CPO Calculation** | Monthly input grid per EUP site (no GHG math in-app) |
| **GGL — Shell (Cangkang)** | Combined processing (bio solar + electricity) + ETD for shell |

---

## Quick start

App source lives in **`ghg - calculator (final)/`**.

```bash
cd "ghg - calculator (final)"
npm install
npm run dev
```

Open **http://localhost:3000/**

| Script | Description |
|--------|-------------|
| `npm run dev` / `npm start` | Sync modules + Vite dev server (port 3000) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run sync:modules` | Copy `src/modules/` → `public/modules/` |

Optional: copy `.env.example` → `.env` and set `VITE_HUB_PORTAL_URL` for the Hub Portal link.

**Tech stack:** Vite 6 · Vanilla JS/CSS · SheetJS / jsPDF / html2pdf (CDN) · Google Apps Script → Sheets

---

## Formulas

**Unit conventions**

| Domain | Typical unit |
|--------|----------------|
| Processing Ep | kg CO₂eq (absolute), kg CO₂eq/**dry-ton** (intensity) |
| ETD | kg CO₂eq/**dry-ton** |
| GHG Savings | kg CO₂eq/dry-ton ↔ **g CO₂eq/MJ** via LHV PME **37 MJ/kg** |
| Mass inputs | MT (metric tons); dry mass computed from moisture |

---

### 1. Refinery / Biodiesel — Processing (Ep)

#### A. Dry mass

For feedstock and each product stream:

```
dry (MT) = wet (MT) − wet (MT) × MC (%) / 100
```

Default moisture: POME **1.1%**, RPOME **0.05%**, POME FAD **0.33%**.

#### B. Allocation Factor (AF) — energy-based co-product split

| Stream | LHV (MJ/kg) |
|--------|-------------|
| POME feedstock / RPOME / PME | 37 |
| POME FAD (refinery) | 37 |
| Crude Glycerine — biodiesel stream 2 | **16** (IR 996/2022) |

```
totalE (MJ) = m₁_dry(kg) × LHV₁ + m₂_dry(kg) × LHV₂

AF₁ = (m₁_dry × LHV₁) / totalE
AF₂ = (m₂_dry × LHV₂) / totalE
```

#### C. Feedstock Factor (FF) — IR 996/2022

```
FF₁ = (m_feed_dry × 37) / (m₁_dry × LHV₁)
FF₂ = (m_feed_dry × 37) / (m₂_dry × LHV₂)
```

#### D. Per-source emission

```
Eᵢ (kg CO₂eq) = Qᵢ × EFᵢ
```

`Qᵢ` = consumed quantity (item UoM), `EFᵢ` = emission factor (see [§ Emission factors](#emission-factors--constants)).

#### E. Totals

```
E_fuel  = E_coal + E_biosolar + E_LNG
E_chem  = Σ chemicals   (+ methanol + sodium methylate + citric acid in biodiesel)
E_total = E_fuel + E_chem + E_elec + E_water
```

#### F. Ep intensity (kg CO₂eq/dry-ton)

```
Ep₁        = E_total / m₁_dry(MT)
Ep₂        = E_total / m₂_dry(MT)
Ep₁_alloc  = Ep₁ × AF₁
Ep₂_alloc  = Ep₂ × AF₂
```

#### G. Biodiesel only — Ep (g CO₂eq/MJ PME)

```
Ep_MJ = (E_total × AF₁ × 1000) / (m₁_dry(kg) × 37)

# equivalent:
Ep_MJ = Ep₁_alloc (kg/dry-t) / 37
```

---

### 2. GGL — Cangkang Processing + ETD

#### Processing

Default contract moisture **20%**:

```
m_dry = m_wet × (1 − MC/100)

E_biosolar = V_Liter × 0.815 × 0.7 × EF_biosolar
E_elec     = kWh × 0.94
E_total    = E_biosolar + E_elec
Ep         = E_total / m_dry(MT)
```

GGL mode uses **AF = 1**, **FF = 1** (single product).

#### ETD GGL (per leg: truck, vessel1, vessel2)

```
ETD_leg = d_km × η × EF_B40 × Mm
N       = ETD_truck + ETD_vessel1 + ETD_vessel2
FOB     = Ep + N
```

| Symbol | Value |
|--------|-------|
| η_truck | 0.87 |
| η_vessel | 0.07 |
| EF_B40 | 0.057 |
| Mm | 1.25 |

---

### 3. ETD — RPOME (standard)

**Methodology label (exports):** RED III · Unit: **kg CO₂eq/dry-ton**

#### Step 1 — Raw transport legs

**Trucking EF by destination**

| Destination | EF |
|-------------|-----|
| LBG, TJP, BTG | EF_B40 |
| TPG, GLM | EF_B10 |

```
ETD_truck_raw = d_truck × η_truck × EF_truck × Mm_POME
```

**Vessel EF by destination**

| Destination | EF |
|-------------|-----|
| LBG, TJP, BTG | EF_B40 |
| TPG, GLM | EF_HFO |

```
ETD_vessel_raw = d_vessel × η_vessel × EF_vessel × Mm_POME
ETD_raw_total  = ETD_truck_raw + ETD_vessel1_raw + ETD_vessel2_raw
```

#### Step 2 — Convert to product ETD (**N**)

**Default (LBG, TJP, most routes)**

```
N = ETD_raw_total × FF_dest × AF_dest × Mm_RPOME
```

`Mm_RPOME = 1.000300090027008`

**TPG (standard RPOME, not biodiesel export)**

```
N = ETD_raw_total × FF_TPG × AF_TPG
```

(no `Mm_RPOME` multiplier)

**GLM**

```
N = ETD_raw_total × FF_GLM × AF_GLM × Mm_RPOME + L21 + L22
```

`L21 = 0.7312246559398706`, `L22 = 0.7206886344194471`

**BTG — Bulking (truck + vessel1 + vessel2)**

```
N = ETD_truck_raw  × FF_BTG × AF_BTG × Mm_RPOME
  + ETD_vessel1_raw × FF_LBG × AF_LBG
  + ETD_vessel2_raw × FF_BTG × AF_BTG
```

**TPG — Biodiesel export (vessel only)**

```
ETD_vessel = d × η_vessel_export × EF_HFO × Mm_Biodiesel × FF_Biodiesel × AF_Biodiesel
N          = Σ ETD_vessel_legs
```

#### Step 3 — FOB totals

| Symbol | Meaning | Formula |
|--------|---------|---------|
| **Ep** | Refinery processing at destination | Site constant (Sheets / defaults) |
| **N** | ETD FOB primary destination | See Step 2 |
| **R** | Total FOB primary | `R = Ep + N` |
| **O** | ETD FOB Tanjung Langsat (TPG) | `O = N + C₂₅/₃₃/₄₁` (or `N` if dest = TPG) |
| **S** | Total FOB Tj. Langsat | `S = Ep + O` |
| **P** | ETD FOB Port Klang (GLM) | `P = N + C₂₆/₃₄/₄₂` (or `N` if dest = GLM) |
| **T** | Total FOB Port Klang | `T = Ep + P` |

Inter-refinery vessel add-ons `C₂₅`–`C₄₂` are listed under [constants](#44-etd-inter-refinery-vessel-constants).

---

### 4. GHG Savings Biodiesel

**Basis:** EU Directive **2018/2001** · ISCC EU thresholds · Depot EFs per **EU 2022/996** (JRC)

#### Unit conversion (LHV PME = 37 MJ/kg)

```
g CO₂eq/MJ          = (kg CO₂eq/dry-ton) / 37
kg CO₂eq/dry-ton    = (g CO₂eq/MJ) × 37
```

#### Components

| Input | Role |
|-------|------|
| Ep_ref | Ep Refinery (POME processing) |
| ETD₁ | Etd FOB trucking to loading port |
| ETD_vessel | Etd FOB vessel to loading port |
| Ep_BD | Ep Biodiesel (PME production) |
| Vessel₂ | Vessel FOB → import (**discharge only**) |
| Depot | Country depot + filling (g/MJ) |

#### Calculation chain

```
# Informational dry-ton total (Ep + Etd only)
Total_dry = Ep_ref_dry + ETD₁_dry + ETD_vessel_dry + Ep_BD_dry

# FoB (g CO₂eq/MJ)
GHG_FOB = Ep_ref_MJ + ETD₁_MJ + ETD_vessel_MJ + Ep_BD_MJ

# Saving FoB (%)
Saving_FOB = (94 − GHG_FOB) / 94 × 100

# Discharge total (g CO₂eq/MJ) — Vessel₂ & Depot NOT in FoB
GHG_discharge = GHG_FOB + Vessel₂_MJ + Depot

# Saving discharge (%)
Saving_discharge = (94 − GHG_discharge) / 94 × 100
```

**Fossil reference:** **94 g CO₂eq/MJ**

#### ISCC EU thresholds

| Saving % | Status |
|----------|--------|
| ≥ 65% | ISCC EU Pass |
| ≥ 50% | Minimum Pass |
| < 50% | Below Threshold |

---

### 5. Traceability Export Shipment

No standalone GHG formulas. Workflow:

1. Load supplier distances from Sheets (`TES Data`)
2. Select suppliers; optionally auto-pick **farthest trucking** / **farthest vessel**
3. Enter BL metadata (date, vessel, ISCC/INS, SD code, loading port)
4. Save → populate ETD → `etdCalculate()` → sync Sheets → can feed GHG Savings ETD field

---

### 6. Raw Data — CPO Calculation

**No GHG formulas in-app.** Structured monthly grid (materials, fuels, chemicals, moisture) with allocation codes RF / FR / BD. Persisted to Sheets tab **Raw Data** for external / workbook use.

Row total per line:

```
Total = Σ months valueₘ
```

---

## Emission factors & constants

### Processing EF (`EF_BASE`)

All values **kg CO₂eq per unit** unless noted.

| Key | EF | Unit | Reference |
|-----|-----|------|-----------|
| coal | 2.97595 | kg | IR 996/2022 |
| biosolar | 0.56265 | kg | SK Dirjen Migas 0234.K/2019 · Ecoinvent 3.7 |
| lng | 0.075 | m³ | Ecoinvent 3.9.1 |
| na2co3 | 1.2451 (refinery) / **1.190228** (biodiesel) | kg | IR 996/2022 / EU Commission |
| na2so3 | 0.47 | kg | Winnipeg WSTP |
| pac | 0.6 | kg | Winnipeg WSTP |
| naoh | 0.5297 | kg | IR 996/2022 |
| cyclohex | 0.723 | kg | IR 996/2022 |
| nhex | 3.631209036 | kg | IR 996/2022 |
| ipa | 3.84 | kg | Winnipeg WSTP |
| hcl | 1.0611 | kg | IR 996/2022 |
| be | 0.1998 | kg | IR 996/2022 |
| h3po4 | 3.1247 | kg | IR 996/2022 |
| elec | 1.1202 | kWh | Ecoinvent 3.9.1 (ID grid) |
| water | 0.00124 | kg | Ecoinvent 3.9.1 |
| solar | 0.054 | kWh | Ecoinvent 3.9.1 (PV) |
| methanol | 1.93 | kg | IR 996/2022 |
| sodium_methylate | 2.2077 | kg | IR 996/2022 |
| citric_acid | 0.87 | kg | Ecoinvent v3.10 |

Overridable from Sheets tab **EF_MASTER** (`action=getEfMaster`).

### LHV

| Product | LHV (MJ/kg) |
|---------|-------------|
| POME / RPOME / POME FAD / PME / Cangkang (label) | 37 |
| Crude Glycerine (biodiesel stream 2) | **16** |

### GHG Savings

| Constant | Value |
|----------|-------|
| Fossil reference `GS_REF_FF` | **94 g CO₂eq/MJ** |
| LHV PME `GS_LHV` | **37 MJ/kg** |
| Energy per dry-ton PME | 37,000 MJ |

**Depot + filling (g CO₂eq/MJ)** — JRC / EU 2022/996:

| Country | Depot |
|---------|-------|
| France | 0.11 |
| Sweden | 0.02 |
| Austria | 0.09 |
| Belgium | 0.18 |
| Spain | 0.23 |
| Italy | 0.34 |
| Germany | 0.43 |
| Netherlands | 0.52 |
| Poland | 0.82 |
| EU-27 avg | 0.34 |

### ETD global factors

| Symbol | Value | Notes |
|--------|-------|-------|
| η_truck | 0.87 | |
| η_vessel | 0.12 | |
| η_vessel_export | 0.10 | TPG biodiesel export |
| EF_B10 | 0.08559 | 95.1/1000 × 0.9 |
| EF_B40 | 0.05706 | 95.1/1000 × 0.6 |
| EF_HFO | 0.0942 | 94.2/1000 |
| EF_Diesel | 0.0951 | |
| Mm_POME | 1.015228 | |
| Mm_RPOME | 1.000300090027008 | |
| Mm_Biodiesel | 0.5 | Export mode |
| FF_Biodiesel | 0.97084002153713655 | |
| AF_Biodiesel | 1.0557176687628049 | |

### ETD site Ep / FF / AF (defaults)

| Code | Site | Ep | FF | AF |
|------|------|-----|-----|-----|
| LBG | PMC Lubuk Gaung | 15.510656 | 1.333733 | 0.765306 |
| TJP | EUP Tanjung Pura | 29.96436 | 1.18124 | 0.84663 |
| BTG | EUP Bontang | 36.10316 | 1.05074 | 0.94161 |
| TPG | TPG Tanjung Langsat | 57.61433 | 1.68187 | 0.64361 |
| GLM | GLM Port Klang | 61.53894 | 1.24827 | 0.80717 |

Overridable via Sheets **ETD Factors**.

### ETD inter-refinery vessel constants

| Constant | Value (kg CO₂eq/dry-t) | Route |
|----------|------------------------|-------|
| C25 | 2.726542 | LBG → TPG |
| C33 | 2.676693 | TJP → TPG |
| C41 | 14.495074 | BTG → TPG |
| C26 | 1.628934 | LBG → GLM |
| C34 | 6.685362 | TJP → GLM |
| C42 | 17.090499 | BTG → GLM |

### GGL ETD destination Ep (reference)

| Code | Site | Ep (kg CO₂eq/dry-ton) |
|------|------|------------------------|
| PLM | EUP Palembang | 0.583894 |
| BTG | EUP Bontang | 3.081700 |
| KUM | EUP Kumai | 0.244150 |
| LBG | EUP Lubuk Gaung | 0.915715 |

---

## Google Sheets / Apps Script

Backend: `apps-script/Code.gs` — deploy as **Web App**, spreadsheet-bound.

Auth: `token` query/body must match `APPS_TOKEN` (client) / `SECRET_TOKEN` (script).

> **Note:** URL and token are currently hardcoded in `src/modules/refinery-calc/app.js`. Treat as sensitive for production hardening.

### Spreadsheet tabs

| Sheet | Purpose |
|-------|---------|
| GHG Log | Refinery / biodiesel / GGL Ep results |
| ETD Log | ETD calculation records |
| GHG Savings Log | GHG Savings results |
| GHG Savings Datacenter | Preloaded Ep / ETD by site & year |
| EF_MASTER | Editable emission factors |
| ETD Factors | Per-site ETD constants |
| TES Data | Traceability supplier DB |
| Raw Data Sites | EUP site registry |
| Raw Data | Monthly CPO payloads |

### API (summary)

**GET** `?token=…&action=…`

| action | Returns |
|--------|---------|
| *(default)* | GHG Log rows |
| `getEfMaster` | EF master |
| `getEtdFactors` | ETD factors (optional `siteCode`) |
| `getEtdLog` | ETD log |
| `getGhgSavingsLog` | GHG Savings log |
| `getGhgSavingsDatacenter` | Datacenter autofill |
| `getSuppliers` | Traceability suppliers |
| `getRawDataSites` / `getRawData` | Raw Data |

**POST** JSON + `token`: save GHG / ETD / GHG Savings logs, update EF master, save ETD factors, save Raw Data, etc.

One-time setup in Apps Script editor: `setupEtdFactorsSheet()`, `setupRawDataSheets()`.

---

## Project structure

```
ghg - calculator (final)/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── apps-script/Code.gs          # Google Sheets backend
├── scripts/
│   ├── sync-modules.mjs         # src/modules → public/modules
│   └── html-views-to-js.mjs
├── public/modules/              # Runtime calculator scripts (synced)
└── src/
    ├── main.js
    ├── styles/main.css
    ├── app/                     # mount views, load scripts, hub portal
    ├── views/                   # UI templates
    └── modules/                 # Source of calculator logic  ← edit here
        ├── shared/pdf-export.js
        ├── refinery-calc/
        ├── ghg-savings/
        ├── etd/
        ├── traceability/
        └── raw-data/
```

**Important:** edit `src/modules/` — `npm run dev` / `build` always syncs to `public/modules/`. Do not edit `public/modules/` by hand.

---

## Regulatory references

| Reference | Where used |
|-----------|------------|
| **EU 2018/2001 (RED II)** | GHG Savings; fossil 94 g CO₂eq/MJ |
| **RED III** | ETD export metadata |
| **EU 2022/996** | Depot & filling / JRC electricity table |
| **IR 996/2022 (Indonesia)** | Default EFs; AF/FF methodology |
| **ISCC EU** | Savings thresholds ≥65% / ≥50% |
| **ISCC / INS** | Traceability certification; Ep headers |
| **SK Dirjen Migas 0234.K/2019 · Ecoinvent** | Biosolar EF |
| **Ecoinvent 3.9.1 / 3.10** | Electricity, water, solar, citric acid |

---

## Notes for developers

1. **Dual ETD surfaces** — standalone ETD app and embedded ETD inside Refinery / GGL share `etd/index.js`.
2. **Offline / Sheets down** — calculators still run with local EF defaults; history/datacenter sync fails with toast (`ERR_CONNECTION_RESET` to `script.google.com` is a network/deploy issue, not a UI bug).
3. **Raw Data** is input-only; document separately from Ep / ETD / Savings math.
4. **Repo also contains** `gate/` (hub gate app) — this README covers the GHG Calculator package only.

---

*Formulas and constants above are taken from the application source (`src/modules/`, `src/views/`, `apps-script/Code.gs`). If code and this document diverge, **code is the source of truth** — please update this README when methodology changes.*
