import type {
  BadgePosition,
  ComparisonOp,
  DataConfig,
  EventCondition,
  EventOperator,
  ImageEventConfig,
  LegacyEventCondition,
} from './types';

function fallbackBadgePosition(value?: BadgePosition): BadgePosition {
  return value ?? 'top-right';
}

function fallbackComparisonType(value?: 'fixed' | 'range'): 'fixed' | 'range' {
  return value ?? 'fixed';
}

function fallbackOperator(value?: EventOperator): EventOperator {
  return value ?? 'LastDP';
}

export function makeDefaultDataConfig(): DataConfig {
  return {
    type: 'device',
    operator: 'LastDP',
  };
}

export function makeDefaultChartEntry(id: string): EventCondition {
  return {
    id,
    label: 'New Event',
    dataConfig: makeDefaultDataConfig(),
    comparisonType: 'fixed',
    comparisonOp: 'gt',
    fixedValue: 0,
    activeColor: '#22c55e',
    inactiveColor: '#ef4444',
    showBadge: true,
    badgePosition: 'top-right',
  };
}

function normalizeLegacyEvent(event: LegacyEventCondition): EventCondition {
  return {
    id: event.id,
    label: event.label,
    dataConfig: {
      type: event.sourceType,
      devID: event.devID,
      devTypeID: event.devTypeID,
      sensor: event.sensorId,
      operator: event.operator,
      clusterID: event.clusterID,
      flowID: event.flowId,
      flowParams: event.flowParams,
    },
    devName: event.devName,
    sensorName: event.sensorName,
    clusterName: event.clusterName,
    comparisonType: fallbackComparisonType(event.comparisonType),
    comparisonOp: event.comparisonOp,
    fixedValue: event.fixedValue,
    minValue: event.minValue,
    maxValue: event.maxValue,
    activeColor: event.activeColor,
    inactiveColor: event.inactiveColor,
    showBadge: event.showBadge,
    badgePosition: fallbackBadgePosition(event.badgePosition),
  };
}

function normalizeChartEntry(chart: EventCondition): EventCondition {
  return {
    ...chart,
    label: chart.label ?? 'New Event',
    dataConfig: {
      ...makeDefaultDataConfig(),
      ...(chart.dataConfig ?? {}),
      type: chart.dataConfig?.type ?? 'device',
      operator: fallbackOperator(chart.dataConfig?.operator),
    },
    comparisonType: fallbackComparisonType(chart.comparisonType),
    comparisonOp: chart.comparisonOp ?? 'gt',
    fixedValue: chart.fixedValue ?? 0,
    activeColor: chart.activeColor ?? '#22c55e',
    inactiveColor: chart.inactiveColor ?? '#ef4444',
    showBadge: chart.showBadge ?? true,
    badgePosition: fallbackBadgePosition(chart.badgePosition),
  };
}

export function normalizeCharts(config?: ImageEventConfig): EventCondition[] {
  if (config?.charts?.length) {
    return config.charts.map(normalizeChartEntry);
  }
  if (config?.events?.length) {
    return config.events.map(normalizeLegacyEvent);
  }
  return [];
}

export function createImageEventConfig(
  base: ImageEventConfig | undefined,
  charts: EventCondition[]
): ImageEventConfig {
  return {
    ...(base ?? {}),
    charts,
    events: undefined,
  };
}
