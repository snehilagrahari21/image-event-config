# IOsense Widget Development Skill

This skill captures the patterns, decisions, and rules for building IOsense widgets using `iosense-sdk-beta` MCP and `@faclon-labs/design-sdk`. Read this before writing any widget or configuration code.

---

## ⚠️ CRITICAL RULE — Standardized Data Configuration Schema

**Every widget that has any data configuration — regardless of type (chart, image, text, last data point, gauge, or any other) — MUST store data-related configuration inside a `charts` array using the schema below. This is non-negotiable.**

### Required Shape

```typescript
interface WidgetConfig {
  charts: ChartEntry[];   // always an array — even single-chart / single-value widgets
  // ...other config keys (style, time, layout, etc.)
}

interface ChartEntry {
  dataConfig: DataConfig;    // REQUIRED — reserved key for IOsense data binding
  api?: ExternalApi;        // OPTIONAL — reserved key for external source only
  // ...other chart-level config (title, description, chartType, series, axes, etc.)
}

interface DataConfig {
  // ── Source type (always required) ────────────────────────────────────────
  type: 'device' | 'cluster' | 'compute' | 'customExpression';

  // ── Device fields (used when type === 'device') ───────────────────────────
  devID?:         string;   // device ID
  devTypeID?:     string;   // device type ID
  sensor?:        string;   // sensor / metric name
  operator?:      string;   // Sum | Min | Max | LastDP | FirstDP | Consumption | RunHours

  // ── Cluster fields (used when type === 'cluster') ─────────────────────────
  clusterID?:     string;
  clusterOperator ?: string;

  // ── Compute fields (used when type === 'compute') ─────────────────────────
  flowID?:        string;
  flowParams?:    string;

  // ── Custom expression fields (used when type === 'customExpression') ─────
  bindings?:      string;

  // ── Shared fields (applicable across all source types) ────────────────────
  unit?:          string;
  dataPrecision?: number;
}

interface ExternalApi {
  // Declare external/non-IOsense source here — free-form, but must live under `api`
  [key: string]: any;
}
```

### Rules

- **`charts` is always an array**, even if the widget only has one data source. Single-value widgets (Last Data Point, Image, Text, etc.) use `charts` with one entry.
- **`config.charts[n].dataConfig` is the only valid home for IOsense source binding.** Never store `devID`, `devTypeID`, `sensor`, `operator`, `clusterID`, `clusterOperator`, `flowID`, `flowParams`, `bindings`, `unit`, or `dataPrecision` at the top level of `config` or directly on `series`.
- **`dataConfig` and `api` are reserved keys** inside every chart entry. Never repurpose them for other config.
- **`dataConfig` keys listed above are reserved.** You may add extra keys alongside them for widget-specific needs, but you must never rename or reuse a reserved key for a different purpose.
- For `type: 'customExpression'`, only `bindings` is required from the source-specific fields. Do not require `devID`, `clusterID`, or `flowID` in this mode.
- **External sources go under `api` only.** If data comes from a URL outside the IOsense platform, declare it in `api`, not in `dataConfig`.
- The **Data Layer Engine** resolves live values by reading `dataConfig` from the store. If your data is not in `dataConfig`, the engine cannot bind to it reactively.
- The **Configuration panel `onChange`** must always emit a config object that conforms to this schema. Validate before calling `onChange`.

### Legacy Shapes To Reject

```typescript
// ❌ Wrong — flat config keys
config = {
  devID: 'dev-001',
  sensor: 'temperature',
  operator: 'LastDP',
};

// ❌ Wrong — source binding stored on series
config = {
  charts: [
    {
      series: [
        {
          label: 'Temperature',
          devID: 'dev-001',
          sensor: 'temperature',
        },
      ],
    },
  ],
};

// ✅ Right — source binding lives under charts[n].dataConfig
config = {
  charts: [
    {
      dataConfig: {
        type: 'device',
        devID: 'dev-001',
        sensor: 'temperature',
        operator: 'LastDP',
      },
    },
  ],
};
```

### ✅ Checklist — Before Saving Any Widget Config

