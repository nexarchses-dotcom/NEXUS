import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ConfigContext = createContext({ config: {}, ready: false });

// Derive a darker shade for hover/headers from a hex primary.
function darken(hex, amount = 0.18) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return hex;
  const adj = (c) => Math.max(0, Math.round(parseInt(c, 16) * (1 - amount)))
    .toString(16).padStart(2, '0');
  return `#${adj(m[1])}${adj(m[2])}${adj(m[3])}`;
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({ AppName: 'NEXUS Trade & Enterprise', PrimaryColor: '#1E3A5F' });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api.getPublicConfig()
      .then(({ data }) => { if (data) setConfig((c) => ({ ...c, ...data })); })
      .catch(() => { /* keep defaults if proxy/backend not reachable yet */ })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const primary = config.PrimaryColor || '#1E3A5F';
    const root = document.documentElement;
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-dark', darken(primary, 0.22));
    root.style.setProperty('--color-primary-soft', '#E8EEF5');
    if (config.AppName) document.title = config.AppName;
  }, [config.PrimaryColor, config.AppName]);

  return <ConfigContext.Provider value={{ config, ready }}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => useContext(ConfigContext);
