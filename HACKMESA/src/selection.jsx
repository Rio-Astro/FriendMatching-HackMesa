import { getCompatibilityColor, Icon, Nav, SchoolImage } from './shared';

export default function Selection({ onNav, selected, toggleSelect, colleges }) {
  const max = 3;
  const can = selected.length > 0;
  const collegeList = colleges?.length ? colleges : [];
  return (
    <div className="page" data-screen-label="05 Selection">
      <Nav route="results" onNav={onNav} />
      <div className="selection">
        <span className="eyebrow">Step 2 of 2 · Narrow the list</span>
        <h1>Pick up to three schools you're serious about.</h1>
        <p className="sub">Your picks shape your network recommendations next. You can change them anytime.</p>

        <div className="sel-grid">
          {collegeList.slice(0, 6).map((u) => {
            const on = selected.includes(u.id);
            const disabled = !on && selected.length >= max;
            const compatibilityColor = getCompatibilityColor(u.score);
            return (
              <div key={u.id} className={'sel-card ' + (on ? 'on' : '')}
                style={disabled ? { opacity: .4, cursor: 'not-allowed' } : {}}
                onClick={() => !disabled && toggleSelect(u.id)}>
                <SchoolImage src={u.imageUrl} alt={u.name} label={u.name.toLowerCase()} height={140} />
                <h4>{u.name}</h4>
                <div className="meta">
                  <span>{u.state}</span>
                  <span style={{ color: compatibilityColor }}>{u.score}% match</span>
                </div>
                <div className="mono-tag">{u.size} · tuition {u.tuition}</div>
                <div className="check">{on && <Icon.check size={14}/>}</div>
              </div>
            );
          })}
        </div>

        <div className="sel-footer">
          <div>
            <span className="mono-tag">{selected.length} of {max} selected</span>
            {selected.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-2)' }}>
                {selected.map((id) => collegeList.find((u) => u.id === id)?.name).filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn ghost sm" onClick={() => onNav('results')}><Icon.arrowL size={12}/> Back to matches</button>
            <button className="btn" disabled={!can}
              style={!can ? { opacity: .35, cursor: 'not-allowed' } : {}}
              onClick={() => onNav('network')}>
              See your network <Icon.arrowR size={14}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
