import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Spinner } from '@faclon-labs/design-sdk';
import { evaluateCondition, fetchConditionValue } from '../../iosense-sdk/api';
import { normalizeCharts } from '../../iosense-sdk/config';
import type { EventCondition, ImageEventConfig } from '../../iosense-sdk/types';
import './ImageEvent.css';

interface WidgetProps {
  config: ImageEventConfig;
  authentication: string;
}

interface ConditionState {
  id: string;
  active: boolean;
  value: number | null;
  loading: boolean;
}

const BADGE_POSITION_CLASS: Record<string, string> = {
  'top-left':     'image-event__badge--top-left',
  'top-right':    'image-event__badge--top-right',
  'bottom-left':  'image-event__badge--bottom-left',
  'bottom-right': 'image-event__badge--bottom-right',
  'center':       'image-event__badge--center',
};

export function ImageEvent({ config, authentication }: WidgetProps) {
  const [conditionStates, setConditionStates] = useState<ConditionState[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const charts = useMemo(() => normalizeCharts(config), [config]);

  const pollIntervalMs = (config?.pollIntervalSeconds ?? 30) * 1000;

  // Sync condition states when chart entries change
  useEffect(() => {
    setConditionStates(
      charts.map((chart) => ({ id: chart.id, active: false, value: null, loading: true }))
    );
  }, [charts]);

  // Fetch all condition values
  const fetchAll = useCallback(async () => {
    if (charts.length === 0) return;

    const results = await Promise.all(
      charts.map(async (condition: EventCondition) => {
        try {
          const value = await fetchConditionValue(authentication, condition);
          const active = evaluateCondition(value, condition);
          return { id: condition.id, active, value, loading: false };
        } catch {
          return { id: condition.id, active: false, value: null, loading: false };
        }
      })
    );
    setConditionStates(results);
  }, [authentication, charts]);

  // Initial fetch + polling
  useEffect(() => {
    if (charts.length === 0) return;

    fetchAll();
    timerRef.current = setInterval(fetchAll, pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [charts.length, fetchAll, pollIntervalMs]);

  // Resolve display dimensions
  const imageWidth = config?.imageWidth
    ? `${config.imageWidth}px`
    : config?.imageNaturalWidth
      ? `${config.imageNaturalWidth}px`
      : '100%';

  const imageHeight = config?.imageHeight
    ? `${config.imageHeight}px`
    : config?.imageNaturalHeight
      ? `${config.imageNaturalHeight}px`
      : 'auto';

  const imageFit = config?.imageFit ?? 'contain';

  // Card / container inline overrides
  const containerStyle: React.CSSProperties = {};
  if (config?.wrapInCard) {
    if (config.cardBgColor) containerStyle.backgroundColor = config.cardBgColor;
    if (config.cardBorderColor) containerStyle.borderColor = config.cardBorderColor;
    if (config.cardBorderWidth != null) containerStyle.borderWidth = `${config.cardBorderWidth}px`;
    if (config.cardBorderRadius != null) containerStyle.borderRadius = `${config.cardBorderRadius}px`;
    if (config.cardPadding != null) containerStyle.padding = `${config.cardPadding}px`;
  }

  const imageStyle: React.CSSProperties = {
    width: imageWidth,
    height: imageHeight,
    objectFit: imageFit,
    borderRadius: config?.imageBorderRadius != null ? `${config.imageBorderRadius}px` : undefined,
  };

  const hasImage = Boolean(config?.imageData);
  const hasCharts = charts.length > 0;
  const isAnyLoading = conditionStates.some((s) => s.loading) && hasCharts;

  return (
    <div
      className={`image-event${config?.wrapInCard ? ' image-event--card' : ''}`}
      style={containerStyle}
    >
      {/* Loading overlay */}
      {isAnyLoading && (
        <div className="image-event__loading-overlay">
          <Spinner size="medium" />
        </div>
      )}

      {/* Image or placeholder */}
      {hasImage ? (
        <div className="image-event__image-wrap">
          <img
            className="image-event__img"
            src={config.imageData}
            alt={config.imageName ?? 'Event image'}
            style={imageStyle}
          />

          {/* Event badges */}
          {hasCharts &&
            charts.map((condition: EventCondition) => {
              if (!condition.showBadge) return null;
              const state = conditionStates.find((s) => s.id === condition.id);
              const isActive = state?.active ?? false;
              const badgeColor = isActive ? condition.activeColor : condition.inactiveColor;
              const posClass =
                BADGE_POSITION_CLASS[condition.badgePosition] ??
                BADGE_POSITION_CLASS['top-right'];

              return (
                <div
                  key={condition.id}
                  className={`image-event__badge ${posClass}`}
                  style={{ backgroundColor: badgeColor }}
                  title={`${condition.label}: ${isActive ? 'Active' : 'Inactive'}${state?.value != null ? ` (${state.value})` : ''}`}
                >
                  <span className="image-event__badge-label">{condition.label}</span>
                  <span
                    className={`image-event__badge-dot${isActive ? ' image-event__badge-dot--active' : ''}`}
                  />
                </div>
              );
            })}
        </div>
      ) : (
        <div className="image-event__placeholder">
          <svg
            className="image-event__placeholder-icon"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="4"
              y="12"
              width="56"
              height="40"
              rx="4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <circle cx="22" cy="26" r="5" stroke="currentColor" strokeWidth="2" />
            <path
              d="M4 44 L18 30 L28 40 L38 28 L60 44"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M32 20 L32 12 M28 16 L32 12 L36 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="image-event__placeholder-text">No image configured</p>
          <p className="image-event__placeholder-hint">
            Open the widget settings to upload an image
          </p>
        </div>
      )}

      {/* Event status list (no-badge events shown as status row) */}
      {hasCharts && conditionStates.length > 0 && (
        <div className="image-event__status-bar">
          {charts
            .filter((e: EventCondition) => !e.showBadge)
            .map((condition: EventCondition) => {
              const state = conditionStates.find((s) => s.id === condition.id);
              const isActive = state?.active ?? false;
              const dotColor = isActive ? condition.activeColor : condition.inactiveColor;
              return (
                <div key={condition.id} className="image-event__status-item">
                  <span
                    className="image-event__status-dot"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="image-event__status-label">{condition.label}</span>
                  {state?.value != null && (
                    <span className="image-event__status-value">
                      {typeof state.value === 'number'
                        ? state.value.toFixed(2)
                        : state.value}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