- [ ] All data sources are stored inside `config.charts[n].dataConfig`
- [ ] `type` field is set to `'device'`, `'cluster'`, `'compute'`, or `'customExpression'`
- [ ] Device widgets populate: `devID`, `devTypeID`, `sensor`, `operator`
- [ ] Cluster widgets populate: `clusterID`, `operator`, `clusterOperator` (`operator` = time/value aggregation, `clusterOperator` = cluster aggregation logic)
- [ ] Compute widgets populate: `flowID`, `flowParams`
- [ ] Custom expression widgets populate: `bindings`
- [ ] External API sources are declared under `config.charts[n].api`, not `dataConfig`
- [ ] No reserved key (`devID`, `sensor`, `operator`, `clusterID`, `clusterOperator`, `flowID`, `flowParams`, `bindings`, `devTypeID`, `unit`, `dataPrecision`) is repurposed for anything other than its defined role
- [ ] `charts` is an array (not an object, even when there is only one chart)

### Example — Single-value widget (Last Data Point)

```typescript
// ✅ Correct — single chart entry, same schema
config = {
  charts: [
    {
      dataConfig: {
        type: 'device',
        devID: 'dev-001',
        devTypeID: 'dt-temp',
        sensor: 'temperature',
        operator: 'LastDP',
        unit: '°C',
        dataPrecision: 2,
      },
    },
  ],
  style: { ... },
};

// ❌ Wrong — flat config, no charts array
config = {
  devID: 'dev-001',
  sensor: 'temperature',
};
```

### Example — Widget with external source

```typescript
// ✅ External data declared under api, not mixed into dataConfig
config = {
  charts: [
    {
      dataConfig: {
        type: 'device',
        devID: 'dev-002',
        sensor: 'pressure',
        operator: 'LastDP',
        unit: 'bar',
      },
      api: {
        url: 'https://external.service.io/threshold',
        method: 'GET',
        // could be different as well based on API configured with widget
      },
    },
  ],
};
```

---

## ⚠️ ABSOLUTE RULE — No Custom Components

**Every single UI element must come from `@faclon-labs/design-sdk`.** This is non-negotiable.

Do NOT write custom implementations for anything the design-sdk already provides. This includes but is not limited to:

| If you need... | Use from `@faclon-labs/design-sdk` |
|---------------|-------------------------------------|
| Any button | `Button`, `IconButton`, `LinkButton` |
| Any text input | `TextInput`, `TextArea` |
| Any dropdown/select | `SelectInput`, `MultiSelectInput`, `AutocompleteInput` |
| Any checkbox | `Checkbox`, `CheckboxGroup` |
| Any radio button | `Radio`, `RadioGroup` |
| Any toggle/switch | `Switch`, `SwitchButtonBase`, `SwitchButtonGroup` |
| Any menu / dropdown list | `DropdownMenu`, `ActionListItem`, `ActionListItemGroup` |
| Any tab navigation | `Tabs`, `TabItem` |
| Any accordion/expand | `Accordion`, `AccordionItem`, `ProductAccordionItem` |
| Any modal/dialog | `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter` |
| Any card/container | `Card`, `CardHeader`, `CardBody`, `CardFooter` |
| Any badge/tag/chip | `Badge`, `Tag`, `Indicator` |
| Any loading spinner | `Spinner` |
| Any divider/separator | `Divider` |
| Any color picker | `ColorPicker` |
| Any date picker | `DatePicker`, `DateSelectorButton`, `DateSelectorGroup` |
| Any list item | `ListCard`, `ActionListItem` |

**If you are about to write a `<div onClick>`, a custom `<select>`, a custom `<input>`, a custom toggle, a custom modal, or any native HTML form element as a UI component — STOP. Find the equivalent in `@faclon-labs/design-sdk` first.**

The only HTML elements allowed directly are layout containers (`div`, `span`) for flex/grid structure, and third-party chart libraries (Highcharts). Everything interactive or visual must be a design-sdk component.

---

## 0. Before You Write Any Code

Always call the MCP tools first in this order:

1. `get_frontend(type="widget", about="setup")` — folder structure, props contract, self-registration
2. `get_frontend(type="widget", about="workflow")` — auth pattern, dev vs prod, pitfalls
3. `get_design(about="components")` — available design-sdk components
4. `get_design(about="tokens")` — CSS tokens and spacing
5. `get_backend(domain="devices")` — device/sensor APIs overview

Then fetch specific API specs with `get_backend(domain="devices", function_id="<id>")` before implementing data calls.

---

## 1. Project Structure Rules

