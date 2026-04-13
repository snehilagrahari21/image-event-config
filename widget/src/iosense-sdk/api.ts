import type {
  ApiResponse,
  Device,
  DevicesPage,
  EventCondition,
  EventOperator,
  LastDPEntry,
  TimeSeriesPoint,
} from './types';

const BASE_URL = 'https://connector.iosense.io/api';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function getRawToken(authentication?: string): string {
  return authentication ?? localStorage.getItem('bearer_token') ?? '';
}

function bearerValue(authentication?: string): string {
  const raw = getRawToken(authentication);
  return raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
}

function getOrg(): string {
  return localStorage.getItem('organisation') ?? 'https://iosense.io';
}

function authHeaders(authentication?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: bearerValue(authentication),
  };
}

function authHeadersWithOrg(authentication?: string): HeadersInit {
  return {
    ...authHeaders(authentication),
    organisation: getOrg(),
    'ngsw-bypass': 'true',
  };
}

// ─── Authentication ───────────────────────────────────────────────────────────

interface SSOResponse {
  success: boolean;
  token: string;
  organisation: string;
  userId: string;
}

export async function validateSSOToken(ssoToken: string): Promise<string> {
  const res = await fetch(
    `${BASE_URL}/retrieve-sso-token/${encodeURIComponent(ssoToken)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        organisation: 'https://iosense.io',
        'ngsw-bypass': 'true',
      },
    }
  );
  if (!res.ok) throw new Error(`validateSSOToken failed: ${res.status}`);
  const json: SSOResponse = await res.json();
  if (!json.success) throw new Error('validateSSOToken: success=false');
  localStorage.setItem('bearer_token', json.token);
  localStorage.setItem('organisation', json.organisation);
  return json.token;
}

// ─── Devices ──────────────────────────────────────────────────────────────────

// functionId: findUserDevices
// PUT https://connector.iosense.io/api/account/devices/{skip}/{limit}
// Response nested at response.data.data
export async function findUserDevices(
  authentication: string | undefined,
  search = '',
  page = 1,
  limit = 100
): Promise<Device[]> {
  const body: Record<string, unknown> = {
    order: 'default',
    sort: 'AtoZ',
    filter: [],
    search: search ? { all: [search] } : {},
  };
  const res = await fetch(`${BASE_URL}/account/devices/${page}/${limit}`, {
    method: 'PUT',
    headers: authHeadersWithOrg(authentication),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`findUserDevices failed: ${res.status}`);
  const json: ApiResponse<DevicesPage> = await res.json();
  if (!json.success) throw new Error('findUserDevices: success=false');
  return json.data.data;
}

// ─── Latest data point ────────────────────────────────────────────────────────

// functionId: getLastDPsofDevicesAndSensorCalibrated
// PUT https://connector.iosense.io/api/account/deviceData/getLastDPsofDevicesAndSensorProcessed
export async function getLastDP(
  authentication: string | undefined,
  devID: string,
  sensorId: string
): Promise<LastDPEntry | null> {
  const res = await fetch(
    `${BASE_URL}/account/deviceData/getLastDPsofDevicesAndSensorProcessed`,
    {
      method: 'PUT',
      headers: authHeaders(authentication),
      body: JSON.stringify({ devices: [{ devID, sensor: sensorId }] }),
    }
  );
  if (!res.ok) throw new Error(`getLastDP failed: ${res.status}`);
  const json: ApiResponse<LastDPEntry[]> = await res.json();
  if (!json.success) throw new Error('getLastDP: success=false');
  return json.data[0] ?? null;
}

// ─── Time range data ──────────────────────────────────────────────────────────

// functionId: getDataByTimeRangeWithCalibration
// GET https://connector.iosense.io/api/account/deviceData/getDataCalibration/{devID}/{sensor}/{sTime}/{eTime}/true
export async function getDataByTimeRange(
  authentication: string | undefined,
  devID: string,
  sensorId: string,
  sTimeMs: number,
  eTimeMs: number
): Promise<TimeSeriesPoint[]> {
  const res = await fetch(
    `${BASE_URL}/account/deviceData/getDataCalibration/${encodeURIComponent(devID)}/${encodeURIComponent(sensorId)}/${sTimeMs}/${eTimeMs}/true`,
    { method: 'GET', headers: authHeaders(authentication) }
  );
  if (!res.ok) throw new Error(`getDataByTimeRange failed: ${res.status}`);
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) throw new Error('getDataByTimeRange: success=false');
  const raw = json.data;
  let flat: TimeSeriesPoint[];
  if (Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0])) {
    flat = (raw as TimeSeriesPoint[][]).flat();
  } else {
    flat = raw as TimeSeriesPoint[];
  }
  return flat.filter((p) => p != null && typeof p.value === 'number');
}

// ─── Operator computation ─────────────────────────────────────────────────────

export function applyOperator(points: TimeSeriesPoint[], operator: EventOperator): number | null {
  if (points.length === 0) return null;
  const values = points.map((p) => p.value);
  switch (operator) {
    case 'Min':         return Math.min(...values);
    case 'Max':         return Math.max(...values);
    case 'Mean':        return values.reduce((a, b) => a + b, 0) / values.length;
    case 'Sum':         return values.reduce((a, b) => a + b, 0);
    case 'Consumption': return values[values.length - 1] - values[0];
    case 'FirstDP':     return values[0];
    case 'LastDP':      return values[values.length - 1];
    default:            return null;
  }
}

// ─── Fetch value for an event condition ──────────────────────────────────────

export async function fetchConditionValue(
  authentication: string | undefined,
  condition: EventCondition
): Promise<number | null> {
  try {
    const dataConfig = condition.dataConfig;

    if (dataConfig.type === 'device') {
      if (!dataConfig.devID || !dataConfig.sensor) return null;

      if (dataConfig.operator === 'LastDP') {
        const dp = await getLastDP(authentication, dataConfig.devID, dataConfig.sensor);
        return dp?.value ?? null;
      }

      // For aggregate operators fetch last 24 hours
      const now = Date.now();
      const start = now - 24 * 3_600_000;
      const points = await getDataByTimeRange(
        authentication,
        dataConfig.devID,
        dataConfig.sensor,
        start,
        now
      );
      return applyOperator(points, dataConfig.operator ?? 'LastDP');
    }

    if (dataConfig.type === 'cluster') {
      // Cluster support via getWidgetData
      if (!dataConfig.clusterID) return null;
      const now = Date.now();
      const start = now - 24 * 3_600_000;
      return await fetchWidgetDataValue(authentication, {
        type: 'cluster',
        clusterID: dataConfig.clusterID,
        clusterOperator: dataConfig.clusterOperator,
        operator: mapOperatorForWidgetData(dataConfig.operator ?? 'LastDP'),
        startTime: start,
        endTime: now,
      });
    }

    if (dataConfig.type === 'compute') {
      // Compute flow via getWidgetData
      if (!dataConfig.flowID) return null;
      const now = Date.now();
      const start = now - 24 * 3_600_000;
      return await fetchWidgetDataValue(authentication, {
        type: 'compute',
        flowID: dataConfig.flowID,
        flowParams: dataConfig.flowParams ?? '',
        operator: mapOperatorForWidgetData(dataConfig.operator ?? 'LastDP'),
        startTime: start,
        endTime: now,
      });
    }

    return null;
  } catch {
    return null;
  }
}

// ─── Map operator to getWidgetData format ─────────────────────────────────────

function mapOperatorForWidgetData(op: EventOperator): string {
  const map: Record<EventOperator, string> = {
    LastDP: 'lastdp',
    FirstDP: 'firstdp',
    Mean: 'mean',
    Min: 'min',
    Max: 'max',
    Sum: 'sum',
    Consumption: 'consumption',
  };
  return map[op] ?? 'lastdp';
}

// ─── getWidgetData — single value via aggregated bucket ──────────────────────

// functionId: getWidgetData
// PUT https://connector.iosense.io/api/account/ioLensWidget/getWidgetData
interface WidgetDataSourceConfig {
  type: 'device' | 'cluster' | 'compute';
  devID?: string;
  sensor?: string;
  clusterID?: string;
  clusterOperator?: string;
  flowID?: string;
  flowParams?: string;
  operator: string;
  startTime: number;
  endTime: number;
}

async function fetchWidgetDataValue(
  authentication: string | undefined,
  cfg: WidgetDataSourceConfig
): Promise<number | null> {
  const key = 'event_source';
  const body = {
    startTime: cfg.startTime,
    endTime: cfg.endTime,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeBucket: '1d',
    timeFrame: 'custom',
    config: [
      {
        type: cfg.type,
        devID: cfg.devID,
        sensor: cfg.sensor,
        clusterID: cfg.clusterID,
        clusterOperator: cfg.clusterOperator,
        flowID: cfg.flowID,
        flowParams: cfg.flowParams,
        operator: cfg.operator,
        key,
      },
    ],
  };
  const res = await fetch(
    `${BASE_URL}/account/ioLensWidget/getWidgetData`,
    {
      method: 'PUT',
      headers: authHeaders(authentication),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) return null;
  const json: ApiResponse<unknown> = await res.json();
  if (!json.success) return null;
  // Extract value from response — grab last bucket value
  const data = (json.data as Record<string, unknown>);
  const timeFrameData = data?.['custom'] as Record<string, unknown[]> | undefined;
  if (!timeFrameData) return null;
  const buckets = Object.values(timeFrameData);
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) {
      const entry = bucket.find((e: unknown) => (e as Record<string, unknown>)?.key === key);
      if (entry) return (entry as Record<string, unknown>).data as number ?? null;
    }
  }
  return null;
}

// ─── Evaluate condition ────────────────────────────────────────────────────────

export function evaluateCondition(value: number | null, condition: EventCondition): boolean {
  if (value === null) return false;

  if (condition.comparisonType === 'range') {
    const min = condition.minValue ?? -Infinity;
    const max = condition.maxValue ?? Infinity;
    return value >= min && value <= max;
  }

  // fixed comparison
  const target = condition.fixedValue ?? 0;
  switch (condition.comparisonOp ?? 'eq') {
    case 'eq':  return value === target;
    case 'neq': return value !== target;
    case 'gt':  return value > target;
    case 'gte': return value >= target;
    case 'lt':  return value < target;
    case 'lte': return value <= target;
    default:    return false;
  }
}
