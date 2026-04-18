import { useState } from 'react';

import { FRIENDS } from './data';
import { Icon, MonoAvatar, Nav } from './shared';

export default function Network({ onNav, savedFriends, toggleSaveFriend, onViewProfile }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filters = [
    { id: 'all', label: 'All People' },
    { id: 'friends', label: 'Friends' },
    { id: 'hot', label: 'Hot Events' },
    { id: 'daily', label: 'Daily' },
  ];

  const filtered = FRIENDS.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q) || p.interests.some(i => i.toLowerCase().includes(q));
    }
    if (filter === 'friends') return savedFriends.includes(p.id);
    return true;
  });

  return (
    <div className="page" data-screen-label="08 Network">
      <Nav route="network" onNav={onNav} />
      <div className="network">
        <aside className="network-side">
          <span className="eyebrow">College Compass</span>
          <h4>Your network, surfaced.</h4>

          <div className="network-filters">
            {filters.map((f) => (
              <button
                key={f.id}
                className={'network-filter-btn' + (filter === f.id ? ' on' : '')}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="f-block">
            <span className="mono-tag">Account</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <MonoAvatar initials="YOU" size={40} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Your Profile</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>View &amp; edit</div>
              </div>
            </div>
          </div>

          <div className="f-block">
            <span className="mono-tag">Saved &middot; {savedFriends.length}</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {savedFriends.length === 0 && <span style={{ fontSize: 12, color: 'var(--mute)' }}>No saved people yet.</span>}
              {savedFriends.map((id) => {
                const fr = FRIENDS.find((x) => x.id === id);
                return fr ? <MonoAvatar key={id} initials={fr.initials} size={36} /> : null;
              })}
            </div>
          </div>

          <div className="f-block">
            <span className="mono-tag">Quick actions</span>
            <button
              className="btn ghost sm"
              style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
              onClick={() => onNav('posts')}
            >
              Post something <Icon.arrowR size={12} />
            </button>
          </div>
        </aside>

        <div className="network-main">
          <div className="network-toolbar">
            <div className="network-search">
              <Icon.search size={16} />
              <input
                type="text"
                placeholder="Search people, schools, interests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <span className="mono-tag">{filtered.length} people</span>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mute)' }}>
              <p style={{ fontSize: 15 }}>No people match your search.</p>
            </div>
          )}

          <div className="network-grid">
            {filtered.map((p) => (
              <div
                key={p.id}
                className="network-card"
                onClick={() => onViewProfile(p.id)}
              >
                <div className="network-card-avatar">
                  <MonoAvatar initials={p.initials} size={72} />
                  <span className="network-card-compat">{p.compat}%</span>
                </div>
                <div className="network-card-info">
                  <h4>{p.name}</h4>
                  <span className="network-card-school">
                    {p.school.replace(' (committed)', '').replace(' (interested)', '')}
                  </span>
                  <span className="network-card-origin">{p.origin}</span>
                </div>
                <div className="network-card-interests">
                  {p.interests.slice(0, 3).map((t) => (
                    <span key={t} className="chip">{t}</span>
                  ))}
                </div>
                <div className="network-card-actions">
                  <button
                    className={'icon-btn' + (savedFriends.includes(p.id) ? ' on' : '')}
                    title="Save"
                    onClick={(e) => { e.stopPropagation(); toggleSaveFriend(p.id); }}
                  >
                    <Icon.bookmark size={14} fill={savedFriends.includes(p.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="icon-btn"
                    title="View profile"
                    onClick={(e) => { e.stopPropagation(); onViewProfile(p.id); }}
                  >
                    <Icon.arrowR size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
