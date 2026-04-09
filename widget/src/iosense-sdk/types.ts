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

// ─── Event condition ──────────────────────────────────────────────────────────

export type SourceType = 'device' | 'cluster' | 'compute';

export type ComparisonOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

export type BadgePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center';

export interface EventCondition {
  id: string;
  label: string;

  // Source
  sourceType: SourceType;

  // Device source
  devID?: string;
  devName?: string;
  sensorId?: string;
  sensorName?: string;

  // Cluster source
  clusterID?: string;
  clusterName?: string;

  // Compute source
  flowId?: string;
  flowParams?: string;

  // Operator applied to fetched data
  operator: EventOperator;

  // Comparison — "fixed" uses comparisonOp + fixedValue; "range" uses minValue + maxValue
  comparisonType: 'fixed' | 'range';
  comparisonOp?: ComparisonOp;
  fixedValue?: number;
  minValue?: number;
  maxValue?: number;

  // Badge display
  activeColor: string;
  inactiveColor: string;
  showBadge: boolean;
  badgePosition: BadgePosition;
}

// ─── Image fit ────────────────────────────────────────────────────────────────

export type ImageFit = 'contain' | 'cover' | 'fill';

// ─── Widget config ────────────────────────────────────────────────────────────

export interface ImageEventConfig {
  // Image
  imageData?: string;          // base64 data URL
  imageName?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  imageWidth?: number;         // display width override (px or %)
  imageHeight?: number;        // display height override (px)
  imageFit?: ImageFit;

  // Events
  events?: EventCondition[];
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
