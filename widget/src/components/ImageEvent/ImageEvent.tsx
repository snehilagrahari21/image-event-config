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

interface ConditionResult {
  id: string;
  active: boolean;
  value: number | null;
  loading: boolean;
}

export function ImageEvent({ config, authentication }: WidgetProps) {
  const [charts, setCharts] = useState<EventCondition[]>([]);
  const [conditionResults, setConditionResults] = useState<ConditionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync charts from config via useEffect (Skills.md rule)
  useEffect(() => {
    setCharts(normalizeCharts(config));
  }, [config]);

  const pollIntervalMs = (config?.pollIntervalSeconds ?? 30) * 1000;

  // Initialize condition results when charts change
  useEffect(() => {
    setConditionResults(
      charts.map((c) => ({ id: c.id, active: false, value: null, loading: true }))
    );
  }, [charts]);

  // Fetch all condition values and evaluate
  const fetchAll = useCallback(async () => {
    if (charts.length === 0) return;
    setLoading(true);

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

    setConditionResults(results);
    setLoading(false);
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

  // Determine which image to display:
  // First matching condition's image wins, otherwise default image
  const activeImage = useMemo(() => {
    for (let i = 0; i < charts.length; i++) {
      const result = conditionResults.find((r) => r.id === charts[i].id);
      if (result?.active && charts[i].image) {
        return { src: charts[i].image!, alt: charts[i].imageName ?? charts[i].label };
      }
    }
    // Fallback to default image
    if (config?.imageData) {
      return { src: config.imageData, alt: config.imageName ?? 'Default image' };
    }
    return null;
  }, [charts, conditionResults, config?.imageData, config?.imageName]);

  const imageFit = config?.imageFit ?? 'contain';
  const hasCharts = charts.length > 0;
  const isLoading = loading && hasCharts && conditionResults.some((r) => r.loading);

  return (
    <div
      className={`image-event${config?.wrapInCard ? ' image-event--card' : ''}`}
    >
      {/* Loading indicator */}
      {isLoading && (
        <div className="image-event__loading-overlay">
          <Spinner size="medium" />
        </div>
      )}

      {activeImage ? (
        <div className="image-event__image-wrap">
          <img
            className="image-event__img"
            src={activeImage.src}
            alt={activeImage.alt}
            style={{
              objectFit: imageFit,
              borderRadius: config?.imageBorderRadius != null
                ? `${config.imageBorderRadius}px`
                : undefined,
            }}
          />
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
    </div>
  );
}