```
src/
  components/
    {Name}/
      {Name}.tsx          ← widget
      {Name}.css          ← BEM scoped styles
      index.ts            ← self-registration
    {Name}Configuration/
      {Name}Configuration.tsx
      {Name}Configuration.css
      index.ts
  iosense-sdk/
    api.ts
    types.ts
```

- Widget and Configuration are **always separate webpack entries** — never bundled together.
- Never remove existing webpack entries — Lens still references deployed widgets by name.

---

## 2. Props Contract

```typescript
// Widget
interface WidgetProps {
  config: WidgetConfig;       // undefined on first mount — always use config?.field ?? fallback
  data?: unknown;             // reserved runtime prop — widget display data comes from here when provided
  authentication: string;     // JWT — use directly in prod, fallback to localStorage in dev
  timeChange?: (payload: { startTime: number | string; endTime: number | string }) => void;
  chartChange?: (payload: { activeIndex: number }) => void;
}

// Configuration panel
interface ConfigurationProps {
  config: WidgetConfig;
  authentication: string;
  onChange: (config: WidgetConfig) => void;
}
```

**Config is a round-trip.** Config panel reads → user edits → `onChange(updated)` → widget re-renders.

**Reserved widget runtime keys:** `data`, `timeChange`, and `chartChange` are reserved widget prop keys. Never reuse these names for config fields or unrelated props.

### ⚠️ CRITICAL CLAUSE — Unidirectional Data Flow & Event Emissions

To ensure proper widget-to-dashboard communication for any data updates (e.g. user triggers a time drill-down), you must strictly follow this lifecycle:
1. **Emit Event**: The widget emits a designated event (`timeChange` or `chartChange`) when an interaction occurs. The widget NEVER modifies its own internal data payload directly.
2. **Dashboard Fetches**: The parent dashboard captures this event, evaluates it, re-triggers the data layer, and retrieves fresh data.
3. **Passive Prop Update**: The dashboard passes the fresh payload down to the widget via the `data` prop. The widget should simply watch for changes on `data` (e.g. via `useEffect`) and passively update its visualization.

**Widget event rule:** Emit widget interactions through the reserved callbacks only:
- `timeChange({ startTime, endTime })` — Emit when the widget requires a time window update (e.g., clicking a category for time drilldown or using an internal date picker).
- `chartChange({ activeIndex })` — Emit when the active chart view changes within the widget.

**CRITICAL — always sync config and data into local state via `useEffect`:**
```typescript
// CORRECT
const [charts, setCharts] = useState(config?.charts ?? []);
useEffect(() => { setCharts(config?.charts ?? []); }, [config]);

// WRONG — derived local state is not kept in sync with config updates
const [charts, setCharts] = useState(config?.charts ?? []);
```

**Auth pattern (works in both dev and prod, zero changes):**
```typescript
const token = authentication ?? localStorage.getItem('bearer_token');
```

**Repatch on edit:** When editing an existing widget, Angular passes `value` prop (existing config). Always pre-populate all form fields from `config` props so configured state is visible on re-open.

---

## 3. Styling Rules

- **BEM naming only** — `.widget-name__element--modifier`
- **Never use inline styles** — use design-sdk CSS variables
- **Never override `.fds-*` classes** — do not write CSS targeting `[class*="fds-accordion"]` or any `.fds-` prefixed class unless explicitly instructed. This breaks the design system globally.
- Use `--spacing-*` tokens for all spacing, `--text-default-*` for text colors, `--border-gray-*` for borders
- Highcharts background must always be `transparent`
- Widget outer container: `width: 100%; height: 100%`
- Configuration panel: no `Card` wrapper, no title — start directly from `Tabs`
- **Accordion body width rule:** When placing fields inside an `AccordionItem` body, always wrap them in your own BEM div with `width: 100%; box-sizing: border-box; display: flex; flex-direction: column;`. Without this, child components shrink instead of filling the available width. Do NOT target `.fds-accordion` classes to fix this — fix it on your own wrapper div only.

---

## 4. Widget Layout (CombineBarLineChart pattern)

