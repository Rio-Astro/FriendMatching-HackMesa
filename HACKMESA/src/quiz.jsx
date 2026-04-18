import { useEffect, useState } from 'react';

import { QUIZ } from './data';
import { Icon, Nav } from './shared';

export default function Quiz({ onNav, answers, setAnswers }) {
  const [i, setI] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const q = QUIZ[i];
  const total = QUIZ.length;

  const goTo = (next) => {
    setSlideKey(prev => prev + 1);
    setI(next);
  };

  const choose = (key) => {
    setAnswers((current) => ({ ...current, [q.id]: key }));

    if (i < total - 1) {
      goTo(i + 1);
      return;
    }

    onNav('results');
  };

  const chooseFromSearch = (value) => {
    setSearchValue(value);

    const normalizedValue = value.trim().toLowerCase();
    const matchedOption = q.options.find((option) => {
      return option.label.toLowerCase() === normalizedValue || option.key.toLowerCase() === normalizedValue;
    });

    setAnswers((current) => {
      const next = { ...current };

      if (matchedOption) {
        next[q.id] = matchedOption.key;
      } else {
        delete next[q.id];
      }

      return next;
    });
  };

  const selectSearchOption = (option) => {
    setSearchValue(option.label);
    setAnswers((current) => ({ ...current, [q.id]: option.key }));
    setSearchFocused(false);
  };

  const submitSearch = () => {
    if (!cur) {
      return;
    }

    choose(cur);
  };

  const cur = answers[q.id];
  const filteredOptions = q.type === 'search-select'
    ? q.options.filter((option) => {
        const query = searchValue.trim().toLowerCase();

        if (!query) {
          return option.key === 'Any';
        }

        return option.label.toLowerCase().includes(query) || option.key.toLowerCase().includes(query);
      }).slice(0, 6)
    : [];

  useEffect(() => {
    if (q.type !== 'search-select') {
      setSearchValue('');
      return;
    }

    const currentOption = q.options.find((option) => option.key === cur);
    setSearchValue(currentOption?.label || '');
  }, [cur, q]);

  return (
    <div className="page" data-screen-label={`03 Quiz · ${i+1}/${total}`}>
      <Nav route="quiz" onNav={onNav} />

      <div className="quiz">
        <div className="quiz-bar">
          <div className="quiz-bar-fill" style={{ width: ((i + 1) / total * 100) + '%' }}></div>
        </div>

        <div className="quiz-body">
          <div className="quiz-slide" key={slideKey}>
            <h2>{q.title}</h2>
            {q.type === 'select' ? (
              <div style={{ width: '100%', maxWidth: 400, margin: '0 auto', textAlign: 'left' }}>
                <select 
                  style={{ width: '100%', border: '1px solid var(--line)', background: 'var(--white)', padding: '16px 20px', fontFamily: 'inherit', fontSize: '16px', color: 'var(--ink)', outline: 'none', borderRadius: 14, cursor: 'pointer', appearance: 'none' }}
                  value={cur || ''}
                  onChange={e => choose(e.target.value)}
                >
                  <option value="" disabled>Select an option...</option>
                  {q.options.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
            ) : q.type === 'search-select' ? (
              <div className="quiz-search-select">
                <div className={'quiz-search-shell' + (searchFocused ? ' on' : '')}>
                  <input
                    className="quiz-search-input"
                    value={searchValue}
                    onChange={(event) => chooseFromSearch(event.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        submitSearch();
                      }
                    }}
                    placeholder="Type a state..."
                    autoComplete="off"
                  />
                  <div className="quiz-search-meta">
                    <span>{cur ? 'Selection ready' : 'Pick one location or no preference'}</span>
                    <span>{cur ? 'Press Enter to submit' : 'Type to search'}</span>
                  </div>
                </div>

                {(searchFocused || searchValue) && filteredOptions.length > 0 ? (
                  <div className="quiz-search-results">
                    {filteredOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={'quiz-search-option' + (cur === option.key ? ' sel' : '')}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSearchOption(option)}
                      >
                        <span>{option.label}</span>
                        <span>{option.key === 'Any' ? 'all states' : option.key}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="quiz-search-help">
                  Start typing, select one option, then click below or press Enter.
                </div>

                <div className="quiz-search-actions">
                  <button
                    type="button"
                    className="btn"
                    disabled={!cur}
                    style={!cur ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                    onClick={submitSearch}
                  >
                    {i === total - 1 ? 'See matches' : 'Continue'} <Icon.arrowR size={14}/>
                  </button>
                </div>
              </div>
            ) : (
              <div className="quiz-options">
                {q.options.map(o => (
                  <button
                    key={o.key}
                    className={'q-option' + (cur === o.key ? ' sel' : '')}
                    onClick={() => choose(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {i > 0 ? (
            <button className="quiz-back" onClick={() => goTo(i - 1)}>
              <Icon.arrowL size={14}/> Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
