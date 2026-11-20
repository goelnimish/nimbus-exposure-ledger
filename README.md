# Nimbus Exposure Ledger (v1)

A standalone, board-ready **Physical Climate Risk Financial Exposure** web application built for, Head of Sustainability at **Nimbus Cement Ltd** (a fictional listed Indian cement manufacturer with 9 plants).

> **Core Question Answered:** *"What is Nimbus Cement's business exposure to climate events today (FY 2025-26) and by 2040?"*

## Why This Product Exists
Most physical climate tools plot isolated pins on a map and output opaque hazard scores. Profiling `nimbus_cement_plants.csv` reveals that **Nimbus's climate risk is a supply-chain network problem**:
- Two integrated kilns (**P01 Chittorgarh** and **P06 Baloda Bazar**) supply 100% of clinker for all three grinding units (**P07 Mundra**, **P08 Paradip**, **P09 Durgapur**), concentrating **₹5,032 cr (52.1% of revenue)** inside two chains.
- Grinding units generate **20.8% of revenue** on just **10.4% of gross block**, meaning asset-only risk views understate their commercial exposure by half.
- **P07 Mundra** sits in an Extremely High water-stress basin (Kutch) but uses desalinated seawater, requiring a freshwater decoupling rule rather than a naive basin flag.

## Key Features
1. **Overview (Answer in 60 Seconds):** Deterministic headline template (zero runtime LLM), 5 per-hazard exposure tiles with ensemble min–max ranges, interactive India facility & clinker flow map, horizon trajectory chart (`Today → 2030 → 2040 → 2050`), Investor disclosure matrix, and an explicit *"What this does not cover"* scope box.
2. **Plants Ranking (9 Facilities):** Full hazard comparison table with Revenue vs. Gross Block rank-flip callout.
3. **Plant Detail Dossier:** Site-level physical metrics in real units (`days ≥40°C` & `≥45°C`, `Rx1day mm` & `≥64.5 mm`, Aqueduct `0–5`, GloFAS `Q25 m³/s`, IBTrACS `storms/decade`), SSP scenario charts, and upstream/downstream clinker dependencies.
4. **Clinker Chain & Outage What-If:** Visual flow diagram for both chains plus a decoupled kiln outage simulator (`Revenue in play = (Revenue_i / 365) × max(0, D − B) × (1 − R)`), labelled `Assumption` and never auto-filled from hazard ratings.
5. **Method & Audit:** Data sources with versions, grid resolution, and retrieval timestamps, Union Rule calculation trace, Assumptions Register (`A1–A11`), and one-click Audit CSV export.
6. **One-Page Board Brief:** Print-optimized A4 executive brief (`@media print`) with Run ID, Method Version, Scope Banner, top 3 exposed plants, and clinker chain callout.
7. **Challenge Mode & 2-Click Audit Trace:** Slide-over auditor drawer with live rating threshold sliders and a 6-alternative stability badge (*"Headline holds under X of 6 alternatives"*). Clicking any provenance chip (`Real`, `Modelled`, `Assumption`) opens a 2-click calculation trace modal.

## Data Sources & Provenance (`0` Illustrative Numbers)
All climate data is fetched at build time into `src/data/results.json` and `src/data/provenance.json` (zero runtime API calls or rate-limit failures):
- **Facility Data:** `nimbus_cement_plants.csv` (FY 2025-26, unmodified).
- **Observed Baseline (2005–2024):** [Open-Meteo Historical Weather API (ERA5)](https://open-meteo.com/en/docs/historical-weather-api) — direct pull for all 9 plants.
- **Future Projections (2030, 2040, 2050):** [Open-Meteo Climate API (CMIP6 HighResMIP)](https://open-meteo.com/en/docs/climate-api) — direct 4-model ensemble pull (`EC_Earth3P_HR`, `MRI_AGCM3_2_S`, `MPI_ESM1_2_XR`, `CMCC_CM2_VHR4`) for all 9 plants, bias-corrected via delta-change and scaled across SSP1-2.6 / SSP2-4.5 / SSP5-8.5 using IPCC AR6 South Asia warming ratios (Assumption `A11`).
- **Riverine Flood (1984–2024):** [Open-Meteo Flood API (GloFAS v4)](https://open-meteo.com/en/docs/flood-api) — direct pull for river/canal plants (`P03`, `P06`, `P09`).
- **Coastal Storms (1980–2024):** [NOAA IBTrACS v04r01](https://www.ncei.noaa.gov/products/international-best-track-archive) — exact storm counts within 200 km (`P07`: 5.3/decade; `P08`: 22.4/decade).
- **Water Stress:** [WRI Aqueduct 4.0](https://www.wri.org/aqueduct) HydroBASINS Level 6 scores with 2040 linearly interpolated between 2030 and 2050 (`Assumption A5`).

## Tech Stack
- **Next.js 15 (App Router)** + **TypeScript** + **Tailwind CSS** + **Recharts** + **Lucide React**
- Static prerendered output — deploys to **Vercel** with zero login and zero environment variables.


## Golden Test Benchmarks
- **Group totals:** `23.0 MTPA` capacity · `18.35 Mt` output · `₹15,450 cr` gross block · `₹9,658 cr` revenue · `4,550` people · `10,932 kt` Scope 1 CO₂
- **Grinding units (`P07–P09`):** `21.0%` output · `20.8%` revenue · `10.4%` gross block · `12.3%` people
- **Clinker chains:** `P01+P07` = `₹2,597 cr` (`26.9%`) · `P06+P08+P09` = `₹2,435 cr` (`25.2%`) · Combined = `₹5,032 cr` (`52.1%`)
- **30-day unbuffered outage (`D=30, B=0, R=0%`):** `₹213.5 cr` (P01 chain) · `₹200.1 cr` (P06 chain)
- **Union rule:** Each facility counted once per hazard and once in the headline union.
