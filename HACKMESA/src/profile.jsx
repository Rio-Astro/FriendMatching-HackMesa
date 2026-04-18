import { useEffect, useState } from 'react';

import { FRIENDS } from './data';
import { getCompatibilityColor, Icon, MonoAvatar, Nav } from './shared';

function getPrimaryMeta(person) {
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

export default function Profile({ onNav, profileId, isDemoMode, friendFeed, savedFriends, toggleSaveFriend, onHideFriend, onBlockFriend, onReportFriend }) {
  const person = (isDemoMode ? FRIENDS : friendFeed).find((f) => f.id === profileId);
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [profileId]);

  if (!person) {
    return (
      <div className="page" data-screen-label="09 Profile">
        <Nav route="network" onNav={onNav} />
        <div className="profile-page">
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--mute)' }}>
            <p>Profile not found.</p>
            <button className="btn ghost sm" style={{ marginTop: 16 }} onClick={() => onNav('network')}>
              <Icon.arrowL size={12} /> Back to network
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSaved = savedFriends.includes(person.id);
  const compatibilityColor = getCompatibilityColor(person.compat);
  const hasCover = Boolean(person.coverImageUrl) && !coverFailed;

  return (
    <div className="page" data-screen-label="09 Profile">
      <Nav route="network" onNav={onNav} />
      <div className="profile-page">
        <button className="profile-back" onClick={() => onNav('network')}>
          <Icon.arrowL size={14} /> Back to network
        </button>

        <div className="profile-layout">
          <div className="profile-main">
            <div className={'profile-hero' + (hasCover ? ' has-cover' : '')}>
              {hasCover ? (
                <>
                  <img
                    className="profile-hero-bg"
                    src={person.coverImageUrl}
                    alt=""
                    aria-hidden="true"
                    onError={() => setCoverFailed(true)}
                  />
                  <div className="profile-hero-scrim" />
                </>
              ) : null}
              <div className="profile-hero-inner">
                <div className="profile-avatar-wrap">
                  <MonoAvatar initials={person.initials} emoji={person.avatarEmoji} src={person.avatarUrl} size={120} />
                  <div className="profile-compat-badge">
                    <span className="profile-compat-num" style={{ color: compatibilityColor }}>{person.compat}</span>
                    <span className="profile-compat-pct" style={{ color: compatibilityColor }}>%</span>
                    <span className="profile-compat-label">compatibility</span>
                  </div>
                </div>
                <div className="profile-identity">
                  <h1>{person.name}</h1>
                  <div className="profile-meta">
                    <span>{getPrimaryMeta(person)}</span>
                    <span className="profile-meta-sep" />
                    <span>{person.origin}</span>
                  </div>
                  <div className="profile-school-badge">
                    {person.school}
                    {person.demoLabel ? <span className="profile-demo-pill">{person.demoLabel}</span> : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Name</span>
                <span className="profile-field-value">{person.name}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Profile</span>
                <span className="profile-field-value">{getPrimaryMeta(person)}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Major</span>
                <span className="profile-field-value">
                  {person.major || (person.interests[0] ? person.interests[0].charAt(0).toUpperCase() + person.interests[0].slice(1) : 'Undecided')}
                </span>
              </div>
            </div>

            {person.selectedSchools?.length ? (
              <div className="profile-section">
                <span className="mono-tag">Selected schools</span>
                <div className="profile-shared-tags">
                  {person.selectedSchools.map((school) => (
                    <span key={school} className="chip">{school}</span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="profile-section">
              <span className="mono-tag">Bio</span>
              <p className="profile-bio">{person.bio}</p>
            </div>

            <div className="profile-section">
              <span className="mono-tag">Why you'd click</span>
              <div className="profile-reason" dangerouslySetInnerHTML={{ __html: person.reason }} />
            </div>

            <div className="profile-section">
              <span className="mono-tag">What they're looking for</span>
              <div className="profile-goals">
                {person.goals.map((g) => (
                  <div key={g} className="profile-goal-item">
                    <span className="profile-goal-dot" />
                    {g}
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-actions">
              <button
                className="btn"
                onClick={() => toggleSaveFriend(person.id)}
              >
                <Icon.heart size={16} fill={isSaved ? 'currentColor' : 'none'} />
                {isSaved ? 'Saved to your list' : 'Save this profile'}
              </button>
              <button className="btn ghost" disabled>
                <Icon.msg size={16} /> Message
              </button>
            </div>
          </div>

          <aside className="profile-sidebar">
            <div className="profile-sidebar-block">
              <span className="mono-tag">Compatibility</span>
              <div className="profile-compat-ring">
                <svg viewBox="0 0 120 120" className="profile-ring-svg">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="6" />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none" stroke={compatibilityColor} strokeWidth="6"
                    strokeDasharray={`${(person.compat / 100) * 327} 327`}
                    strokeLinecap="butt"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="profile-ring-text">
                  <span className="profile-ring-num" style={{ color: compatibilityColor }}>{person.compat}</span>
                  <span className="profile-ring-pct" style={{ color: compatibilityColor }}>%</span>
                </div>
              </div>
            </div>

            <div className="profile-sidebar-block">
              <span className="mono-tag">Interests</span>
              <div className="profile-interests-list">
                {person.interests.map((i) => (
                  <div key={i} className="profile-interest-item">
                    <span className="profile-interest-dot" />
                    {i}
                  </div>
                ))}
              </div>
            </div>

            <div className="profile-sidebar-block">
              <span className="mono-tag">Shared with you</span>
              <div className="profile-shared-tags">
                {person.shared.map((s) => (
                  <span key={s} className="chip on">{s}</span>
                ))}
              </div>
            </div>

            {!isDemoMode ? (
              <div className="profile-sidebar-block">
                <span className="mono-tag">Safety</span>
                <div className="profile-safety-actions">
                  <button className="btn ghost sm" onClick={() => onHideFriend(person.id)}>
                    Hide profile
                  </button>
                  <button className="btn ghost sm" onClick={() => onBlockFriend(person.id)}>
                    Block profile
                  </button>
                  <button className="btn ghost sm" onClick={() => onReportFriend(person.id)}>
                    Report profile
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
