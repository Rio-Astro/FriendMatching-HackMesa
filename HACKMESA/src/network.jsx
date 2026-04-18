import { useEffect, useState } from 'react';

import { FRIENDS } from './data';
import { getCompatibilityColor, Icon, MonoAvatar, Nav } from './shared';

function getVisiblePeople(isDemoMode, friendFeed) {
  return isDemoMode ? FRIENDS : friendFeed;
}

function getProfileMeta(person) {
  if (person.age) {
    return `${person.age} years old`;
  }

  if (person.graduationYear) {
    return `Class of ${person.graduationYear}`;
  }

  if (person.major) {
    return person.major;
  }

  return 'Mesa profile';
}

export default function Network({
  onNav,
  isDemoMode,
  selected,
  colleges,
  savedFriends,
  setSavedFriends,
  toggleSaveFriend,
  onHideFriend,
  friendFeed,
  setFriendFeed,
  setMatchProfile,
  hasMatchProfile,
  setHasMatchProfile,
  onViewProfile,
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [failedCovers, setFailedCovers] = useState({});
  const [loading, setLoading] = useState(!isDemoMode);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function hydrateNetwork() {
      setLoading(true);
      setError('');

      try {
        const [profileResponse, feedResponse] = await Promise.all([
          fetch('/api/friends/profile'),
          fetch('/api/friends/feed'),
        ]);

        if (!profileResponse.ok) {
          throw new Error(await profileResponse.text());
        }

        if (!feedResponse.ok) {
          throw new Error(await feedResponse.text());
        }

        const profileData = await profileResponse.json();
        const feedData = await feedResponse.json();

        if (cancelled) {
          return;
        }

        setHasMatchProfile(Boolean(profileData.exists));
        setMatchProfile(profileData.profile);
        setFriendFeed(Array.isArray(feedData.items) ? feedData.items : []);
        setSavedFriends(Array.isArray(feedData.savedProfileIds) ? feedData.savedProfileIds : []);
      } catch (fetchError) {
        if (!cancelled) {
          console.error('Failed to load network data', fetchError);
          setError('Could not load your friend network yet.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateNetwork();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, setFriendFeed, setHasMatchProfile, setMatchProfile, setSavedFriends]);

  const filters = [
    { id: 'all', label: 'All People' },
    { id: 'friends', label: 'Friends' },
    { id: 'hot', label: 'Hot Events' },
    { id: 'daily', label: 'Daily' },
  ];

  const people = getVisiblePeople(isDemoMode, friendFeed);
  const filtered = people.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q) || p.interests.some(i => i.toLowerCase().includes(q));
    }
    if (filter === 'friends') return savedFriends.includes(p.id);
    return true;
  });

  const visibleCoverUrlById = new Map();
  const usedCoverUrls = new Set();

  for (const person of filtered) {
    const coverUrl = typeof person.coverImageUrl === 'string' ? person.coverImageUrl : null;

    if (coverUrl && !usedCoverUrls.has(coverUrl)) {
      visibleCoverUrlById.set(person.id, coverUrl);
      usedCoverUrls.add(coverUrl);
      continue;
    }

    visibleCoverUrlById.set(person.id, null);
  }

  const selectedSchools = selected.map((id) => colleges.find((college) => college.id === id)?.name).filter(Boolean);
  const selectedSchoolSummary = selectedSchools.length > 0 ? selectedSchools.join(' · ') : 'No selected schools yet';

  const refreshFeed = async () => {
    setError('');

    try {
      const response = await fetch('/api/friends/recompute', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      if (data.profile) {
        setMatchProfile(data.profile);
        setHasMatchProfile(true);
      }
      setFriendFeed(Array.isArray(data.items) ? data.items : []);
      setSavedFriends(Array.isArray(data.savedProfileIds) ? data.savedProfileIds : []);
    } catch (refreshError) {
      console.error('Failed to refresh friend feed', refreshError);
      setError('Could not refresh your matches right now.');
    }
  };

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
            <button
              type="button"
              className="btn ghost sm"
              style={{ marginTop: 12, width: '100%', justifyContent: 'flex-start' }}
              onClick={() => onNav('me')}
            >
              <MonoAvatar initials="YOU" emoji="🧑" size={28} />
              {isDemoMode ? 'Demo profile' : hasMatchProfile ? 'Edit your profile' : 'Create your profile'}
            </button>
            {!isDemoMode && !hasMatchProfile ? (
              <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                Optional. Make one when you want real people to find you.
              </p>
            ) : null}
          </div>

          <div className="f-block">
            <span className="mono-tag">Saved &middot; {savedFriends.length}</span>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {savedFriends.length === 0 && <span style={{ fontSize: 12, color: 'var(--mute)' }}>No saved people yet.</span>}
              {savedFriends.map((id) => {
                const fr = people.find((x) => x.id === id);
                return fr ? <MonoAvatar key={id} initials={fr.initials} emoji={fr.avatarEmoji} size={36} /> : null;
              })}
            </div>
          </div>

          <div className="f-block">
            <span className="mono-tag">Quick actions</span>
            {!isDemoMode ? (
              <button
                className="btn ghost sm"
                style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                onClick={refreshFeed}
              >
                Refresh matches <Icon.arrowR size={12} />
              </button>
            ) : null}
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
          {!isDemoMode && !hasMatchProfile ? (
            <div className="network-empty-profile">
              <span className="eyebrow">Optional profile</span>
              <h3>Create your friend profile when you're ready.</h3>
              <p>It lives in the Profile tab now. Your network stays clean, and you can come back to the editor anytime.</p>
              <div className="mono-tag" style={{ marginBottom: 18 }}>Selected schools · {selectedSchoolSummary}</div>
              <button className="btn" onClick={() => onNav('me')}>
                Create your profile <Icon.arrowR size={14} />
              </button>
            </div>
          ) : null}

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

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mute)' }}>
              <p style={{ fontSize: 15 }}>Loading your network...</p>
            </div>
          ) : null}

          {!loading && error ? (
            <div style={{ textAlign: 'center', padding: '24px 20px', color: '#b00020' }}>
              <p style={{ fontSize: 15 }}>{error}</p>
            </div>
          ) : null}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--mute)' }}>
              <p style={{ fontSize: 15 }}>{hasMatchProfile || isDemoMode ? 'No people match your search yet.' : 'Create your profile to unlock real friend matches.'}</p>
            </div>
          )}

          <div className="network-grid">
            {filtered.map((p) => (
              (() => {
                const compatibilityColor = getCompatibilityColor(p.compat);
                const visibleCoverUrl = visibleCoverUrlById.get(p.id);
                const hasCover = Boolean(visibleCoverUrl) && !failedCovers[p.id];

                return (
              <div
                key={p.id}
                className={'network-card' + (hasCover ? ' has-cover' : '')}
                onClick={() => onViewProfile(p.id)}
              >
                {hasCover ? (
                  <>
                    <img
                      className="network-card-bg"
                      src={visibleCoverUrl}
                      alt=""
                      aria-hidden="true"
                      onError={() => setFailedCovers((current) => ({ ...current, [p.id]: true }))}
                    />
                    <div className="network-card-scrim" />
                  </>
                ) : null}
                <div className="network-card-body">
                  <div className="network-card-top">
                    <div className="network-card-avatar">
                      <MonoAvatar initials={p.initials} emoji={p.avatarEmoji} src={p.avatarUrl} size={72} />
                      <span className="network-card-compat" style={{ color: compatibilityColor }}>{p.compat}%</span>
                    </div>
                    <div className="network-card-actions">
                      <button
                        className={'icon-btn' + (hasCover ? ' network-card-icon' : '') + (savedFriends.includes(p.id) ? ' on' : '')}
                        title="Save"
                        onClick={(e) => { e.stopPropagation(); toggleSaveFriend(p.id); }}
                      >
                        <Icon.bookmark size={14} fill={savedFriends.includes(p.id) ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        className={'icon-btn' + (hasCover ? ' network-card-icon' : '')}
                        title="View profile"
                        onClick={(e) => { e.stopPropagation(); onViewProfile(p.id); }}
                      >
                        <Icon.arrowR size={14} />
                      </button>
                      {!isDemoMode ? (
                        <button
                          className={'icon-btn' + (hasCover ? ' network-card-icon' : '')}
                          title="Hide"
                          onClick={(e) => { e.stopPropagation(); onHideFriend(p.id); }}
                        >
                          <Icon.x size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                    <div className="network-card-bottom">
                      <div className="network-card-info">
                        <h4>{p.name}</h4>
                        <span className="network-card-school">
                          {p.school.replace(' (committed)', '').replace(' (interested)', '')}
                          {p.demoLabel ? <span className="network-card-demo">{p.demoLabel}</span> : null}
                        </span>
                        <span className="network-card-origin">{getProfileMeta(p)} · {p.origin}</span>
                      </div>
                    <div className="network-card-interests">
                      {p.interests.slice(0, 3).map((t) => (
                        <span key={t} className={'chip' + (hasCover ? ' network-card-chip' : '')}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
                );
              })()
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