```
Card (background)
  flex-column
    ┌─ Row 1: d-flex, justify-content: space-between ─────────────────┐
    │  Chart Title (heading)                                           │
    │    → if multiple charts: convert to SelectInput/dropdown         │
    │    → dropdown selects the ACTIVE chart (not series inside it)    │
    │  Icon Section (d-flex)                                           │
    │    Settings IconButton (use correct settings/gear icon)          │
    │      DropdownMenu →                                              │
    │        Legend Switch/Toggle                                      │
    │        Data Label Switch/Toggle                                  │
    │        Time Drilldown Switch/Toggle                              │
    │    Export IconButton                                             │
    │      DropdownMenu →                                              │
    │        CSV                                                       │
    │        XLSX                                                       │
    │        Image                                                     │
    │  Settings/Export icon color and size follow Chart Styling config │
    └──────────────────────────────────────────────────────────────────┘
    ┌─ Row 2: d-flex ──────────────────────────────────────────────────┐
    │  DatePicker (@faclon-labs/design-sdk DatePicker)                 │
    │  Periodicity SelectInput (default high→low: Monthly,Weekly,      │
    │    Daily, Hourly)                                                │
    │    Auto-filter: diff > 1 week → show Monthly+Weekly only        │
    │    diff ≤ 24h → show Hourly only                                 │
    │  Hidden when time type = "fixed" (show duration label instead)  │
    └──────────────────────────────────────────────────────────────────┘
    ┌─ Row 3: Highcharts ──────────────────────────────────────────────┐
    │  width: 100%; background: transparent                            │
    └──────────────────────────────────────────────────────────────────┘
```

**Settings dropdown items** must use `width: 100%` so they cover the full dropdown width.

---

## 5. Widget Configuration — 3 Tabs

Use `Tabs` from design-sdk. No Card wrapper. No title above tabs. Start directly from `<Tabs>`.

### Tab 1: Data

Layout: `flex-column`

#### 5.1 Chart Settings Accordion

This section manages the list of charts (not series). Think of charts as named containers that series live inside.

**Add Chart button** — always visible inside this accordion. Clicking it adds a new chart entry with a default title. This button must exist — without it users cannot create charts and therefore cannot add series.

Each chart entry in the list shows:
- Chart Title — TextInput (editable inline)
- Chart Description — TextInput (editable inline)
- Delete button for that chart

**Active chart selector:** When 2+ charts exist, the widget's Row 1 title converts to a `SelectInput` dropdown to switch the active chart. This dropdown controls which chart series are assigned to — it does NOT appear inside the accordion itself.
When the active chart changes in the widget, emit `chartChange({ activeIndex })`.

**Chart-type-aware fields:** Some fields are only relevant for specific chart types. Before adding any field to the config, ask: *does this chart type use this feature?*

| Feature | Applicable chart types |
|---------|----------------------|
| Chart Type per series (Bar/Line) | CombineBarLineChart only — omit for ColumnChart, PieChart, etc. |
| Axis (Left/Right) | Bar, Line, Column — omit for Pie |
| Stack Section | Bar, Column only — omit for Line, Pie |
| Plotline | X-axis based charts (Bar, Line, Column) — omit for Pie |
| Plotband | X-axis based charts — omit for Pie |
| Time Drilldown | Any time-series chart — omit for non-time-series |

**Rule: Do not blindly copy all sections from this skill.** Read what chart type is being built and include only the sections that are relevant to it.

#### 5.2 Data Section Accordion

All fields `flex-column`, 100% width.

Fields per chart entry:
1. **Label** — TextInput
2. **Source Type** — RadioGroup (device / cluster / compute / customExpression), `d-flex flex-row`

   Store these source fields in `activeChart.dataConfig`, not on `config`, not on `series`, and not in any parallel structure. If the widget also has render series, those series define presentation only and must read from the chart's `dataConfig`.

   **Device source:**
   - AutocompleteInput for device — **on every input change**, call `findUserDevices` with `search: { all: [inputValue] }`. Do not use a static list. Wire `onInputChange` to trigger the API call (debounce 300ms). Populate dropdown options from `response.data.data` (note: double `.data`).
   - SelectInput for sensor — populated from `getDeviceSpecificMetadata(devID)` after device is selected. Shows `sensorName` as label, `sensorId` as value.
   - SelectInput for operator: Sum, Min, Max, LastDP, FirstDP, Consumption, RunHours

   **Cluster source:**
   - AutocompleteInput for cluster/loadEntity (fetch from backend)
   - Time operators: same as device
   - Cluster operator SelectInput: Sum, Mean, Max, Min, Median, Mode

   **Compute source:**
   - TextInput for Flow ID
   - TextInput for Flow Parameters

   **Custom expression source:**
   - Bindings editor/input only
   - Store expression bindings in `activeChart.dataConfig.bindings`
   - Do not require device, cluster, or compute fields when this source type is selected

