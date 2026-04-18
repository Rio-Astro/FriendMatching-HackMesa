import { useEffect, useState } from 'react';

import { UserButton, useUser } from '@clerk/nextjs';

import { useNavigation } from './navigation-context';

function clampScore(score) {
  return Math.max(0, Math.min(100, Number(score) || 0));
}

function compatibilityHue(score) {
  return Math.round((clampScore(score) / 100) * 120);
}

export function getCompatibilityColor(score) {
  return `hsl(${compatibilityHue(score)} 72% 42%)`;
}

export function getCompatibilityBadgeStyle(score) {
  const hue = compatibilityHue(score);

  return {
    color: `hsl(${hue} 72% 34%)`,
    borderColor: `hsl(${hue} 48% 76%)`,
    background: `hsl(${hue} 100% 97%)`,
  };
}

export function MonoAvatar({ initials, size = 40, emoji = null }) {
  return (
    <span className="mono-avatar" style={{
      width: size, height: size, borderRadius: 0,
      fontSize: emoji ? size * 0.5 : size * 0.36,
      background: '#F6F6F6', color: '#000',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
    }}>{emoji || initials}</span>
  );
}

export function Placeholder({ label, height = 160 }) {
  return (
    <div className="ph" style={{ height }}>
      {label && <span>{label}</span>}
    </div>
  );
}

export function SchoolImage({ src, alt, label, height = 160 }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <Placeholder label={label} height={height} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        height,
        objectFit: 'cover',
        border: '1px solid var(--line)',
        background: 'var(--paper)',
        display: 'block',
      }}
    />
  );
}

export function Logo({ onNav, small }) {
  return (
    <a href="#" className="brand" onClick={(e)=>{ e.preventDefault(); onNav('landing'); }}>
      <span className="brand-mark">College Compass</span>
    </a>
  );
}

export function Nav({ route, onNav, showLogin = false }) {
  const { items, isDemoMode, showAccountChrome } = useNavigation();
  const { isSignedIn } = useUser();

  return (
    <div className="nav">
      <Logo onNav={onNav} />
      <div className="nav-links">
        {items.map(i => (
          <a key={i.id} href="#" onClick={(e)=>{e.preventDefault(); onNav(i.id);}}
             style={{ color: route === i.id ? 'var(--ink)' : 'var(--ink-2)', fontWeight: route === i.id ? 500 : 400 }}>
            {i.label}
          </a>
        ))}
      </div>
      <div className="nav-right">
        {showAccountChrome && isSignedIn ? (
          <UserButton />
        ) : showAccountChrome && isDemoMode ? (
          <>
            <span className="mono-tag" style={{ marginRight: 10 }}>demo mode</span>
            <MonoAvatar initials="YOU" emoji="🧑" size={36} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export const Icon = {
  heart: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill={p.fill||'none'} stroke="currentColor" strokeWidth="1.5">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  bookmark: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill={p.fill||'none'} stroke="currentColor" strokeWidth="1.5">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  x: (p) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  check: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  ),
  arrowR: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 12h14M13 5l7 7-7 7"/>
    </svg>
  ),
  arrowL: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M19 12H5M11 5l-7 7 7 7"/>
    </svg>
  ),
  plus: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  msg: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  search: (p) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
};
