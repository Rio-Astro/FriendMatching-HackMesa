import { Fragment, useEffect, useState } from 'react';

import { UNIVERSITIES } from './data';
import { Icon, Nav } from './shared';

const CAMPUS_IMAGES = {
  u1: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=200&fit=crop&auto=format', // Pomona — liberal arts campus
  u2: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop&auto=format', // Oberlin — college hall
  u3: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=200&h=200&fit=crop&auto=format', // UC Santa Cruz — redwoods
  u4: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=200&h=200&fit=crop&auto=format', // Macalester — urban campus
  u5: 'https://images.unsplash.com/photo-1576495199011-eb94736d05d6?w=200&h=200&fit=crop&auto=format', // Bowdoin — coastal college
  u6: 'https://images.unsplash.com/photo-1568792923760-d70635a89fdc?w=200&h=200&fit=crop&auto=format', // Kenyon — rural literary
  u7: 'https://images.unsplash.com/photo-1599687267812-35c05ff70ee9?w=200&h=200&fit=crop&auto=format', // Reed — Portland campus
  u8: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=200&h=200&fit=crop&auto=format', // UVM — Burlington
};

const BUBBLE_ZONES = [
  [2, 14, 10, 32],    // top-left
  [82, 96, 8, 28],    // top-right
  [2, 14, 62, 86],    // bottom-left
  [84, 97, 60, 84],   // bottom-right
  [30, 42, 0, 10],    // top-center-left (pushed higher)
  [60, 72, 0, 10],    // top-center-right (pushed higher)
  [20, 36, 84, 97],   // bottom-center-left
  [64, 78, 84, 97],   // bottom-center-right
];

function seededOffset(index, min, max) {
  const hash = ((index * 2654435761) >>> 0) / 4294967296;
  return min + hash * (max - min);
}

function useTypewriter(text, speed, delay) {
  const [charIndex, setCharIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started || charIndex >= text.length) return;
    const timer = setTimeout(
      () => setCharIndex(prev => prev + 1),
      speed
    );
    return () => clearTimeout(timer);
  }, [started, charIndex, text, speed]);

  return {
    displayed: text.slice(0, charIndex),
    isDone: charIndex >= text.length,
  };
}

function Bubble({ uni, index, size }) {
  const zone = BUBBLE_ZONES[index % BUBBLE_ZONES.length];
  const left = seededOffset(index, zone[0], zone[1]);
  const top = seededOffset(index + 8, zone[2], zone[3]);
  const FLOAT_ANIMS = ['floatA', 'floatB', 'floatC', 'floatD'];
  const animName = FLOAT_ANIMS[index % FLOAT_ANIMS.length];
  const duration = 20 + index * 4;
  const animDelay = 0.3 + index * 0.25;
  const morphName = BLOB_MORPHS[index % BLOB_MORPHS.length];
  const morphDuration = 8 + index * 1.5;
  const pulseDelay = index * 1.5;
  const imgSrc = CAMPUS_IMAGES[uni.id];

  const hideClass = index >= 6 ? ' hide-tablet hide-mobile' : index >= 4 ? ' hide-mobile' : '';

  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={'bubble' + hideClass}
      style={{
        left: left + '%',
        top: top + '%',
        width: size,
        height: size + 28, // extra room for label
        animation: `bubbleIn .6s ease ${animDelay}s forwards, ${animName} ${duration}s ease-in-out ${animDelay + 0.6}s infinite`,
      }}
    >
      {imgError ? (
        <div className="ph" style={{
          width: size, height: size,
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10,
          animation: `${morphName} ${morphDuration}s ease-in-out infinite`,
          animationDelay: `${animDelay + 0.6}s`,
        }}>
          {uni.name.split(' ')[0]}
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={uni.name + ' campus'}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{
            animation: `${morphName} ${morphDuration}s ease-in-out infinite, blobPulse ${morphDuration + 4}s ease-in-out infinite`,
            animationDelay: `${animDelay + 0.6}s, ${animDelay + 0.6 + pulseDelay}s`,
          }}
        />
      )}
      <span className="bubble-label">{uni.name.split(',')[0]}</span>
    </div>
  );
}

const BUBBLE_SIZES = [150, 125, 160, 115, 140, 120, 155, 130];
const BLOB_MORPHS = ['blobMorphA', 'blobMorphB', 'blobMorphC', 'blobMorphD'];

export default function Landing({ onNav }) {
  const titleText = "Find your college.\nFind your people.";
  const { displayed, isDone } = useTypewriter(titleText, 60, 400);
  const universities = UNIVERSITIES;

  const titleParts = displayed.split('\n');

  return (
    <div className="page landing-screen" data-screen-label="01 Landing">
      <Nav route="landing" onNav={onNav} showLogin />

      <div className="landing-hero-wrap">
        <div className="bubble-field">
          {universities.map((uni, i) => (
            <Bubble
              key={uni.id}
              uni={uni}
              index={i}
              size={BUBBLE_SIZES[i % BUBBLE_SIZES.length]}
            />
          ))}
        </div>

        <div className="landing-hero-content">
          <span className="eyebrow">A calmer way to pick your college</span>
          <h1 className={isDone ? 'typewriter-done' : 'typewriter-cursor'}>
            {titleParts.map((part, i) => (
              <Fragment key={i}>
                {i > 0 && part ? <br/> : null}
                {part}
              </Fragment>
            ))}
          </h1>
          <p className={'lede' + (isDone ? ' lede-enter' : '')}>
            Mesa is a quiet place to figure out where you're going and who you want to be there with. Take a short quiz, get real matches, meet your future classmates before move-in.
          </p>
          <div className={'ctas' + (isDone ? ' ctas-enter' : '')}>
            <button className="btn" onClick={() => onNav('quiz')}>
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
