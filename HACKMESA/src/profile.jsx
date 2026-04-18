import { FRIENDS } from './data';
import { getCompatibilityColor, Icon, MonoAvatar, Nav } from './shared';

export default function Profile({ onNav, profileId, savedFriends, toggleSaveFriend }) {
  const person = FRIENDS.find((f) => f.id === profileId);

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

  return (
    <div className="page" data-screen-label="09 Profile">
      <Nav route="network" onNav={onNav} />
      <div className="profile-page">
        <button className="profile-back" onClick={() => onNav('network')}>
          <Icon.arrowL size={14} /> Back to network
        </button>

        <div className="profile-layout">
          <div className="profile-main">
            <div className="profile-hero">
              <div className="profile-avatar-wrap">
                <MonoAvatar initials={person.initials} emoji={person.avatarEmoji} size={120} />
                <div className="profile-compat-badge">
                  <span className="profile-compat-num" style={{ color: compatibilityColor }}>{person.compat}</span>
                  <span className="profile-compat-pct" style={{ color: compatibilityColor }}>%</span>
                  <span className="profile-compat-label">compatibility</span>
                </div>
              </div>
              <div className="profile-identity">
                <h1>{person.name}</h1>
                <div className="profile-meta">
                  <span>{person.age} years old</span>
                  <span className="profile-meta-sep" />
                  <span>{person.origin}</span>
                </div>
                <div className="profile-school-badge">
                  {person.school}
                </div>
              </div>
            </div>

            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field-label">Name</span>
                <span className="profile-field-value">{person.name}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Age</span>
                <span className="profile-field-value">{person.age}</span>
              </div>
              <div className="profile-field">
                <span className="profile-field-label">Major</span>
                <span className="profile-field-value">
                  {person.interests[0].charAt(0).toUpperCase() + person.interests[0].slice(1)}
                </span>
              </div>
            </div>

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
                {isSaved ? 'Friends' : 'Send Friend Request'}
              </button>
              <button className="btn ghost">
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
          </aside>
        </div>
      </div>
    </div>
  );
}
