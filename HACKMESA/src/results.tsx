import { useEffect, useState } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import type { MatchedSchool, QuizAnswers, RouteName } from '@/lib/types';

import { UNIVERSITIES } from './data';
import { getCompatibilityColor, Icon, Nav, SchoolImage } from './shared';

type PitchResponse = {
  pitch?: string;
};

type ResultsProps = {
  onNav: (route: RouteName) => void;
  saved: string[];
  toggleSave: (id: string) => void;
  answers: QuizAnswers;
  colleges: MatchedSchool[];
  setColleges: Dispatch<SetStateAction<MatchedSchool[]>>;
};

const CONFETTI_PIECES = Array.from({ length: 56 }, (_, index) => ({
  id: index,
  left: (index * 17) % 100,
  delay: (index % 12) * 0.1,
  duration: 3.2 + (index % 6) * 0.24,
  rotation: (index * 29) % 360,
  color: `hsl(${(index * 31) % 360} 88% 62%)`,
}));

export default function Results({ onNav, saved, toggleSave, answers, colleges, setColleges }: ResultsProps) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [popupCollege, setPopupCollege] = useState<MatchedSchool | null>(null);
  const [pitch, setPitch] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const openPitch = async (college: MatchedSchool) => {
    setPopupCollege(college);
    setPitch(null);

    try {
      const res = await fetch('/api/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: college.id, name: college.name }),
      });

      const data = (await res.json()) as PitchResponse;
      setPitch(data.pitch || 'Could not load pitch.');
    } catch (error) {
      console.error('Pitch fetch failed', error);
      setPitch('Could not load pitch.');
    }
  };

  useEffect(() => {
    async function fetchMatches() {
      setLoading(true);
      try {
        const res = await fetch('/api/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });

        if (!res.ok) {
          console.error('Match error', await res.text());
          return;
        }

         const data = (await res.json()) as MatchedSchool[];
         setColleges(data);
      } catch (error) {
        console.error('Fetch failed', error);
      } finally {
        setLoading(false);
      }
    }

    if (answers && Object.keys(answers).length > 0) {
      fetchMatches();
    } else {
      setColleges(UNIVERSITIES);
    }
  }, [answers, setColleges]);

  useEffect(() => {
    if (loading || hasCelebrated || Object.keys(answers).length === 0 || colleges.length === 0) {
      return;
    }

    setShowConfetti(true);
    setHasCelebrated(true);

    const timer = window.setTimeout(() => {
      setShowConfetti(false);
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [answers, colleges.length, hasCelebrated, loading]);

  const collegeList = colleges?.length ? colleges : UNIVERSITIES;
  const filters: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All matches' },
    { id: 'high', label: 'Best fit (90+)' },
    { id: 'uc', label: 'UC System' },
    { id: 'csu', label: 'CSU System' },
    { id: 'tx', label: 'Texas Systems' },
    { id: 'small', label: 'Small campus' },
    { id: 'outdoor', label: 'Outdoorsy' },
    { id: 'affordable', label: 'Affordable' },
  ];

  const list = collegeList.filter((u) => {
    if (filter === 'high' && u.score < 90) return false;
    if (filter === 'small' && !u.size.includes('Small')) return false;
    if (filter === 'outdoor' && !u.tags.some(t => /outdoor|nature|coastal/i.test(t))) return false;
    if (filter === 'affordable' && !(u.band === 'low' || u.band === 'mid')) return false;
    if (filter === 'uc' && !(u.name.startsWith('UC ') || u.name === 'UCLA' || u.name.toLowerCase().includes('university of california'))) return false;
    if (filter === 'csu' && !(u.name.startsWith('CSU ') || u.name.startsWith('Cal Poly') || (u.name.includes('State') && u.state.includes('CA')))) return false;
    if (filter === 'tx' && !u.state.includes('TX')) return false;
    
    if (search.trim() && !u.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page" data-screen-label="04 Results">
      <Nav route="results" onNav={onNav} />

      {showConfetti ? (
        <div className="confetti-rain" aria-hidden="true">
          {CONFETTI_PIECES.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{
                left: `${piece.left}%`,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="results">
        <div className="results-head">
          <div>
            <span className="eyebrow">Your matches · Based on 8 answers</span>
            <h1>Top places that could feel like home.</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <span className="mono-tag">{saved.length} saved · {search.trim() ? list.length : Math.min(8, list.length)} shown</span>
            <button className="btn ghost sm" onClick={() => onNav('quiz')}>Retake quiz</button>
          </div>
        </div>

        <div className="filters">
          {filters.map(f => (
            <button key={f.id} className={'chip ' + (filter === f.id ? 'on' : '')} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
          <input 
            type="text" 
            placeholder="Search specific colleges..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid var(--line)', outline: 'none', fontFamily: 'inherit', fontSize: 14, flex: 1, minWidth: 200, maxWidth: 300 }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-2)' }}>
            <div className="mono-tag" style={{ animation: 'blink 1s infinite' }}>Analyzing compatibility...</div>
          </div>
        ) : (
          <div className="result-list">
            {(search.trim() ? list : list.slice(0, 8)).map((u, idx) => (
                (() => {
                  const compatibilityColor = getCompatibilityColor(u.score);

                  return (
                <div key={u.id} className={'result ' + (saved.includes(u.id) ? 'saved' : '')}>
                  <div className="rank">{String(idx+1).padStart(2,'0')}</div>
                  <div style={{ width: '100%' }}>
                    <SchoolImage src={u.imageUrl} alt={u.name} label={u.name.toLowerCase()} height={120} />
                  </div>
                <div className="info">
                  <h3>{u.name}</h3>
                  <div className="loc">{u.state} · {u.size} · tuition {u.tuition}</div>
                  <div className="why">"{u.why}"</div>
                  <div className="tags">
                    {u.tags.map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                </div>
                <div className="score">
                  <div className="n" style={{ color: compatibilityColor }}>
                    {u.score}<span className="pct" style={{ color: compatibilityColor }}>%</span>
                  </div>
                  <div className="lab">Match</div>
                  <div className="row">
                    <button className={'icon-btn ' + (saved.includes(u.id) ? 'on' : '')}
                      onClick={() => toggleSave(u.id)}
                      title={saved.includes(u.id) ? 'Saved' : 'Save'}>
                      <Icon.bookmark size={14} fill={saved.includes(u.id) ? 'currentColor' : 'none'}/>
                    </button>
                    <button className="btn sm" onClick={() => openPitch(u)}>View</button>
                  </div>
                </div>
              </div>
                  );
                })()
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn" onClick={() => onNav('selection')}>
            I'm ready to select my schools <Icon.arrowR size={14}/>
          </button>
          <div className="mono-tag" style={{ marginTop: 10 }}>Pick 1 to 3 schools to shape your friend matches.</div>
        </div>
      </div>

      {popupCollege ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 999 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 24, padding: 28, maxWidth: 560, width: '100%', position: 'relative' }}>
            <button
              onClick={() => setPopupCollege(null)}
              style={{ position: 'absolute', top: 16, right: 16, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              x
            </button>
            <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24 }}>Why {popupCollege.name}?</h2>
            <div style={{ color: 'var(--ink-2)', marginBottom: 18, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Counselor pitch</div>
            <div style={{ fontSize: 16, lineHeight: 1.7, minHeight: 96 }}>
              {pitch ? pitch : <div style={{ opacity: 0.6, fontStyle: 'italic' }}>Loading pitch...</div>}
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => toggleSave(popupCollege.id)}>
                {saved.includes(popupCollege.id) ? 'Saved to list' : 'Save college'}
              </button>
              <button className="btn ghost" onClick={() => { setPopupCollege(null); onNav('selection'); }}>
                Continue to selection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
