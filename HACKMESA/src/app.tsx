'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@clerk/nextjs';

import type { FriendActionType, FriendCard, FriendFeedResult, MatchProfileDraft, MatchedSchool, NavItem, QuizAnswers, RouteName } from '@/lib/types';

import Auth from './auth';
import { UNIVERSITIES } from './data';
import Landing from './landing';
import MyProfile from './my-profile';
import { NavigationProvider } from './navigation-context';
import Network from './network';
import Posts from './posts';
import Profile from './profile';
import Quiz from './quiz';
import Results from './results';
import Selection from './selection';

function getFallbackRoute(hasAuthAccess: boolean, hasTakenQuiz: boolean, hasSelectedSchools: boolean): RouteName {
  if (!hasAuthAccess) {
    return 'landing';
  }

  if (!hasTakenQuiz) {
    return 'quiz';
  }

  if (!hasSelectedSchools) {
    return 'selection';
  }

  return 'network';
}

function getNavItems(hasAuthAccess: boolean, hasTakenQuiz: boolean, hasSelectedSchools: boolean): NavItem[] {
  if (!hasAuthAccess) {
    return [];
  }

  const items: NavItem[] = [{ id: 'landing', label: 'Home' }];

  items.push({ id: 'quiz', label: 'Quiz' });

  if (hasTakenQuiz) {
    items.push({ id: 'results', label: 'Matches' });
  }

  if (hasSelectedSchools) {
    items.push({ id: 'network', label: 'Network' }, { id: 'me', label: 'Profile' });
  }

  return items;
}

