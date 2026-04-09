# IOsense API Tracking — image-event-config

## Widget: ImageEvent / ImageEventConfiguration

---

## API Calls

### Authentication

| Function | Method | URL | Notes |
|----------|--------|-----|-------|
| `validateSSOToken` | GET | `/api/retrieve-sso-token/{ssoToken}` | Dev-only SSO validation. Stores token + org in localStorage. |

---

### Devices

| Function | Method | URL | functionId | Notes |
|----------|--------|-----|-----------|-------|
| `findUserDevices` | PUT | `/api/account/devices/{page}/{limit}` | `findUserDevices` | Paginated device list. **Response nested at `response.data.data`** (double `.data`). Used in config panel AutocompleteInput with 300ms debounce. |
| `getLastDP` | PUT | `/api/account/deviceData/getLastDPsofDevicesAndSensorProcessed` | `getLastDPsofDevicesAndSensorCalibrated` | Latest data point per `(devID, sensor)` pair. Used for `LastDP` operator in event conditions. |
| `getDataByTimeRange` | GET | `/api/account/deviceData/getDataCalibration/{devID}/{sensor}/{sTime}/{eTime}/true` | `getDataByTimeRangeWithCalibration` | Raw calibrated time-series. Used for aggregate operators (Min, Max, Mean, Sum, Consumption, FirstDP) over last 24 hours. |

---

### Widget Data (Cluster / Compute)

| Function | Method | URL | functionId | Notes |
|----------|--------|-----|-----------|-------|
| `fetchWidgetDataValue` | PUT | `/api/account/ioLensWidget/getWidgetData` | `getWidgetData` | Used for cluster and compute flow data sources. Single aggregated bucket over 24h. Response: `response.data.custom[bucket][].data` where `key === 'event_source'`. |

---

## Event Condition Evaluation Flow

```
Widget mounts
  → setInterval (pollIntervalSeconds, default 30s)
    → for each EventCondition:
        device  → getLastDP (LastDP op) or getDataByTimeRange + applyOperator
        cluster → getWidgetData (type: "cluster", clusterID)
        compute → getWidgetData (type: "compute", flowId, flowParams)
      → evaluateCondition(value, condition)
        fixed: compare value with comparisonOp + fixedValue
        range: minValue ≤ value ≤ maxValue
      → active=true → show badge with activeColor
         active=false → show badge with inactiveColor
```

---

## Resource IDs (fill in when known)

| Resource | ID | Notes |
|----------|----|-------|
| Test device | TBD | — |
| Test sensor | TBD | — |
| Test cluster | TBD | — |
| Test flow | TBD | — |

---

## File Map

```
widget/
  src/
    components/
      ImageEvent/
        ImageEvent.tsx              — widget, polls conditions, renders image + badges
        ImageEvent.css              — BEM scoped styles
        index.ts                    — self-registration: window.ReactWidgets['ImageEvent']
      ImageEventConfiguration/
        ImageEventConfiguration.tsx — config panel (3 tabs: Image, Events, Style)
        ImageEventConfiguration.css — BEM scoped styles
        index.ts                    — self-registration: window.ReactWidgets['ImageEventConfiguration']
    iosense-sdk/
      api.ts                        — API calls + evaluateCondition + applyOperator
      types.ts                      — ImageEventConfig, EventCondition, etc.
    App.tsx                         — dev preview harness
    index.tsx                       — dev entry point
  webpack.config.js                 — separate prod bundles per component
  package.json
  tsconfig.json
  public/index.html
  .env.example
```