3. **Chart Type** — SelectInput: Bar / Line
4. **Data Precision** — TextInput (number)
5. **Color** — TextInput with color swatch suffix (square box; clicking opens ColorPicker from design-sdk)
6. **Unit** — TextInput
7. **Downsampling** — TextInput (number, in seconds)

**Source-vs-render rule:**
- `dataConfig` answers where the data comes from
- `series` answers how the data is rendered
- Reserved source keys (`devID`, `sensor`, `operator`, `clusterID`, `clusterOperator`, `flowID`, `flowParams`, `bindings`, `devTypeID`, `unit`, `dataPrecision`) must never be duplicated under `series`

**Add Series button** — right-aligned. Disabled until at least one chart exists.

**Series list** — use `ActionListItem` from design-sdk. Each row shows: Sr. No., Label, Color swatch, Chart Type.

**Multi-chart rule:** Series are added to the **currently selected/active chart** only. Selecting chart2 in the Chart Settings dropdown means all new series go to chart2.

#### 5.3 Axis Section Accordion

`flex-column`, each axis entry:
- Axis Name — TextInput
- Series assignment — MultiSelectInput (select from added series)
- Position — RadioGroup: Left / Right (`d-flex flex-row`)

#### 5.4 Stack Section Accordion

- Stack Name — TextInput
- Series SelectInput — only show series with chart type **Bar**
- Add Stack button

#### 5.5 Plotline Accordion

`flex-column`:
- Plotline Name — TextInput
- Width — TextInput (number)
- Color — TextInput with color swatch (same pattern as series color)
- Line Type — SelectInput
- Periodicity — RadioGroup: Dependent / Independent (`d-flex flex-row`)
  - **Independent:** Value input field only
  - **Dependent:** `flex-column` — SelectInput for period + TextInput for value

#### 5.6 Plotband Accordion

`flex-column`:
- Plotband Name — TextInput
- From — TextInput
- To — TextInput
- Color — TextInput with color swatch

---

### Tab 2: Time

**No accordion for the top section** — just `padding: var(--spacing-04)`.

#### Timezone & Time Type Section (no accordion, padded)

- Timezone — AutocompleteInput
- Time Type — SelectInput: Local Time Picker / Fixed Time
  - **Local Time Picker:** show DatePicker + Periodicity select in widget
  - **Fixed Time:** show only duration label in widget; hide DatePicker and periodicity dropdown

#### Cycle Time Section — Accordion, `flex-column`

- Row 1: Cycle Time Identifier — RadioGroup: Start / End (`d-flex flex-row`)
- Row 2: Hour + Min — two SelectInputs (`d-flex flex-row`)
- Row 3: Day selector — use `DateSelectorGroup` + `DateSelectorButton` from design-sdk, `width: 100%`, covers full available space
- Row 4: Date + Month selection — `d-flex flex-row`

#### Duration Section — Accordion, `flex-column`

Layout per duration:
- Duration Name — TextInput
- Navigation — SelectInput: Previous / Next (outside X/Y rows, below name)
- X row (`d-flex flex-row`): X number TextInput + X Period SelectInput (Hour, Day, Week, Month, Year)
- X Event row: SelectInput (Start, Now, End)
- Y row (`d-flex flex-row`): same as X
- Y Event row: SelectInput (Start, Now, End)
- Periodicity SelectInput

Multiple durations can be added. Each duration becomes a **DatePicker preset** (like "Current Week", "Today").

---

### Tab 3: Style

No fields above Card Styling. Start directly with accordions.

#### Card Styling — Accordion, `flex-column`

- Wrap into Card — Switch toggle
- Background Color — TextInput with color swatch
- Border Color — TextInput with color swatch
- Border Width — TextInput
- Border Radius — TextInput
- Padding — TextInput

#### Chart Styling — Accordion, `flex-column`

Applies to **chart title, settings icon, and export icon** (icon color and size are controlled here):
- Font Size — AutocompleteInput (predefined options + free type)
- Font Color — TextInput with color swatch
- Font Weight — SelectInput

#### X Axis Styling — Accordion

- xAxis Label Color — color input
- xAxis Line Color — color input
- Font Size — TextInput

#### Y Axis Styling — Accordion

Same fields as X Axis.

#### Legend Styling — Accordion

- Legend Color — color input
- Legend Font Size — TextInput
- Legend Font Weight — SelectInput

