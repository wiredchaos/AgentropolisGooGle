# GeoLibre Migration Plan for AgentropolisGooGle

## Signal

Google Earth Pro for desktop remains useful today, but Google has announced that the desktop app will no longer be available for download beginning June 25, 2027.

Official source: https://www.google.com/earth/about/versions/

GeoLibre is a free, open-source GIS platform that runs across web, desktop, mobile, and Jupyter notebook surfaces while keeping local data private by default.

Project source: https://github.com/opengeos/GeoLibre
Docs: https://geolibre.app/

## Decision

Adopt GeoLibre as the preferred open-source geospatial evaluation lane for AgentropolisGooGle.

This does not immediately remove Google integrations. It creates a parallel, sovereign GIS lane so AGENTROPOLIS can support:

- local-first map exploration
- GIS file ingestion
- browser-based geospatial workflows
- desktop GIS continuity after Google Earth Pro download retirement
- AI-assisted map analysis without hard-locking to one vendor

## Why GeoLibre fits

GeoLibre supports the exact surface pattern AGENTROPOLIS needs:

- browser runtime for public and lightweight workflows
- desktop runtime for heavier local work
- mobile responsive surfaces
- Jupyter notebook workflows for analysis
- local data handling by default
- MapLibre-based rendering
- DuckDB Spatial SQL support
- KML/KMZ, GeoJSON, Shapefile, GeoPackage, GeoParquet, GeoTIFF, PMTiles, 3D Tiles, LiDAR, and related GIS formats

## AgentropolisGooGle role

AgentropolisGooGle becomes the transition and compatibility district for Earth-style workflows:

1. Inventory Google Earth Pro style usage.
2. Define migration recipes for KML/KMZ and saved project layers.
3. Build agent prompts that translate user map intent into GeoLibre operations.
4. Preserve Google AI / Gemini based reasoning where useful, but keep map data portable.
5. Track which workflows still require Google Earth, Google Maps, Earth Engine, or Street View.

## Proposed architecture

```text
User map request
  -> AgentropolisGooGle backend
  -> intent classifier
  -> route:
       Google lane     = Gemini / Google APIs / search / legacy workflows
       GeoLibre lane   = local files / MapLibre / DuckDB Spatial / open GIS
       Hybrid lane     = Google-sourced context + GeoLibre local visualization
  -> auditable response
```

## Near-term backlog

### Phase 1: Documentation

- [x] Add this migration plan.
- [ ] Add KML/KMZ import notes.
- [ ] Add Earth Pro feature parity matrix.
- [ ] Add user-facing install commands for Windows, macOS, and Linux.

### Phase 2: Backend contract

- [ ] Add a `geo` service namespace under `google-backend/src/services/`.
- [ ] Add safe request validation for GIS operations.
- [ ] Add route-level docs for map intent parsing.
- [ ] Do not upload private user map files to third-party services by default.

### Phase 3: AGENTROPOLIS integration

- [ ] Register GeoLibre as an open GIS capability in the city stack.
- [ ] Add HERMES CITY use cases.
- [ ] Add district map overlays.
- [ ] Add story-map export workflows for 33.3FM, CLEAR, BWB, and 789 Studios.

## Safety and privacy rules

- Never assume user geospatial files are public.
- Never upload local KML/KMZ, GeoPackage, shapefile, LiDAR, or GeoTIFF assets to a cloud service without explicit user approval.
- Keep sensitive locations generalized in public demos.
- Prefer local parsing and local visualization whenever possible.
- Clearly label Google-dependent workflows versus open-source/local-first workflows.

## Agent prompt contract

When a user asks for Earth-style map work, the agent should answer with:

1. The intended workflow.
2. Whether Google Earth Pro, Google Earth web, GeoLibre, or a hybrid path is best.
3. Required files or URLs.
4. Privacy risk level.
5. Export target: KML, KMZ, GeoJSON, GeoPackage, PDF, PNG, HTML story map, or project file.

## Canon line

GeoLibre is the sovereign GIS rail. Google remains a compatibility lane, not the city map throne.
