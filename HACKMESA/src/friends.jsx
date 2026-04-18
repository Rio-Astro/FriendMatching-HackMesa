import { useState } from 'react';

import { FRIENDS } from './data';
import { getCompatibilityBadgeStyle, getCompatibilityColor, Icon, MonoAvatar, Nav, Placeholder } from './shared';

function DemoHeroAvatar({ emoji, label }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MonoAvatar initials={label.slice(0, 2).toUpperCase()} emoji={emoji} size={110} />
    </div>
  );
}

export default function Friends({ onNav, selected, colleges, variant, setVariant, savedFriends, toggleSaveFriend }) {
  const [idx, setIdx] = useState(0);
  const list = FRIENDS;
  const p = list[idx];
  const collegeList = colleges?.length ? colleges : [];
  const next = (action) => {
    if (action === 'save') toggleSaveFriend(p.id);
    setIdx((idx + 1) % list.length);
  };

  const card = (() => {
    const compatibilityColor = getCompatibilityColor(p.compat);
    const compatibilityBadgeStyle = getCompatibilityBadgeStyle(p.compat);

    const common = (
      <>
        <div className="bio">
          <span className="mono-tag">Bio</span>
          <p>{p.bio}</p>
        </div>
        <div className="section-row">
          <span className="mono-tag">Interests</span>
          <div className="tags">
            {p.interests.map(t => <span key={t} className="chip">{t}</span>)}
          </div>
        </div>
        <div className="section-row">
          <span className="mono-tag">What they're looking for</span>
          <div className="tags">
            {p.goals.map(t => <span key={t} className="chip">{t}</span>)}
          </div>
        </div>
        <div className="compat">
          <span className="icon">※</span>
          <div className="txt" dangerouslySetInnerHTML={{ __html: `<b>Why you'd click:</b> ${p.reason.replace(/—/g, 'and')}` }} />
        </div>
        <div className="actions-bar">
          <span className="lbl">{String(idx+1).padStart(2,'0')} of {String(list.length).padStart(2,'0')}</span>
          <div className="btns">
            <button className="act-btn" onClick={() => next('pass')} title="Pass"><Icon.x size={18}/></button>
            <button className="act-btn" onClick={() => next('save')} title="Save"><Icon.bookmark size={18} fill={savedFriends.includes(p.id) ? 'currentColor' : 'none'}/></button>
            <button className="act-btn like" onClick={() => next('like')} title="Like"><Icon.heart size={20} fill="currentColor"/></button>
          </div>
        </div>
      </>
    );

    if (variant === 'polaroid') {
      return (
        <div className={'friend-card v-polaroid'} key={p.id}>
          <div className="hero-img"><DemoHeroAvatar emoji={p.avatarEmoji || '🤖'} label={p.name} /></div>
          <div className="pola-head">
            <h2>{p.name}, {p.age}</h2>
            <div className="m">{p.school} · {p.origin}</div>
          </div>
          {common}
        </div>
      );
    }
    if (variant === 'structured') {
      return (
        <div className={'friend-card v-structured'} key={p.id}>
          <div className="hero-img"><DemoHeroAvatar emoji={p.avatarEmoji || '🤖'} label={p.name} /></div>
          <div className="stat-head">
            <h2>{p.name}, {p.age}</h2>
            <div className="m">{p.school}</div>
          </div>
          <div className="stat-grid">
            <div><div className="k">From</div><div className="v">{p.origin.replace('from ','')}</div></div>
            <div><div className="k">Match</div><div className="v" style={{ color: compatibilityColor }}>{p.compat}%</div></div>
            <div><div className="k">Shared</div><div className="v">{p.shared.slice(0,2).join(', ')}</div></div>
            <div><div className="k">Wants</div><div className="v">{p.goals[0]}</div></div>
          </div>
          {common}
        </div>
      );
    }
    return (
      <div className="friend-card" key={p.id}>
        <div className="hero-img">
          <DemoHeroAvatar emoji={p.avatarEmoji || '🤖'} label={p.name} />
          <span className="pill">{p.school.replace(' (committed)','').replace(' (interested)','')}</span>
          <span className="match" style={compatibilityBadgeStyle}>{p.compat}% match</span>
          <div className="overlay">
            <div className="age">{p.origin}</div>
            <h2>{p.name}, {p.age}</h2>
          </div>
        </div>
        {common}
      </div>
    );
  })();

  return (
    <div className="page" data-screen-label="06 Friends">
      <Nav route="friends" onNav={onNav} />
      <div className="friends">
        <aside className="friends-side">
          <span className="eyebrow">Friend finder</span>
          <h4>People going where you're going.</h4>

          <div className="f-block">
            <span className="mono-tag">Based on your picks</span>
              <div className="mini-schools" style={{ marginTop: 10 }}>
                {selected.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>No schools selected yet.</div>}
                {selected.map((id) => {
                  const u = collegeList.find((x) => x.id === id);
                  if (!u) return null;
                  return (
                  <div key={id} className="mini-school">
                    <span className="dot"></span>
                    <span>{u.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="f-block">
            <span className="mono-tag">Card layout</span>
            <div className="variant-toggle" style={{ marginTop: 10 }}>
              {['hinge','polaroid','structured'].map(v => (
                <button key={v} className={variant === v ? 'on' : ''} onClick={() => setVariant(v)}>
                  {v[0].toUpperCase()+v.slice(1)}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 12, lineHeight: 1.5 }}>
              Try all three. You can also toggle the Tweaks panel.
            </p>
          </div>

          <div className="f-block">
            <span className="mono-tag">Not seeing a fit?</span>
            <button className="btn ghost sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => onNav('posts')}>
              Post what you're looking for <Icon.arrowR size={12}/>
            </button>
          </div>

          <div className="f-block">
            <span className="mono-tag">Saved · {savedFriends.length}</span>
            <div style={{ display:'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {savedFriends.length === 0 && <span style={{ fontSize: 12, color: 'var(--mute)' }}>Tap save to keep people here.</span>}
              {savedFriends.map(id => {
                const fr = FRIENDS.find(x => x.id === id);
                return fr ? <MonoAvatar key={id} initials={fr.initials} emoji={fr.avatarEmoji} size={36} /> : null;
              })}
            </div>
          </div>
        </aside>

        <div className="friends-main">
          {card}
          <div className="friend-deck-info">
            <span className="eyebrow">Up next</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {list.map((_, k) => (
                <span key={k} style={{
                  width: 28, height: 2,
                  background: k === idx ? 'var(--ink)' : k < idx ? 'var(--ink-2)' : 'var(--line)'
                }}/>
              ))}
            </div>
            <p className="hint">We surface 5 new people each day, ranked by overlap with your saved schools, hobbies, and goals.</p>
            <div className="queue">{String(list.length - idx - 1).padStart(2,'0')} more waiting</div>
          </div>
        </div>
      </div>
    </div>
  );
}
