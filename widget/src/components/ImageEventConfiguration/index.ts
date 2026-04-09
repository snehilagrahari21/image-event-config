import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ImageEventConfiguration } from './ImageEventConfiguration';
import type { ImageEventConfig } from '../../iosense-sdk/types';

interface ConfigurationProps {
  config: ImageEventConfig;
  authentication: string;
  onChange: (config: ImageEventConfig) => void;
}

const roots = new Map<string, ReturnType<typeof createRoot>>();

function mount(id: string, props: ConfigurationProps) {
  const container = document.getElementById(id);
  if (!container) return;
  container.setAttribute('data-zone-ignore', '');
  if (roots.has(id)) {
    roots.get(id)!.unmount();
    roots.delete(id);
  }
  const root = createRoot(container);
  roots.set(id, root);
  root.render(createElement(ImageEventConfiguration, props));
}

function update(id: string, props: ConfigurationProps) {
  const root = roots.get(id);
  if (!root) return;
  root.render(createElement(ImageEventConfiguration, props));
}

function unmount(id: string) {
  const root = roots.get(id);
  if (!root) return;
  root.unmount();
  roots.delete(id);
}

declare global {
  interface Window {
    ReactWidgets: Record<
      string,
      { mount: typeof mount; update: typeof update; unmount: typeof unmount }
    >;
  }
}

window.ReactWidgets = window.ReactWidgets ?? {};
window.ReactWidgets['ImageEventConfiguration'] = { mount, update, unmount };
