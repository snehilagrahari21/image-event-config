import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionItem,
  ActionListItem,
  ActionListItemGroup,
  AutocompleteInput,
  Button,
  Divider,
  DropdownMenu,
  IconButton,
  Radio,
  RadioGroup,
  SelectInput,
  Spinner,
  Switch,
  TabItem,
  Tabs,
  TextInput,
  UploadCta,
} from '@faclon-labs/design-sdk';
import { findUserDevices } from '../../iosense-sdk/api';
import type {
  BadgePosition,
  ComparisonOp,
  Device,
  DeviceSensor,
  EventCondition,
  EventOperator,
  ImageEventConfig,
  ImageFit,
  SourceType,
} from '../../iosense-sdk/types';
import './ImageEventConfiguration.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const OPERATORS: { value: EventOperator; label: string }[] = [
  { value: 'LastDP',      label: 'Last Data Point' },
  { value: 'Mean',        label: 'Mean' },
  { value: 'Min',         label: 'Min' },
  { value: 'Max',         label: 'Max' },
  { value: 'Sum',         label: 'Sum' },
  { value: 'Consumption', label: 'Consumption' },
  { value: 'FirstDP',     label: 'First Data Point' },
];

const COMPARISON_OPS: { value: ComparisonOp; label: string }[] = [
  { value: 'eq',  label: 'Equal to (=)' },
  { value: 'neq', label: 'Not equal to (≠)' },
  { value: 'gt',  label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (≥)' },
  { value: 'lt',  label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (≤)' },
];

const BADGE_POSITIONS: { value: BadgePosition; label: string }[] = [
  { value: 'top-left',     label: 'Top Left' },
  { value: 'top-right',    label: 'Top Right' },
  { value: 'bottom-left',  label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center',       label: 'Center' },
];

const IMAGE_FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: 'contain', label: 'Contain' },
  { value: 'cover',   label: 'Cover' },
  { value: 'fill',    label: 'Fill' },
];

const POLL_INTERVAL_OPTIONS = [
  { value: '5',   label: 'Every 5 seconds' },
  { value: '10',  label: 'Every 10 seconds' },
  { value: '30',  label: 'Every 30 seconds' },
  { value: '60',  label: 'Every minute' },
  { value: '300', label: 'Every 5 minutes' },
];

// ─── Generate a simple unique ID ──────────────────────────────────────────────

function genId(): string {
  return `ev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ─── Default event ─────────────────────────────────────────────────────────────

function makeDefaultEvent(): EventCondition {
  return {
    id: genId(),
    label: 'New Event',
    sourceType: 'device',
    operator: 'LastDP',
    comparisonType: 'fixed',
    comparisonOp: 'gt',
    fixedValue: 0,
    activeColor: '#22c55e',
    inactiveColor: '#ef4444',
    showBadge: true,
    badgePosition: 'top-right',
  };
}

// ─── ColorInput helper ────────────────────────────────────────────────────────

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  const [open, setOpen] = useState(false);

  const swatch = (
    <button
      type="button"
      className="ie-config__color-swatch"
      style={{ backgroundColor: value || '#cccccc' }}
      onClick={() => setOpen((o) => !o)}
      aria-label="Open color picker"
    />
  );

  return (
    <div className="ie-config__color-wrap">
      <TextInput
        label={label}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        suffix={swatch}
      />
      {open && (
        <div className="ie-config__native-color-wrap">
          <input
            type="color"
            value={value || '#cccccc'}
            onChange={(e) => { onChange(e.target.value); }}
            className="ie-config__native-color"
          />
          <Button
            variant="Tertiary"
            label="Close"
            size="small"
            onClick={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Device picker sub-form ───────────────────────────────────────────────────

interface DevicePickerProps {
  authentication: string;
  devID: string;
  devName: string;
  sensorId: string;
  sensorName: string;
  operator: EventOperator;
  sensors: DeviceSensor[];
  onDeviceSearch: (q: string) => void;
  deviceOptions: Device[];
  deviceLoading: boolean;
  onDeviceSelect: (device: Device) => void;
  onSensorSelect: (sensorId: string, sensorName: string) => void;
  onOperatorSelect: (op: EventOperator) => void;
}

function DevicePicker({
  devName,
  sensorId,
  operator,
  sensors,
  onDeviceSearch,
  deviceOptions,
  deviceLoading,
  onDeviceSelect,
  onSensorSelect,
  onOperatorSelect,
}: DevicePickerProps) {
  return (
    <div className="ie-config__field-col">
      {/* Device search */}
      <AutocompleteInput
        label="Device"
        type="single"
        inputValue={devName}
        onInputChange={onDeviceSearch}
      >
        <DropdownMenu>
          {deviceLoading ? (
            <ActionListItem contentType="Item" title="Searching…" isDisabled />
          ) : deviceOptions.length === 0 ? (
            <ActionListItem contentType="Item" title="No devices found" isDisabled />
          ) : (
            <ActionListItemGroup>
              {deviceOptions.map((d) => (
                <ActionListItem
                  key={d.devID}
                  contentType="Item"
                  title={d.devName}
                  description={d.devID}
                  onClick={() => onDeviceSelect(d)}
                />
              ))}
            </ActionListItemGroup>
          )}
        </DropdownMenu>
      </AutocompleteInput>

      {/* Sensor */}
      <SelectInput
        label="Sensor"
        value={sensorId}
      >
        <DropdownMenu>
          {sensors.length === 0 ? (
            <ActionListItem contentType="Item" title="Select a device first" isDisabled />
          ) : (
            <ActionListItemGroup>
              {sensors.map((s) => (
                <ActionListItem
                  key={s.sensorId}
                  contentType="Item"
                  title={s.sensorName}
                  description={s.sensorId}
                  isSelected={s.sensorId === sensorId}
                  onClick={() => onSensorSelect(s.sensorId, s.sensorName)}
                />
              ))}
            </ActionListItemGroup>
          )}
        </DropdownMenu>
      </SelectInput>

      {/* Operator */}
      <SelectInput label="Operator" value={operator}>
        <DropdownMenu>
          <ActionListItemGroup>
            {OPERATORS.map((op) => (
              <ActionListItem
                key={op.value}
                contentType="Item"
                title={op.label}
                isSelected={op.value === operator}
                onClick={() => onOperatorSelect(op.value)}
              />
            ))}
          </ActionListItemGroup>
        </DropdownMenu>
      </SelectInput>
    </div>
  );
}

// ─── Single event form ────────────────────────────────────────────────────────

interface EventFormProps {
  event: EventCondition;
  authentication: string;
  onChange: (updated: EventCondition) => void;
  onDelete: () => void;
}

function EventForm({ event, authentication, onChange, onDelete }: EventFormProps) {
  const [deviceOptions, setDeviceOptions] = useState<Device[]>([]);
  const [deviceLoading, setDeviceLoading] = useState(false);
  const [sensors, setSensors] = useState<DeviceSensor[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload sensors when devID changes
  useEffect(() => {
    if (event.sourceType === 'device' && event.devID) {
      // Sensors come with findUserDevices result, keep them from last selection
    }
  }, [event.devID, event.sourceType]);

  const patch = useCallback(
    (partial: Partial<EventCondition>) => onChange({ ...event, ...partial }),
    [event, onChange]
  );

  function handleDeviceSearch(q: string) {
    patch({ devName: q, devID: '', sensorId: '', sensorName: '' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setDeviceLoading(true);
      try {
        const results = await findUserDevices(authentication, q);
        setDeviceOptions(results);
      } catch {
        setDeviceOptions([]);
      } finally {
        setDeviceLoading(false);
      }
    }, 300);
  }

  function handleDeviceSelect(device: Device) {
    setSensors(device.sensors ?? []);
    patch({
      devID: device.devID,
      devName: device.devName,
      sensorId: '',
      sensorName: '',
    });
  }

  return (
    <div className="ie-config__event-form">
      {/* Label + delete */}
      <div className="ie-config__event-header">
        <div className="ie-config__field-grow">
          <TextInput
            label="Event Label"
            value={event.label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patch({ label: e.target.value })
            }
          />
        </div>
        <IconButton
          icon="Trash2"
          variant="Tertiary"
          color="Negative"
          size="medium"
          onClick={onDelete}
        />
      </div>

      {/* Source type */}
      <RadioGroup
        name={`source-type-${event.id}`}
        value={event.sourceType}
        onChange={(v: string) => patch({ sourceType: v as SourceType })}
        orientation="Horizontal"
      >
        <Radio label="Device" value="device" />
        <Radio label="Cluster" value="cluster" />
        <Radio label="Compute" value="compute" />
      </RadioGroup>

      {/* Source-specific fields */}
      {event.sourceType === 'device' && (
        <DevicePicker
          authentication={authentication}
          devID={event.devID ?? ''}
          devName={event.devName ?? ''}
          sensorId={event.sensorId ?? ''}
          sensorName={event.sensorName ?? ''}
          operator={event.operator}
          sensors={sensors}
          onDeviceSearch={handleDeviceSearch}
          deviceOptions={deviceOptions}
          deviceLoading={deviceLoading}
          onDeviceSelect={handleDeviceSelect}
          onSensorSelect={(id, name) => patch({ sensorId: id, sensorName: name })}
          onOperatorSelect={(op) => patch({ operator: op })}
        />
      )}

      {event.sourceType === 'cluster' && (
        <div className="ie-config__field-col">
          <TextInput
            label="Cluster ID"
            value={event.clusterID ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patch({ clusterID: e.target.value })
            }
          />
          <SelectInput label="Operator" value={event.operator}>
            <DropdownMenu>
              <ActionListItemGroup>
                {OPERATORS.map((op) => (
                  <ActionListItem
                    key={op.value}
                    contentType="Item"
                    title={op.label}
                    isSelected={op.value === event.operator}
                    onClick={() => patch({ operator: op.value })}
                  />
                ))}
              </ActionListItemGroup>
            </DropdownMenu>
          </SelectInput>
        </div>
      )}

      {event.sourceType === 'compute' && (
        <div className="ie-config__field-col">
          <TextInput
            label="Flow ID"
            value={event.flowId ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patch({ flowId: e.target.value })
            }
          />
          <TextInput
            label="Flow Parameters (JSON)"
            value={event.flowParams ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patch({ flowParams: e.target.value })
            }
          />
          <SelectInput label="Operator" value={event.operator}>
            <DropdownMenu>
              <ActionListItemGroup>
                {OPERATORS.map((op) => (
                  <ActionListItem
                    key={op.value}
                    contentType="Item"
                    title={op.label}
                    isSelected={op.value === event.operator}
                    onClick={() => patch({ operator: op.value })}
                  />
                ))}
              </ActionListItemGroup>
            </DropdownMenu>
          </SelectInput>
        </div>
      )}

      <Divider />

      {/* Comparison type */}
      <RadioGroup
        name={`comparison-type-${event.id}`}
        value={event.comparisonType}
        onChange={(v: string) => patch({ comparisonType: v as 'fixed' | 'range' })}
        orientation="Horizontal"
      >
        <Radio label="Fixed Value" value="fixed" />
        <Radio label="Min / Max Range" value="range" />
      </RadioGroup>

      {event.comparisonType === 'fixed' && (
        <div className="ie-config__field-row">
          <div className="ie-config__field-grow">
            <SelectInput label="Condition" value={event.comparisonOp ?? 'gt'}>
              <DropdownMenu>
                <ActionListItemGroup>
                  {COMPARISON_OPS.map((op) => (
                    <ActionListItem
                      key={op.value}
                      contentType="Item"
                      title={op.label}
                      isSelected={(event.comparisonOp ?? 'gt') === op.value}
                      onClick={() => patch({ comparisonOp: op.value })}
                    />
                  ))}
                </ActionListItemGroup>
              </DropdownMenu>
            </SelectInput>
          </div>
          <div className="ie-config__field-grow">
            <TextInput
              label="Value"
              type="number"
              value={String(event.fixedValue ?? 0)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                patch({ fixedValue: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      )}

      {event.comparisonType === 'range' && (
        <div className="ie-config__field-row">
          <div className="ie-config__field-grow">
            <TextInput
              label="Min Value"
              type="number"
              value={String(event.minValue ?? '')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                patch({ minValue: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="ie-config__field-grow">
            <TextInput
              label="Max Value"
              type="number"
              value={String(event.maxValue ?? '')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                patch({ maxValue: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      )}

      <Divider />

      {/* Colors */}
      <div className="ie-config__field-row">
        <div className="ie-config__field-grow">
          <ColorInput
            label="Active Color"
            value={event.activeColor}
            onChange={(v) => patch({ activeColor: v })}
          />
        </div>
        <div className="ie-config__field-grow">
          <ColorInput
            label="Inactive Color"
            value={event.inactiveColor}
            onChange={(v) => patch({ inactiveColor: v })}
          />
        </div>
      </div>

      {/* Badge */}
      <Switch
        label="Show Badge on Image"
        isChecked={event.showBadge}
        onChange={(checked: boolean) => patch({ showBadge: checked })}
      />

      {event.showBadge && (
        <SelectInput label="Badge Position" value={event.badgePosition}>
          <DropdownMenu>
            <ActionListItemGroup>
              {BADGE_POSITIONS.map((pos) => (
                <ActionListItem
                  key={pos.value}
                  contentType="Item"
                  title={pos.label}
                  isSelected={event.badgePosition === pos.value}
                  onClick={() => patch({ badgePosition: pos.value })}
                />
              ))}
            </ActionListItemGroup>
          </DropdownMenu>
        </SelectInput>
      )}
    </div>
  );
}

// ─── Configuration panel ──────────────────────────────────────────────────────

interface ConfigurationProps {
  config: ImageEventConfig;
  authentication: string;
  onChange: (config: ImageEventConfig) => void;
}

export function ImageEventConfiguration({
  config,
  authentication,
  onChange,
}: ConfigurationProps) {
  // ── Sync config into local state ───────────────────────────────────────────
  const [imageData, setImageData]               = useState(config?.imageData ?? '');
  const [imageName, setImageName]               = useState(config?.imageName ?? '');
  const [naturalWidth, setNaturalWidth]         = useState(config?.imageNaturalWidth ?? 0);
  const [naturalHeight, setNaturalHeight]       = useState(config?.imageNaturalHeight ?? 0);
  const [imageWidth, setImageWidth]             = useState(String(config?.imageWidth ?? config?.imageNaturalWidth ?? ''));
  const [imageHeight, setImageHeight]           = useState(String(config?.imageHeight ?? config?.imageNaturalHeight ?? ''));
  const [lockAspect, setLockAspect]             = useState(true);
  const [imageFit, setImageFit]                 = useState<ImageFit>(config?.imageFit ?? 'contain');
  const [events, setEvents]                     = useState<EventCondition[]>(config?.events ?? []);
  const [pollInterval, setPollInterval]         = useState(String(config?.pollIntervalSeconds ?? 30));
  const [wrapInCard, setWrapInCard]             = useState(config?.wrapInCard ?? false);
  const [cardBgColor, setCardBgColor]           = useState(config?.cardBgColor ?? '#ffffff');
  const [cardBorderColor, setCardBorderColor]   = useState(config?.cardBorderColor ?? '#e5e7eb');
  const [cardBorderWidth, setCardBorderWidth]   = useState(String(config?.cardBorderWidth ?? 1));
  const [cardBorderRadius, setCardBorderRadius] = useState(String(config?.cardBorderRadius ?? 8));
  const [cardPadding, setCardPadding]           = useState(String(config?.cardPadding ?? 12));
  const [imageBorderRadius, setImageBorderRadius] = useState(String(config?.imageBorderRadius ?? 0));
  const [activeTab, setActiveTab]               = useState(0);

  useEffect(() => {
    setImageData(config?.imageData ?? '');
    setImageName(config?.imageName ?? '');
    setNaturalWidth(config?.imageNaturalWidth ?? 0);
    setNaturalHeight(config?.imageNaturalHeight ?? 0);
    setImageWidth(String(config?.imageWidth ?? config?.imageNaturalWidth ?? ''));
    setImageHeight(String(config?.imageHeight ?? config?.imageNaturalHeight ?? ''));
    setImageFit(config?.imageFit ?? 'contain');
    setEvents(config?.events ?? []);
    setPollInterval(String(config?.pollIntervalSeconds ?? 30));
    setWrapInCard(config?.wrapInCard ?? false);
    setCardBgColor(config?.cardBgColor ?? '#ffffff');
    setCardBorderColor(config?.cardBorderColor ?? '#e5e7eb');
    setCardBorderWidth(String(config?.cardBorderWidth ?? 1));
    setCardBorderRadius(String(config?.cardBorderRadius ?? 8));
    setCardPadding(String(config?.cardPadding ?? 12));
    setImageBorderRadius(String(config?.imageBorderRadius ?? 0));
  }, [config]);

  // ── Emit on every state change ─────────────────────────────────────────────
  const emit = useCallback(
    (overrides: Partial<ImageEventConfig> = {}) => {
      onChange({
        imageData,
        imageName,
        imageNaturalWidth: naturalWidth,
        imageNaturalHeight: naturalHeight,
        imageWidth: imageWidth ? parseInt(imageWidth, 10) : undefined,
        imageHeight: imageHeight ? parseInt(imageHeight, 10) : undefined,
        imageFit,
        events,
        pollIntervalSeconds: parseInt(pollInterval, 10) || 30,
        wrapInCard,
        cardBgColor,
        cardBorderColor,
        cardBorderWidth: parseInt(cardBorderWidth, 10) || 0,
        cardBorderRadius: parseInt(cardBorderRadius, 10) || 0,
        cardPadding: parseInt(cardPadding, 10) || 0,
        imageBorderRadius: parseInt(imageBorderRadius, 10) || 0,
        ...overrides,
      });
    },
    [
      imageData, imageName, naturalWidth, naturalHeight,
      imageWidth, imageHeight, imageFit,
      events, pollInterval,
      wrapInCard, cardBgColor, cardBorderColor,
      cardBorderWidth, cardBorderRadius, cardPadding, imageBorderRadius,
    ]
  );

  // ── Image upload ───────────────────────────────────────────────────────────
  function handleFilesSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Read natural dimensions
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        setImageData(dataUrl);
        setImageName(file.name);
        setNaturalWidth(nw);
        setNaturalHeight(nh);
        setImageWidth(String(nw));
        setImageHeight(String(nh));
        onChange({
          ...(config ?? {}),
          imageData: dataUrl,
          imageName: file.name,
          imageNaturalWidth: nw,
          imageNaturalHeight: nh,
          imageWidth: nw,
          imageHeight: nh,
          imageFit,
          events,
          pollIntervalSeconds: parseInt(pollInterval, 10) || 30,
          wrapInCard,
          cardBgColor,
          cardBorderColor,
          cardBorderWidth: parseInt(cardBorderWidth, 10) || 0,
          cardBorderRadius: parseInt(cardBorderRadius, 10) || 0,
          cardPadding: parseInt(cardPadding, 10) || 0,
          imageBorderRadius: parseInt(imageBorderRadius, 10) || 0,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImageData('');
    setImageName('');
    setNaturalWidth(0);
    setNaturalHeight(0);
    setImageWidth('');
    setImageHeight('');
    emit({ imageData: '', imageName: '', imageNaturalWidth: 0, imageNaturalHeight: 0, imageWidth: undefined, imageHeight: undefined });
  }

  function handleWidthChange(v: string) {
    setImageWidth(v);
    if (lockAspect && naturalWidth && naturalHeight && v) {
      const ratio = naturalHeight / naturalWidth;
      const newH = Math.round(parseInt(v, 10) * ratio);
      setImageHeight(String(newH));
      emit({ imageWidth: parseInt(v, 10), imageHeight: newH });
    } else {
      emit({ imageWidth: v ? parseInt(v, 10) : undefined });
    }
  }

  function handleHeightChange(v: string) {
    setImageHeight(v);
    if (lockAspect && naturalWidth && naturalHeight && v) {
      const ratio = naturalWidth / naturalHeight;
      const newW = Math.round(parseInt(v, 10) * ratio);
      setImageWidth(String(newW));
      emit({ imageHeight: parseInt(v, 10), imageWidth: newW });
    } else {
      emit({ imageHeight: v ? parseInt(v, 10) : undefined });
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function addEvent() {
    const updated = [...events, makeDefaultEvent()];
    setEvents(updated);
    emit({ events: updated });
  }

  function updateEvent(index: number, updated: EventCondition) {
    const next = events.map((e, i) => (i === index ? updated : e));
    setEvents(next);
    emit({ events: next });
  }

  function deleteEvent(index: number) {
    const next = events.filter((_, i) => i !== index);
    setEvents(next);
    emit({ events: next });
  }

  // ─── Tabs ──────────────────────────────────────────────────────────────────

  return (
    <div className="ie-config">
      <Tabs variant="Bordered" isFullWidth>
        <TabItem
          label="Image"
          isSelected={activeTab === 0}
          onClick={() => setActiveTab(0)}
        />
        <TabItem
          label="Events"
          isSelected={activeTab === 1}
          onClick={() => setActiveTab(1)}
        />
        <TabItem
          label="Style"
          isSelected={activeTab === 2}
          onClick={() => setActiveTab(2)}
        />
      </Tabs>

      {/* ── Tab 1: Image ── */}
      {activeTab === 0 && (
        <div className="ie-config__tab-body">
          {/* Upload area */}
          {!imageData ? (
            <div className="ie-config__field-col">
              <UploadCta
                bodyText="Drag and drop an image here"
                linkText="Browse files"
                accept="image/*"
                multiple={false}
                onFilesSelect={handleFilesSelect}
              />
            </div>
          ) : (
            <div className="ie-config__image-preview-wrap">
              <img
                className="ie-config__image-preview"
                src={imageData}
                alt={imageName}
              />
              <div className="ie-config__image-meta">
                <span className="ie-config__image-name">{imageName}</span>
                <span className="ie-config__image-dims">
                  {naturalWidth} × {naturalHeight} px
                </span>
              </div>
              <Button
                variant="Tertiary"
                color="Negative"
                label="Remove Image"
                size="small"
                onClick={handleRemoveImage}
              />
            </div>
          )}

          <Divider />

          {/* Dimensions */}
          <Accordion mode="single" defaultExpandedKeys={['dimensions']}>
            <AccordionItem title="Image Dimensions" value="dimensions">
              <div className="ie-config__accordion-body">
                <div className="ie-config__field-row">
                  <div className="ie-config__field-grow">
                    <TextInput
                      label="Width (px)"
                      type="number"
                      value={imageWidth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleWidthChange(e.target.value)
                      }
                    />
                  </div>
                  <div className="ie-config__field-grow">
                    <TextInput
                      label="Height (px)"
                      type="number"
                      value={imageHeight}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleHeightChange(e.target.value)
                      }
                    />
                  </div>
                </div>

                <Switch
                  label="Lock aspect ratio"
                  isChecked={lockAspect}
                  onChange={(checked: boolean) => setLockAspect(checked)}
                />

                <SelectInput label="Image Fit" value={imageFit}>
                  <DropdownMenu>
                    <ActionListItemGroup>
                      {IMAGE_FIT_OPTIONS.map((o) => (
                        <ActionListItem
                          key={o.value}
                          contentType="Item"
                          title={o.label}
                          isSelected={imageFit === o.value}
                          onClick={() => {
                            setImageFit(o.value);
                            emit({ imageFit: o.value });
                          }}
                        />
                      ))}
                    </ActionListItemGroup>
                  </DropdownMenu>
                </SelectInput>
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* ── Tab 2: Events ── */}
      {activeTab === 1 && (
        <div className="ie-config__tab-body">
          {/* Poll interval */}
          <div className="ie-config__field-col">
            <SelectInput label="Polling Interval" value={pollInterval}>
              <DropdownMenu>
                <ActionListItemGroup>
                  {POLL_INTERVAL_OPTIONS.map((o) => (
                    <ActionListItem
                      key={o.value}
                      contentType="Item"
                      title={o.label}
                      isSelected={pollInterval === o.value}
                      onClick={() => {
                        setPollInterval(o.value);
                        emit({ pollIntervalSeconds: parseInt(o.value, 10) });
                      }}
                    />
                  ))}
                </ActionListItemGroup>
              </DropdownMenu>
            </SelectInput>
          </div>

          <Divider />

          {/* Events list */}
          {events.length === 0 ? (
            <div className="ie-config__empty-events">
              <p className="ie-config__empty-text">No event conditions configured.</p>
            </div>
          ) : (
            <Accordion mode="multiple">
              {events.map((event, index) => (
                <AccordionItem
                  key={event.id}
                  title={event.label || `Event ${index + 1}`}
                  value={event.id}
                >
                  <div className="ie-config__accordion-body">
                    <EventForm
                      event={event}
                      authentication={authentication}
                      onChange={(updated) => updateEvent(index, updated)}
                      onDelete={() => deleteEvent(index)}
                    />
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          )}

          <div className="ie-config__add-row">
            <Button
              variant="Secondary"
              label="Add Event Condition"
              size="medium"
              onClick={addEvent}
            />
          </div>
        </div>
      )}

      {/* ── Tab 3: Style ── */}
      {activeTab === 2 && (
        <div className="ie-config__tab-body">
          <Accordion mode="multiple" defaultExpandedKeys={['image-style', 'card-style']}>
            {/* Image styling */}
            <AccordionItem title="Image Styling" value="image-style">
              <div className="ie-config__accordion-body">
                <TextInput
                  label="Border Radius (px)"
                  type="number"
                  value={imageBorderRadius}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setImageBorderRadius(e.target.value);
                    emit({ imageBorderRadius: parseInt(e.target.value, 10) || 0 });
                  }}
                />
              </div>
            </AccordionItem>

            {/* Card styling */}
            <AccordionItem title="Card Styling" value="card-style">
              <div className="ie-config__accordion-body">
                <Switch
                  label="Wrap in Card"
                  isChecked={wrapInCard}
                  onChange={(checked: boolean) => {
                    setWrapInCard(checked);
                    emit({ wrapInCard: checked });
                  }}
                />

                {wrapInCard && (
                  <>
                    <ColorInput
                      label="Background Color"
                      value={cardBgColor}
                      onChange={(v) => { setCardBgColor(v); emit({ cardBgColor: v }); }}
                    />
                    <ColorInput
                      label="Border Color"
                      value={cardBorderColor}
                      onChange={(v) => { setCardBorderColor(v); emit({ cardBorderColor: v }); }}
                    />
                    <TextInput
                      label="Border Width (px)"
                      type="number"
                      value={cardBorderWidth}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setCardBorderWidth(e.target.value);
                        emit({ cardBorderWidth: parseInt(e.target.value, 10) || 0 });
                      }}
                    />
                    <TextInput
                      label="Border Radius (px)"
                      type="number"
                      value={cardBorderRadius}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setCardBorderRadius(e.target.value);
                        emit({ cardBorderRadius: parseInt(e.target.value, 10) || 0 });
                      }}
                    />
                    <TextInput
                      label="Padding (px)"
                      type="number"
                      value={cardPadding}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setCardPadding(e.target.value);
                        emit({ cardPadding: parseInt(e.target.value, 10) || 0 });
                      }}
                    />
                  </>
                )}
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
}
