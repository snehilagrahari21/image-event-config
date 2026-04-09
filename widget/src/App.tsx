import React, { useEffect, useRef, useState } from 'react';
import '@faclon-labs/design-sdk/styles.css';
import { validateSSOToken } from './iosense-sdk/api';
import type { ImageEventConfig } from './iosense-sdk/types';

// Import self-registration side effects
import './components/ImageEvent/index';
import './components/ImageEventConfiguration/index';

const WIDGET_ID = 'widget-preview';
const CONFIG_ID = 'config-preview';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [config, setConfig] = useState<ImageEventConfig>({});
  const widgetMounted = useRef(false);
  const configMounted = useRef(false);

  const authentication = localStorage.getItem('bearer_token') ?? '';

  // Handle SSO token from URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('token');

    if (ssoToken) {
      params.delete('token');
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', newUrl);

      validateSSOToken(ssoToken)
        .then(() => setAuthenticated(true))
        .catch((err) => setAuthError(err instanceof Error ? err.message : 'Auth failed'));
    } else if (localStorage.getItem('bearer_token')) {
      setAuthenticated(true);
    }
  }, []);

  // Mount / update widgets via window.ReactWidgets
  useEffect(() => {
    if (!authenticated) return;

    const props = { config, authentication };

    if (!widgetMounted.current) {
      window.ReactWidgets['ImageEvent'].mount(WIDGET_ID, props);
      widgetMounted.current = true;
    } else {
      window.ReactWidgets['ImageEvent'].update(WIDGET_ID, props);
    }

    if (!configMounted.current) {
      window.ReactWidgets['ImageEventConfiguration'].mount(CONFIG_ID, {
        config,
        authentication,
        onChange: (newConfig: ImageEventConfig) => setConfig(newConfig),
      });
      configMounted.current = true;
    } else {
      window.ReactWidgets['ImageEventConfiguration'].update(CONFIG_ID, {
        config,
        authentication,
        onChange: (newConfig: ImageEventConfig) => setConfig(newConfig),
      });
    }
  }, [authenticated, config, authentication]);

  // Unmount on cleanup
  useEffect(() => {
    return () => {
      if (widgetMounted.current) {
        window.ReactWidgets['ImageEvent']?.unmount(WIDGET_ID);
      }
      if (configMounted.current) {
        window.ReactWidgets['ImageEventConfiguration']?.unmount(CONFIG_ID);
      }
    };
  }, []);

  if (authError) {
    return (
      <div style={{ padding: 32, color: 'red', fontFamily: 'sans-serif' }}>
        Auth error: {authError}
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
        <p>
          Append <code>?token=YOUR_SSO_TOKEN</code> to the URL to authenticate.
        </p>
        <p>
          Generate an SSO token from your{' '}
          <strong>IOsense portal → Profile → Generate SSO Token</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="app-preview">
      <div className="app-preview__config" id={CONFIG_ID} />
      <div className="app-preview__widget" id={WIDGET_ID} />

      <style>{`
        .app-preview {
          display: flex;
          gap: 24px;
          padding: 24px;
          min-height: 100vh;
          background: var(--background-default-moderate);
          box-sizing: border-box;
        }
        .app-preview__config {
          flex: 0 0 380px;
          min-width: 320px;
          overflow-y: auto;
          max-height: 100vh;
        }
        .app-preview__widget {
          flex: 1;
          min-width: 0;
          min-height: 400px;
        }
      `}</style>
    </div>
  );
}
