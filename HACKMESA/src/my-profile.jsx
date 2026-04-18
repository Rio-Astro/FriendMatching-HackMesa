import { useEffect, useRef, useState } from 'react';

import { QUIZ } from './data';
import { Icon, MonoAvatar, Nav } from './shared';

const INTEREST_OPTIONS = ['creative writing', 'film photography', 'music', 'running', 'hiking', 'gaming', 'cooking', 'museums', 'soccer', 'podcasts', 'research', 'coffee shops'];
const GOAL_OPTIONS = ['find a study partner', 'make a close friend group', 'join a campus org', 'find weekend plans', 'build a creative crew', 'meet future roommates'];
const STATE_OPTIONS = (QUIZ.find((question) => question.id === 'q9')?.options || []).filter((option) => option.key !== 'Any');

function createEmptyProfile(selectedSchoolIds) {
  return {
    displayName: '',
    graduationYear: null,
    major: '',
    bio: '',
    homeState: '',
    avatarUrl: null,
    coverImageUrl: null,
    profileStatus: 'active',
    interests: [],
    goals: [],
    selectedSchoolIds,
  };
}

async function fileToDataUrl(file, { width, height, quality }) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, width / sourceWidth, height / sourceHeight);
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not prepare image upload preview.');
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    return canvas.toDataURL('image/webp', quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function MyProfile({ onNav, isDemoMode, selected, colleges, matchProfile, setMatchProfile, hasMatchProfile, setHasMatchProfile, setFriendFeed }) {
  const [loading, setLoading] = useState(!isDemoMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileForm, setProfileForm] = useState(createEmptyProfile(selected));
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    if (isDemoMode) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    async function hydrateProfile() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/friends/profile');

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = await response.json();

        if (cancelled) {
          return;
        }

        setHasMatchProfile(Boolean(data.exists));
        setMatchProfile(data.profile);
        setProfileForm(data.profile || createEmptyProfile(selected));
      } catch (fetchError) {
        if (!cancelled) {
          console.error('Failed to load friend profile', fetchError);
          setError('Could not load your friend profile yet.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateProfile();

    return () => {
      cancelled = true;
    };
  }, [isDemoMode, selected, setHasMatchProfile, setMatchProfile]);

  useEffect(() => {
    if (isDemoMode) {
      return;
    }

    if (matchProfile) {
      setProfileForm({ ...matchProfile, selectedSchoolIds: selected });
      return;
    }

    setProfileForm(createEmptyProfile(selected));
  }, [isDemoMode, matchProfile, selected]);

  const selectedSchools = selected.map((id) => colleges.find((college) => college.id === id)?.name).filter(Boolean);
  const selectedSchoolSummary = selectedSchools.length > 0 ? selectedSchools.join(' · ') : 'No selected schools yet';

  const updateProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleImageUpload = async (field, file, options) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }

    setError('');

    try {
      const dataUrl = await fileToDataUrl(file, options);
      updateProfileField(field, dataUrl);
    } catch (uploadError) {
      console.error('Failed to process uploaded image', uploadError);
      setError('Could not process that image. Try a different file.');
    }
  };

  const toggleMultiSelect = (field, value, limit) => {
    setProfileForm((current) => {
      const values = current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value].slice(0, limit);

      return { ...current, [field]: values };
    });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/friends/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            ...profileForm,
            selectedSchoolIds: selected,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      setMatchProfile(data.profile);
      setHasMatchProfile(true);
      setFriendFeed(Array.isArray(data.items) ? data.items : []);
      onNav('network');
    } catch (saveError) {
      console.error('Failed to save match profile', saveError);
      setError('Could not save your friend profile yet.');
    } finally {
      setSaving(false);
    }
  };

  if (isDemoMode) {
    return (
      <div className="page" data-screen-label="09 My Profile">
        <Nav route="me" onNav={onNav} />
        <div className="profile-page">
          <div className="profile-main" style={{ maxWidth: 760, margin: '0 auto' }}>
            <div className="profile-section">
              <span className="eyebrow">Demo mode</span>
              <h1 style={{ margin: '8px 0 16px' }}>Friend profiles are only editable for signed-in users.</h1>
              <p className="profile-bio">You can still explore the demo network. When you're ready, sign in and this tab will become your own profile editor.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <button className="btn" onClick={() => onNav('auth')}>Sign up / log in <Icon.arrowR size={14} /></button>
                <button className="btn ghost" onClick={() => onNav('network')}>Back to network</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" data-screen-label="09 My Profile">
      <Nav route="me" onNav={onNav} />
      <div className="profile-page">
        <div className="profile-main" style={{ maxWidth: 960, margin: '0 auto' }}>
          <button className="profile-back" onClick={() => onNav('network')}>
            <Icon.arrowL size={14} /> Back to network
          </button>

          <form onSubmit={saveProfile} className="profile-editor">
            <div className="profile-section" style={{ marginTop: 0 }}>
              <span className="eyebrow">Friend profile</span>
              <h1 style={{ margin: '8px 0 12px' }}>{hasMatchProfile ? 'Edit your profile' : 'Create your profile'}</h1>
              <p className="profile-bio">Optional. This is where people learn your vibe, what you're looking for, and which schools overlap with yours.</p>
              <div className="mono-tag" style={{ marginTop: 16 }}>Selected schools · {selectedSchoolSummary}</div>
            </div>

            {loading ? <div style={{ padding: '30px 0', color: 'var(--ink-2)' }}>Loading profile...</div> : null}

            {!loading ? (
              <>
                <div className="profile-editor-grid">
                  <div className="profile-media-card">
                    <label className="profile-editor-label">Profile photo</label>
                    <div className="profile-avatar-preview-row">
                      <MonoAvatar initials={profileForm.displayName?.slice(0, 2).toUpperCase() || 'ME'} src={profileForm.avatarUrl} size={88} />
                      <div className="profile-media-actions">
                        <button className="btn ghost sm" type="button" onClick={() => avatarInputRef.current?.click()}>
                          Upload PFP
                        </button>
                        {profileForm.avatarUrl ? (
                          <button className="btn ghost sm" type="button" onClick={() => updateProfileField('avatarUrl', null)}>
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="profile-hidden-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void handleImageUpload('avatarUrl', file, { width: 360, height: 360, quality: 0.82 });
                        event.target.value = '';
                      }}
                    />
                  </div>

                  <div className="profile-media-card profile-media-card-wide">
                    <label className="profile-editor-label">Background image</label>
                    <div className="profile-cover-preview">
                      {profileForm.coverImageUrl ? <img src={profileForm.coverImageUrl} alt="Background preview" /> : <div className="profile-cover-empty">No background selected</div>}
                    </div>
                    <div className="profile-media-actions">
                      <button className="btn ghost sm" type="button" onClick={() => coverInputRef.current?.click()}>
                        Upload background
                      </button>
                      {profileForm.coverImageUrl ? (
                        <button className="btn ghost sm" type="button" onClick={() => updateProfileField('coverImageUrl', null)}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="profile-hidden-input"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        void handleImageUpload('coverImageUrl', file, { width: 1400, height: 900, quality: 0.74 });
                        event.target.value = '';
                      }}
                    />
                  </div>

                  <div className="field">
                    <label>Display name</label>
                    <input value={profileForm.displayName} onChange={(event) => updateProfileField('displayName', event.target.value)} />
                  </div>
                  <div className="field">
                    <label>Graduation year</label>
                    <input type="number" min="2026" max="2035" value={profileForm.graduationYear || ''} onChange={(event) => updateProfileField('graduationYear', event.target.value ? Number(event.target.value) : null)} />
                  </div>
                  <div className="field">
                    <label>Major or direction</label>
                    <input value={profileForm.major} onChange={(event) => updateProfileField('major', event.target.value)} placeholder="Neuroscience, design, undecided..." />
                  </div>
                  <div className="field">
                    <label>Home state</label>
                    <select value={profileForm.homeState} onChange={(event) => updateProfileField('homeState', event.target.value)}>
                      <option value="">Select a state...</option>
                      {STATE_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Short bio</label>
                  <textarea value={profileForm.bio} onChange={(event) => updateProfileField('bio', event.target.value)} placeholder="What kind of energy, friends, or routines are you looking for?" className="profile-editor-textarea" />
                </div>

                <div className="profile-editor-section">
                  <label className="profile-editor-label">Interests · pick up to 5</label>
                  <div className="profile-editor-tags">
                    {INTEREST_OPTIONS.map((interest) => (
                      <span key={interest} className={'chip ' + (profileForm.interests.includes(interest) ? 'on' : '')} onClick={() => toggleMultiSelect('interests', interest, 5)}>{interest}</span>
                    ))}
                  </div>
                </div>

                <div className="profile-editor-section">
                  <label className="profile-editor-label">Goals · pick up to 3</label>
                  <div className="profile-editor-tags">
                    {GOAL_OPTIONS.map((goal) => (
                      <span key={goal} className={'chip ' + (profileForm.goals.includes(goal) ? 'on' : '')} onClick={() => toggleMultiSelect('goals', goal, 3)}>{goal}</span>
                    ))}
                  </div>
                </div>

                <div className="profile-editor-section">
                  <label className="profile-editor-label">Visibility</label>
                  <div className="variant-toggle">
                    {['active', 'paused'].map((status) => (
                      <button key={status} type="button" className={profileForm.profileStatus === status ? 'on' : ''} onClick={() => updateProfileField('profileStatus', status)}>
                        {status === 'active' ? 'Visible in feed' : 'Pause profile'}
                      </button>
                    ))}
                  </div>
                </div>

                {error ? <div style={{ color: '#b00020', marginBottom: 16 }}>{error}</div> : null}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn" type="submit" disabled={saving} style={saving ? { opacity: 0.5, cursor: 'wait' } : undefined}>
                    {saving ? 'Saving profile...' : hasMatchProfile ? 'Save profile' : 'Create profile'} <Icon.arrowR size={14} />
                  </button>
                  <button className="btn ghost" type="button" onClick={() => onNav('network')}>Back to network</button>
                </div>
              </>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
