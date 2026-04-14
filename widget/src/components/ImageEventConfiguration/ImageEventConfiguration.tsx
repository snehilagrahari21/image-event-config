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
  Switch,
  TabItem,
  Tabs,
  TextInput,
  UploadCta,
} from '@faclon-labs/design-sdk';
import {
  makeDefaultChartEntry,
  normalizeCharts,
} from '../../iosense-sdk/config';
import { findUserDevices } from '../../iosense-sdk/api';
import type {
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

const CLUSTER_OPERATORS = [
  { value: 'Sum', label: 'Sum' },
  { value: 'Mean', label: 'Mean' },
  { value: 'Max', label: 'Max' },
  { value: 'Min', label: 'Min' },
  { value: 'Median', label: 'Median' },
  { value: 'Mode', label: 'Mode' },
];

const COMPARISON_OPS: { value: ComparisonOp; label: string }[] = [
  { value: 'eq',  label: 'Equal to (=)' },
  { value: 'neq', label: 'Not equal to (≠)' },
  { value: 'gt',  label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (≥)' },
  { value: 'lt',  label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (≤)' },
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId(): string {
  return `ev_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ─── ColorInput helper ───────────────────────────────────────────────────────

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
            onChange={(e) => onChange(e.target.value)}
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

// ─── Device picker sub-form ─────────────────────────────────────────────────

interface DevicePickerProps {
  devName: string;
  sensor: string;
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
  sensor,
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
      <AutocompleteInput
        label="Device"
        type="single"
        inputValue={devName}
        onInputChange={onDeviceSearch}
      >
        <DropdownMenu>
          {deviceLoading ? (
            <ActionListItem contentType="Item" title="Searching..." isDisabled />
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

      <SelectInput label="Sensor" value={sensor}>
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
                  isSelected={s.sensorId === sensor}
                  onClick={() => onSensorSelect(s.sensorId, s.sensorName)}
                />
              ))}
            </ActionListItemGroup>
          )}
        </DropdownMenu>
      </SelectInput>

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

// ─── Single event condition form ────────────────────────────────────────────

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
  const dataConfig = event.dataConfig;

  const patch = useCallback(
    (partial: Partial<EventCondition>) => onChange({ ...event, ...partial }),
    [event, onChange]
  );

  const patchDataConfig = useCallback(
    (partial: Partial<EventCondition['dataConfig']>) =>
      onChange({
        ...event,
        dataConfig: { ...event.dataConfig, ...partial },
      }),
    [event, onChange]
  );

  function handleDeviceSearch(q: string) {
    patch({ devName: q, sensorName: '' });
    patchDataConfig({ devID: '', devTypeID: '', sensor: '' });
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
    patch({ devName: device.devName, sensorName: '' });
    patchDataConfig({
      devID: device.devID,
      devTypeID: device.devTypeID,
      sensor: '',
    });
  }

  function handleConditionImageUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      patch({ image: dataUrl, imageName: file.name });
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveConditionImage() {
    patch({ image: undefined, imageName: undefined });
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

      {/* Conditional image upload */}
      <div className="ie-config__field-col">
        <p className="ie-config__section-label">Condition Image</p>
        {!event.image ? (
          <UploadCta
            bodyText="Upload image for this condition"
            linkText="Browse files"
            accept="image/*"
            multiple={false}
            onFilesSelect={handleConditionImageUpload}
          />
        ) : (
          <div className="ie-config__condition-image-preview">
            <img
              className="ie-config__condition-image-thumb"
              src={event.image}
              alt={event.imageName ?? 'Condition image'}
            />
            <span className="ie-config__condition-image-name">
              {event.imageName ?? 'Uploaded image'}
            </span>
            <Button
              variant="Tertiary"
              color="Negative"
              label="Remove"
              size="small"
              onClick={handleRemoveConditionImage}
            />
          </div>
        )}
      </div>

      <Divider />

      {/* Source type */}
      <RadioGroup
        name={`source-type-${event.id}`}
        value={dataConfig.type}
        onChange={(v: string) =>
          patchDataConfig({
            type: v as SourceType,
            devID: undefined,
            devTypeID: undefined,
            sensor: undefined,
            clusterID: undefined,
            clusterOperator: undefined,
            flowID: undefined,
            flowParams: undefined,
            operator: 'LastDP',
          })
        }
        orientation="Horizontal"
      >
        <Radio label="Device" value="device" />
        <Radio label="Cluster" value="cluster" />
        <Radio label="Compute" value="compute" />
      </RadioGroup>

      {/* Source-specific fields */}
      {dataConfig.type === 'device' && (
        <DevicePicker
          devName={event.devName ?? ''}
          sensor={dataConfig.sensor ?? ''}
          operator={dataConfig.operator ?? 'LastDP'}
          sensors={sensors}
          onDeviceSearch={handleDeviceSearch}
          deviceOptions={deviceOptions}
          deviceLoading={deviceLoading}
          onDeviceSelect={handleDeviceSelect}
          onSensorSelect={(id, name) => {
            patch({ sensorName: name });
            patchDataConfig({ sensor: id });
          }}
          onOperatorSelect={(op) => patchDataConfig({ operator: op })}
        />
      )}

      {dataConfig.type === 'cluster' && (
        <div className="ie-config__field-col">
          <TextInput
            label="Cluster ID"
            value={dataConfig.clusterID ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patchDataConfig({ clusterID: e.target.value })
            }
          />
          <SelectInput label="Operator" value={dataConfig.operator ?? 'LastDP'}>
            <DropdownMenu>
              <ActionListItemGroup>
                {OPERATORS.map((op) => (
                  <ActionListItem
                    key={op.value}
                    contentType="Item"
                    title={op.label}
                    isSelected={op.value === (dataConfig.operator ?? 'LastDP')}
                    onClick={() => patchDataConfig({ operator: op.value })}
                  />
                ))}
              </ActionListItemGroup>
            </DropdownMenu>
          </SelectInput>
          <SelectInput
            label="Cluster Operator"
            value={dataConfig.clusterOperator ?? 'Sum'}
          >
            <DropdownMenu>
              <ActionListItemGroup>
                {CLUSTER_OPERATORS.map((op) => (
                  <ActionListItem
                    key={op.value}
                    contentType="Item"
                    title={op.label}
                    isSelected={op.value === (dataConfig.clusterOperator ?? 'Sum')}
                    onClick={() => patchDataConfig({ clusterOperator: op.value })}
                  />
                ))}
              </ActionListItemGroup>
            </DropdownMenu>
          </SelectInput>
        </div>
      )}

      {dataConfig.type === 'compute' && (
        <div className="ie-config__field-col">
          <TextInput
            label="Flow ID"
            value={dataConfig.flowID ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patchDataConfig({ flowID: e.target.value })
            }
          />
          <TextInput
            label="Flow Parameters (JSON)"
            value={dataConfig.flowParams ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              patchDataConfig({ flowParams: e.target.value })
            }
          />
          <SelectInput label="Operator" value={dataConfig.operator ?? 'LastDP'}>
            <DropdownMenu>
              <ActionListItemGroup>
                {OPERATORS.map((op) => (
                  <ActionListItem
                    key={op.value}
                    contentType="Item"
                    title={op.label}
                    isSelected={op.value === (dataConfig.operator ?? 'LastDP')}
                    onClick={() => patchDataConfig({ operator: op.value })}
                  />
                ))}
              </ActionListItemGroup>
            </DropdownMenu>
          </SelectInput>
        </div>
      )}

      <Divider />

      {/* Comparison condition */}
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
    </div>
  );
}

// ─── Configuration panel ────────────────────────────────────────────────────

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
  // ── Sync config into local state via useEffect (Skills.md rule) ───────────
  const [imageData, setImageData]               = useState(config?.imageData ?? '');
  const [imageName, setImageName]               = useState(config?.imageName ?? '');
  const [naturalWidth, setNaturalWidth]         = useState(config?.imageNaturalWidth ?? 0);
  const [naturalHeight, setNaturalHeight]       = useState(config?.imageNaturalHeight ?? 0);
  const [imageWidth, setImageWidth]             = useState(String(config?.imageWidth ?? ''));
  const [imageHeight, setImageHeight]           = useState(String(config?.imageHeight ?? ''));
  const [lockAspect, setLockAspect]             = useState(true);
  const [imageFit, setImageFit]                 = useState<ImageFit>(config?.imageFit ?? 'contain');
  const [charts, setCharts]                     = useState<EventCondition[]>(normalizeCharts(config));
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
    setImageWidth(String(config?.imageWidth ?? ''));
    setImageHeight(String(config?.imageHeight ?? ''));
    setImageFit(config?.imageFit ?? 'contain');
    setCharts(normalizeCharts(config));
    setPollInterval(String(config?.pollIntervalSeconds ?? 30));
    setWrapInCard(config?.wrapInCard ?? false);
    setCardBgColor(config?.cardBgColor ?? '#ffffff');
    setCardBorderColor(config?.cardBorderColor ?? '#e5e7eb');
    setCardBorderWidth(String(config?.cardBorderWidth ?? 1));
    setCardBorderRadius(String(config?.cardBorderRadius ?? 8));
    setCardPadding(String(config?.cardPadding ?? 12));
    setImageBorderRadius(String(config?.imageBorderRadius ?? 0));
  }, [config]);

  // ── Build config object from local state ──────────────────────────────────
  const buildConfig = useCallback(
    (overrides: Partial<ImageEventConfig> = {}): ImageEventConfig => ({
      ...(config ?? {}),
      imageData,
      imageName,
      imageNaturalWidth: naturalWidth,
      imageNaturalHeight: naturalHeight,
      imageWidth: imageWidth ? parseInt(imageWidth, 10) : undefined,
      imageHeight: imageHeight ? parseInt(imageHeight, 10) : undefined,
      imageFit,
      charts,
      events: undefined,
      pollIntervalSeconds: parseInt(pollInterval, 10) || 30,
      wrapInCard,
      cardBgColor,
      cardBorderColor,
      cardBorderWidth: parseInt(cardBorderWidth, 10) || 0,
      cardBorderRadius: parseInt(cardBorderRadius, 10) || 0,
      cardPadding: parseInt(cardPadding, 10) || 0,
      imageBorderRadius: parseInt(imageBorderRadius, 10) || 0,
      ...overrides,
    }),
    [
      cardBgColor, cardBorderColor, cardBorderRadius, cardBorderWidth,
      cardPadding, charts, config, imageBorderRadius, imageData, imageFit,
      imageHeight, imageName, imageWidth, naturalHeight, naturalWidth,
      pollInterval, wrapInCard,
    ]
  );

  // ── Emit config change to parent ──────────────────────────────────────────
  const emit = useCallback(
    (overrides: Partial<ImageEventConfig> = {}) => onChange(buildConfig(overrides)),
    [buildConfig, onChange]
  );

  // ── Default image upload ──────────────────────────────────────────────────
  function handleFilesSelect(files: File[]) {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
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
        onChange(buildConfig({
          imageData: dataUrl,
          imageName: file.name,
          imageNaturalWidth: nw,
          imageNaturalHeight: nh,
          imageWidth: nw,
          imageHeight: nh,
        }));
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
    emit({
      imageData: '', imageName: '',
      imageNaturalWidth: 0, imageNaturalHeight: 0,
      imageWidth: undefined, imageHeight: undefined,
    });
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

  // ── Event CRUD ────────────────────────────────────────────────────────────
  function addEvent() {
    const updated = [...charts, makeDefaultChartEntry(genId())];
    setCharts(updated);
    emit({ charts: updated });
  }

  function updateEvent(index: number, updated: EventCondition) {
    const next = charts.map((entry, i) => (i === index ? updated : entry));
    setCharts(next);
    emit({ charts: next });
  }

  function deleteEvent(index: number) {
    const next = charts.filter((_, i) => i !== index);
    setCharts(next);
    emit({ charts: next });
  }

  // ─── Render — starts directly from Tabs, no Card wrapper (Skills.md) ─────

  return (
    <div className="ie-config">
      <Tabs variant="Bordered" isFullWidth>
        <TabItem
          label="Data"
          isSelected={activeTab === 0}
          onClick={() => setActiveTab(0)}
        />
        <TabItem
          label="Style"
          isSelected={activeTab === 1}
          onClick={() => setActiveTab(1)}
        />
      </Tabs>

      {/* ── Tab 1: Data ── */}
      {activeTab === 0 && (
        <div className="ie-config__tab-body">
          {/* Default image */}
          <Accordion mode="single" defaultExpandedKeys={['default-image']}>
            <AccordionItem title="Default Image" value="default-image">
              <div className="ie-config__accordion-body">
                {!imageData ? (
                  <UploadCta
                    bodyText="Drag and drop a default image here"
                    linkText="Browse files"
                    accept="image/*"
                    multiple={false}
                    onFilesSelect={handleFilesSelect}
                  />
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
                        {naturalWidth} x {naturalHeight} px
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

          <Divider />

          {/* Event conditions */}
          <Accordion mode="single" defaultExpandedKeys={['events']}>
            <AccordionItem title="Event Conditions" value="events">
              <div className="ie-config__accordion-body">
                {/* Poll interval */}
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

                <Divider />

                {/* Events list */}
                {charts.length === 0 ? (
                  <div className="ie-config__empty-events">
                    <p className="ie-config__empty-text">
                      No event conditions configured. Add an event to show conditional images.
                    </p>
                  </div>
                ) : (
                  <Accordion mode="multiple">
                    {charts.map((event, index) => (
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
            </AccordionItem>
          </Accordion>
        </div>
      )}

      {/* ── Tab 2: Style ── */}
      {activeTab === 1 && (
        <div className="ie-config__tab-body">
          <Accordion mode="multiple" defaultExpandedKeys={['image-style', 'card-style']}>
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
