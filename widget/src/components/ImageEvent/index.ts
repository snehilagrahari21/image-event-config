import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { ImageEvent } from './ImageEvent';
import type { ImageEventConfig } from '../../iosense-sdk/types';

interface WidgetProps {
  config: ImageEventConfig;
  authentication: string;
}

const roots = new Map<string, ReturnType<typeof createRoot>>();

function mount(id: string, props: WidgetProps) {
  const container = document.getElementById(id);
  if (!container) return;
  container.setAttribute('data-zone-ignore', '');
  if (roots.has(id)) {
    roots.get(id)!.unmount();
    roots.delete(id);
  }
  const root = createRoot(container);
  roots.set(id, root);
  root.render(createElement(ImageEvent, props));
}

function update(id: string, props: WidgetProps) {
  const root = roots.get(id);
  if (!root) return;
  root.render(createElement(ImageEvent, props));
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
window.ReactWidgets['ImageEvent'] = { mount, update, unmount };
