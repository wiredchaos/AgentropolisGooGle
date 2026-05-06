import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FarmDashboard from './FarmDashboard'

function Root() {
  const [view, setView] = useState(
    window.location.hash === '#/farm' ? 'farm' : 'agentropolis'
  );

  useEffect(() => {
    const onHash = () => {
      setView(window.location.hash === '#/farm' ? 'farm' : 'agentropolis');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      {/* Minimal top switcher strip */}
      <div style={{
        position: 'fixed', top: 0, right: 0, zIndex: 9999,
        display: 'flex', gap: 2, padding: '4px 8px',
        background: '#02040a', borderBottom: '1px solid #0d1e2f',
        borderLeft: '1px solid #0d1e2f', borderRadius: '0 0 0 6px',
      }}>
        {[
          ['agentropolis', '⬡ Economy'],
          ['farm',         '⬡ Farm'],
        ].map(([id, label]) => (
          <a
            key={id}
            href={id === 'farm' ? '#/farm' : '#/'}
            style={{
              fontSize: 9, padding: '3px 8px', borderRadius: 3,
              background: view === id ? '#0d1e2f' : 'transparent',
              color: view === id ? '#c8a84b' : '#2e4a5e',
              textDecoration: 'none', fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              fontFamily: "'DM Mono',monospace",
            }}
          >{label}</a>
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