async function fetchMatchesForAnswers(answers: QuizAnswers) {
  const response = await fetch('/api/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as MatchedSchool[];
}

export default function MesaApp() {
  const { isLoaded, isSignedIn } = useUser();
  const [route, setRoute] = useState<RouteName>('landing');
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [colleges, setColleges] = useState<MatchedSchool[]>(UNIVERSITIES);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedFriends, setSavedFriends] = useState<string[]>([]);
  const [friendFeed, setFriendFeed] = useState<FriendCard[]>([]);
  const [matchProfile, setMatchProfile] = useState<MatchProfileDraft | null>(null);
  const [hasMatchProfile, setHasMatchProfile] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [isUserStateLoaded, setIsUserStateLoaded] = useState(false);

  const hasAuthAccess = isSignedIn || isDemoMode;
  const hasTakenQuiz = Object.keys(answers).length > 0;
  const hasSelectedSchools = selected.length > 0;
  const navItems = getNavItems(hasAuthAccess, hasTakenQuiz, hasSelectedSchools);
  const showAccountChrome = hasAuthAccess;
  const hasResolvedUserState = !isSignedIn || isUserStateLoaded;

  useEffect(() => {
    const savedRoute = window.localStorage.getItem('mesa.route');
    const savedDemoMode = window.localStorage.getItem('mesa.demoMode');

    if (savedRoute) {
      setRoute(savedRoute as RouteName);
    }

    if (savedDemoMode === 'true') {
      setIsDemoMode(true);
    }

    setRouteLoaded(true);
  }, []);

  useEffect(() => {
    if (!routeLoaded || !isLoaded) {
      return;
    }

    window.localStorage.setItem('mesa.route', route);
    window.localStorage.setItem('mesa.demoMode', String(isDemoMode));
    window.scrollTo({ top: 0 });
  }, [isDemoMode, isLoaded, route, routeLoaded]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setIsUserStateLoaded(true);
      return;
    }

    let cancelled = false;

    async function hydrateUserState() {
      setIsUserStateLoaded(false);

      try {
        const response = await fetch('/api/user/state');

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as {
          quizAnswers?: QuizAnswers;
          savedSchoolIds?: string[];
          selectedSchoolIds?: string[];
        };

        if (cancelled) {
          return;
        }

        setAnswers(data.quizAnswers || {});
        setSaved(Array.isArray(data.savedSchoolIds) ? data.savedSchoolIds : []);
        setSelected(Array.isArray(data.selectedSchoolIds) ? data.selectedSchoolIds : []);

        if (data.quizAnswers && Object.keys(data.quizAnswers).length > 0) {
          try {
            const matchedColleges = await fetchMatchesForAnswers(data.quizAnswers);

            if (!cancelled) {
              setColleges(matchedColleges);
            }
          } catch (error) {
            console.error('Failed to preload matches for saved quiz answers', error);
          }
        } else {
          setColleges(UNIVERSITIES);
        }
      } catch (error) {
        console.error('Failed to hydrate user state', error);
      } finally {
        if (!cancelled) {
          setIsUserStateLoaded(true);
        }
      }
    }

    void hydrateUserState();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!routeLoaded || !isLoaded || !hasResolvedUserState) {
      return;
    }

    const allowedRoutes = new Set<RouteName>(['landing', 'auth']);

    if (hasAuthAccess) {
      allowedRoutes.add('quiz');
    }

    if (hasTakenQuiz) {
      allowedRoutes.add('results');
      allowedRoutes.add('selection');
    }

    if (hasSelectedSchools) {
      allowedRoutes.add('network');
      allowedRoutes.add('me');
      allowedRoutes.add('posts');

      if (viewProfileId) {
        allowedRoutes.add('profile');
      }
    }

    if (!allowedRoutes.has(route)) {
      setRoute(getFallbackRoute(hasAuthAccess, hasTakenQuiz, hasSelectedSchools));
    }
  }, [hasAuthAccess, hasResolvedUserState, hasSelectedSchools, hasTakenQuiz, isLoaded, route, routeLoaded, viewProfileId]);

  useEffect(() => {
    if (isSignedIn && isDemoMode) {
      setIsDemoMode(false);
    }
  }, [isDemoMode, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || isSignedIn || isDemoMode) {
      return;
    }

    setAnswers({});
    setColleges(UNIVERSITIES);
    setSaved([]);
    setSelected([]);
    setSavedFriends([]);
    setFriendFeed([]);
    setMatchProfile(null);
    setHasMatchProfile(false);
    setViewProfileId(null);
  }, [isDemoMode, isLoaded, isSignedIn]);

  const recomputeFriends = async () => {
    try {
      const response = await fetch('/api/friends/recompute', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      setHasMatchProfile(Boolean(data.profile));
      if (data.profile) {
        setMatchProfile(data.profile);
      }
      if (Array.isArray(data.items)) {
        setFriendFeed(data.items);
      }
      if (Array.isArray(data.savedProfileIds)) {
        setSavedFriends(data.savedProfileIds);
      }
    } catch (error) {
      console.error('Failed to recompute friend feed', error);
    }
  };

  const applyFriendAction = async (targetProfileId: string, actionType: FriendActionType, isActive = true) => {
    const response = await fetch('/api/friends/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetProfileId, actionType, isActive }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as FriendFeedResult;

    if (Array.isArray(data.items)) {
      setFriendFeed(data.items);
    }

    if (Array.isArray(data.savedProfileIds)) {
      setSavedFriends(data.savedProfileIds);
    }
  };

  const persistSavedSchool = async (schoolId: string, savedNextValue: boolean, rollbackValue: string[]) => {
    try {
      const response = await fetch('/api/user/saved-schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, saved: savedNextValue }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (error) {
      console.error('Failed to persist saved school', error);
      setSaved(rollbackValue);
    }
  };

  const persistSelectedSchools = async (selectedNextValue: string[], rollbackValue: string[]) => {
    try {
      const response = await fetch('/api/user/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedSchoolIds: selectedNextValue }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (hasMatchProfile) {
        void recomputeFriends();
      }
    } catch (error) {
      console.error('Failed to persist selected schools', error);
      setSelected(rollbackValue);
    }
  };

  const persistQuizCompletion = async (completedAnswers: QuizAnswers) => {
    try {
      const response = await fetch('/api/user/quiz-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: completedAnswers }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (hasMatchProfile) {
        void recomputeFriends();
      }
    } catch (error) {
      console.error('Failed to persist quiz results', error);
    }
  };

  const toggleSave = (id: string) => {
    setSaved((current) => {
      const wasSaved = current.includes(id);
      const nextValue = wasSaved ? current.filter((value) => value !== id) : [...current, id];

      if (isSignedIn && !isDemoMode) {
        void persistSavedSchool(id, !wasSaved, current);
      }

      return nextValue;
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const nextValue = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(0, 3);

      if (isSignedIn && !isDemoMode) {
        void persistSelectedSchools(nextValue, current);
      }

      return nextValue;
    });
  };

  const toggleSaveFriend = (id: string) => {
    setSavedFriends((current) => {
      const wasSaved = current.includes(id);
      const nextValue = wasSaved ? current.filter((value) => value !== id) : [...current, id];

      if (isSignedIn && !isDemoMode) {
        void applyFriendAction(id, 'save', !wasSaved).catch((error) => {
          console.error('Failed to persist saved friend action', error);
          setSavedFriends(current);
        });
      }

      return nextValue;
    });
  };

  const handleFriendSafetyAction = async (id: string, actionType: Exclude<FriendActionType, 'save'>) => {
    if (isDemoMode || !isSignedIn) {
      setFriendFeed((current) => current.filter((item) => item.id !== id));
      setSavedFriends((current) => current.filter((value) => value !== id));
      if (viewProfileId === id) {
        setRoute('network');
      }
      return;
    }

    try {
      await applyFriendAction(id, actionType, true);
      if (viewProfileId === id) {
        setViewProfileId(null);
        setRoute('network');
      }
    } catch (error) {
      console.error(`Failed to ${actionType} friend`, error);
    }
  };

  let content;

  if (isLoaded && isSignedIn && !isUserStateLoaded) {
    return (
      <NavigationProvider value={{ items: navItems, isDemoMode, showAccountChrome }}>
        <div className="page">
          <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--ink-2)' }}>
            <div className="mono-tag">Loading your saved Mesa state...</div>
          </div>
        </div>
      </NavigationProvider>
    );
  }

  switch (route) {
    case 'auth':
      content = <Auth onNav={setRoute} onLogin={(mode: 'demo' | 'clerk') => { setIsDemoMode(mode === 'demo'); setRoute('quiz'); }} />;
      break;
    case 'quiz':
      content = (
        <Quiz
          onNav={setRoute}
          answers={answers}
          setAnswers={setAnswers}
          onComplete={(completedAnswers) => {
            if (isSignedIn && !isDemoMode) {
              void persistQuizCompletion(completedAnswers);
            }
          }}
        />
      );
      break;
    case 'results':
      content = (
        <Results
          onNav={setRoute}
          saved={saved}
          toggleSave={toggleSave}
          answers={answers}
          colleges={colleges}
          setColleges={setColleges}
        />
      );
      break;
    case 'selection':
      content = (
        <Selection
          onNav={setRoute}
          selected={selected}
          toggleSelect={toggleSelect}
          colleges={colleges}
        />
      );
      break;
    case 'network':
      content = (
        <Network
          onNav={setRoute}
          isDemoMode={isDemoMode}
          selected={selected}
          colleges={colleges}
          savedFriends={savedFriends}
          setSavedFriends={setSavedFriends}
          toggleSaveFriend={toggleSaveFriend}
          onHideFriend={(id: string) => { void handleFriendSafetyAction(id, 'hide'); }}
          friendFeed={friendFeed}
          setFriendFeed={setFriendFeed}
          setMatchProfile={setMatchProfile}
          hasMatchProfile={hasMatchProfile}
          setHasMatchProfile={setHasMatchProfile}
          onViewProfile={(id: string) => { setViewProfileId(id); setRoute('profile'); }}
        />
      );
      break;
    case 'me':
      content = (
        <MyProfile
          onNav={setRoute}
          isDemoMode={isDemoMode}
          selected={selected}
          colleges={colleges}
          matchProfile={matchProfile}
          setMatchProfile={setMatchProfile}
          hasMatchProfile={hasMatchProfile}
          setHasMatchProfile={setHasMatchProfile}
          setFriendFeed={setFriendFeed}
        />
      );
      break;
    case 'profile':
      content = (
        <Profile
          onNav={setRoute}
          profileId={viewProfileId}
          isDemoMode={isDemoMode}
          friendFeed={friendFeed}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
          onHideFriend={(id: string) => { void handleFriendSafetyAction(id, 'hide'); }}
          onBlockFriend={(id: string) => { void handleFriendSafetyAction(id, 'block'); }}
          onReportFriend={(id: string) => { void handleFriendSafetyAction(id, 'report'); }}
        />
      );
      break;
    case 'posts':
      content = <Posts onNav={setRoute} />;
      break;
    default:
      content = <Landing onNav={setRoute} />;
      break;
  }

  return (
    <NavigationProvider value={{ items: navItems, isDemoMode, showAccountChrome }}>
      {content}
    </NavigationProvider>
  );
}
