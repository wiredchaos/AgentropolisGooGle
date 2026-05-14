import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FarmDashboard from './FarmDashboard'
import TerminalAgent from './TerminalAgent'

function getView() {
  const h = window.location.hash;
  if (h === '#/farm')     return 'farm';
  if (h === '#/terminal') return 'terminal';
  return 'agentropolis';
}

function Root() {
  const [view, setView] = useState(getView());

  useEffect(() => {
    const onHash = () => setView(getView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const NAV = [
    ['agentropolis', '⬡ Dashboard', '#/'],
    ['farm',         '⬡ Farm',      '#/farm'],
    ['terminal',     '⬡ Terminal',  '#/terminal'],
  ];

  // Terminal gets full screen — no switcher chrome overlay
  if (view === 'terminal') {
    return (
      <>
        <div style={{
          position: 'fixed', top: 0, right: 0, zIndex: 9999,
          display: 'flex', gap: 2, padding: '4px 8px',
          background: '#020403', borderBottom: '1px solid #0a2a0a',
          borderLeft: '1px solid #0a2a0a', borderRadius: '0 0 0 6px',
        }}>
          {NAV.map(([id, label, href]) => (
            <a key={id} href={href} style={{
              fontSize: 9, padding: '3px 8px', borderRadius: 3,
              background: view === id ? '#0a2a0a' : 'transparent',
              color: view === id ? '#00ff41' : '#1a4a1a',
              textDecoration: 'none', fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono',monospace",
            }}>{label}</a>
          ))}
        </div>
        <TerminalAgent />
      </>
    );
  }

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, right: 0, zIndex: 9999,
        display: 'flex', gap: 2, padding: '4px 8px',
        background: '#02040a', borderBottom: '1px solid #0d1e2f',
        borderLeft: '1px solid #0d1e2f', borderRadius: '0 0 0 6px',
      }}>
        {NAV.map(([id, label, href]) => (
          <a key={id} href={href} style={{
            fontSize: 9, padding: '3px 8px', borderRadius: 3,
            background: view === id ? '#0d1e2f' : 'transparent',
            color: view === id ? '#c8a84b' : '#2e4a5e',
            textDecoration: 'none', fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase',
            fontFamily: "'DM Mono',monospace",
          }}>{label}</a>
        ))}
      </div>
      {view === 'farm' ? <FarmDashboard /> : <App />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
