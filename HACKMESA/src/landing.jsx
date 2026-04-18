import { Fragment, useEffect, useState } from 'react';

import { Icon, Nav } from './shared';
import CreationOfAdamCanvas from './creation-canvas';

function useTypewriter(text, speed, delay) {
  const [charIndex, setCharIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || charIndex >= text.length) return;
    const nextStep = text[charIndex] === '\n' ? 2 : 1;
    const timer = setTimeout(
      () => setCharIndex(prev => Math.min(text.length, prev + nextStep)),
      speed
    );
    return () => clearTimeout(timer);
  }, [started, charIndex, text, speed]);

  return {
    displayed: text.slice(0, charIndex),
    isDone: charIndex >= text.length,
  };
}

export default function Landing({ onNav }) {
  const titleText = "Find your college.\nFind your people.";
  const { displayed, isDone } = useTypewriter(titleText, 18, 60);

  const titleParts = displayed.split('\n');

  return (
    <div className="page landing-screen" data-screen-label="01 Landing">
      <Nav route="landing" onNav={onNav} showLogin />

      <div className="landing-hero-wrap">
        <div className="bubble-field">
          <CreationOfAdamCanvas />
        </div>

        <div className="landing-hero-content">
          <h1 className={isDone ? 'typewriter-done' : 'typewriter-cursor'}>
            {titleParts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 ? <br/> : null}
                {part}
              </Fragment>
            ))}
          </h1>
          <p className={'lede' + (isDone ? ' lede-enter' : '')}>A calmer way to pick your college</p>
          <div className={'ctas' + (isDone ? ' ctas-enter' : '')}>
            <button className="btn" onClick={() => onNav('auth')}>
              Get matched <Icon.arrowR size={14}/>
            </button>
            <button className="btn ghost" onClick={() => onNav('auth')}>
              Try demo mode
            </button>
          </div>
        </div>
      </div>

      <div className="landing-foot">
        <span>&copy; 2026 Mesa</span>
        <span className="mono-tag">Free for students. Always.</span>
        <span>About &middot; Privacy &middot; For counselors</span>
      </div>
    </div>
  );
}
