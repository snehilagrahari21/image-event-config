// ─── Generic wrappers ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedData<T> {
  data: T[];
  totalCount: number;
  pagination: { page: number; count: number; totalPages: number };
}

// ─── Devices ──────────────────────────────────────────────────────────────────

export interface DeviceSensor {
  sensorId: string;
  sensorName: string;
}

export interface Device {
  devID: string;
  devName: string;
  devTypeID?: string;
  devTypeName?: string;
  sensors: DeviceSensor[];
  unitSelected: Record<string, string>;
  tags?: string[];
  star?: boolean;
}

export interface DevicesPage {
  totalCount: number;
  data: Device[];
}

// ─── Time-series ──────────────────────────────────────────────────────────────

export interface LastDPEntry {
  devID: string;
  sensor: string;
  time: string;
  value: number;
  unit: string;
}

export interface TimeSeriesPoint {
  time: string;
  value: number;
}

// ─── Operator ─────────────────────────────────────────────────────────────────

export type EventOperator =
  | 'LastDP'
  | 'Mean'
  | 'Min'
  | 'Max'
  | 'Sum'
  | 'Consumption'
  | 'FirstDP';

// ─── Source & comparison types ────────────────────────────────────────────────

export type SourceType = 'device' | 'cluster' | 'compute';

export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

// ─── Image fit ────────────────────────────────────────────────────────────────

export type ImageFit = 'contain' | 'cover' | 'fill';

// ─── Data config (per Skills.md standardized schema) ─────────────────────────

export interface DataConfig {
  type: SourceType;
  devID?: string;
  devTypeID?: string;
  sensor?: string;
  operator?: EventOperator;
  clusterID?: string;
  clusterOperator?: string;
  flowID?: string;
  flowParams?: string;
  unit?: string;
  dataPrecision?: number;
}

// ─── Event condition — each entry in charts[] ────────────────────────────────
// An event binds a dataConfig source to a condition + a conditional image.
// When the fetched value satisfies the condition, the widget displays this
// entry's image instead of the default one.

export interface EventCondition {
  id: string;
  label: string;
  dataConfig: DataConfig;

  // Display names kept for config UI (not stored in dataConfig per Skills.md)
  devName?: string;
  sensorName?: string;
  clusterName?: string;

  // Condition
  comparisonType: 'fixed' | 'range';
  comparisonOp?: ComparisonOp;
  fixedValue?: number;
  minValue?: number;
  maxValue?: number;

  // Conditional image shown when the condition is active
  image?: string;       // base64 data URL
  imageName?: string;
}

// ─── Legacy event condition (for migration) ──────────────────────────────────

export interface LegacyEventCondition {
  id: string;
  label: string;
  sourceType: SourceType;
  devID?: string;
  devTypeID?: string;
  devName?: string;
  sensorId?: string;
  sensorName?: string;
  clusterID?: string;
  clusterName?: string;
  flowId?: string;
  flowParams?: string;
  operator: EventOperator;
  comparisonType: 'fixed' | 'range';
  comparisonOp?: ComparisonOp;
  fixedValue?: number;
  minValue?: number;
  maxValue?: number;
  activeColor: string;
  inactiveColor: string;
  showBadge: boolean;
  badgePosition: string;
}

// ─── Widget config ────────────────────────────────────────────────────────────

export interface ImageEventConfig {
  charts?: EventCondition[];

  // Legacy field kept for backward compatibility with older saved configs.
  events?: LegacyEventCondition[];

  // Default image (shown when no condition matches)
  imageData?: string;          // base64 data URL
  imageName?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageFit?: ImageFit;
  pollIntervalSeconds?: number;

  // Styling — card
  wrapInCard?: boolean;
  cardBgColor?: string;
  cardBorderColor?: string;
  cardBorderWidth?: number;
  cardBorderRadius?: number;
  cardPadding?: number;

  // Styling — image
  imageBorderRadius?: number;
}