#### Others Styling — Accordion

- Grid Line Color — color input

---

## 6. API Data Layer

### Device search (config panel)
```typescript
// PUT https://connector.iosense.io/api/account/devices/{skip}/{limit}
// IMPORTANT: response nests at response.data.data (not response.data)
const devices = response.data.data;
```

### Widget data fetch
```typescript
// PUT https://connector.iosense.io/api/account/ioLensWidget/getWidgetData
// type: "combinedBarLineChartV2"
// Response shape: response.data.data[timeFrame][bucket][].data
```

**Correct data formatting from `getWidgetData`:**
```
response.data.data[timeFrame]  →  object keyed by bucket ranges ("1774861352000-1774895432000")
response.data.labelConfig[timeFrame]  →  same keys → human label ("30 Mar", "01 Apr")

→ categories = Object.values(labelConfig[timeFrame])
→ For each series (matched by key): 
    seriesData = Object.keys(labelConfig[timeFrame]).map(bucket =>
      dataByTimeFrame[bucket]?.find(d => d.key === seriesKey)?.data ?? null
    )
```

---

## 7. Time Drilldown Feature

When enabled in Settings dropdown:

- User clicks a category (e.g. "Week 1") → extract that bucket's startTime and endTime
- Re-call `getWidgetData` with that range and the next finer periodicity (weekly→daily, daily→hourly)
- Show breadcrumb beside chart title: e.g. `Weekly → Daily  [refresh icon]`
- Refresh icon resets to original DatePicker selection + selected periodicity
- Whenever the widget changes the active time window, emit `timeChange({ startTime, endTime })`

Click handler must be wired to Highcharts `xAxis.labels.events.click` or `plotOptions.series.point.events.click`.

---

## 8. Common Pitfalls — Never Do These

| ❌ Wrong | ✅ Right |
|---------|---------|
| Write any custom component (input, button, select, modal, toggle, etc.) | Use the equivalent from `@faclon-labs/design-sdk` — always |
| Override `.fds-*` CSS classes | Only write CSS for your own BEM classes |
| Use `key={value}` for unique identifiers | Use `id={value}` — and do NOT use `key={}` at all |
| Inline styles | BEM + CSS variables only |
| Derive config directly from prop | Sync into state via `useEffect` |
| Bundle React | It's external — configured in webpack externals |
| Bundle widget + config together | Separate webpack entries always |
| `response.data.data` without checking nesting | Always verify response shape from `get_backend` spec |
| Add series before chart exists | Disable "Add Series" button until ≥1 chart exists |
| Chart title dropdown selects series | It selects the active **chart** — series belong to that chart |
| Card wrapper in configuration panel | Config panel starts directly from `<Tabs>` |
| Remove `key={}` partially | Remove completely — use `id={}` everywhere for unique identification |
| Static device list in AutocompleteInput | Call `findUserDevices` with `search: { all: [inputValue] }` on every input change (debounce 300ms) |
| Accordion body child components shrink | Wrap children in own BEM div: `width: 100%; box-sizing: border-box; display: flex; flex-direction: column` |
| Copy all config sections regardless of chart type | Read the chart type first — only include sections relevant to that chart (e.g. no Plotline/Plotband/Axis for PieChart) |
| No "Add Chart" button in Chart Settings | Always add an "Add Chart" button — users cannot add series without a chart |

---

## 9. Quick Reference — Design-SDK Components Used in Widgets

| Use case | Component |
|----------|-----------|
| Tab navigation | `Tabs` + `TabItem` |
| Expandable sections | `Accordion` + `AccordionItem` |
| Series list | `ActionListItem` + `ActionListItemGroup` |
| Device/cluster search | `AutocompleteInput` |
| Sensor/operator/type select | `SelectInput` |
| Multi-series assignment | `MultiSelectInput` |
| Toggle (legend, drilldown) | `Switch` |
| Source type (device/cluster/compute/customExpression) | `RadioGroup` + `Radio` |
| Color input | `TextInput` with color swatch in suffix slot |
| Color picker popup | `ColorPicker` |
| Date selection | `DatePicker` |
| Day selection | `DateSelectorGroup` + `DateSelectorButton` (width: 100%) |
| Loading states | `Spinner` |
| Icon buttons (settings, export) | `IconButton` |
| Dropdown menus | `DropdownMenu` + `ActionListItem` |
| Card background | `Card` (widget only, not config) |
