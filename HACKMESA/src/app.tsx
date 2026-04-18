'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@clerk/nextjs';

import type { MatchedSchool, NavItem, QuizAnswers, RouteName } from '@/lib/types';

import Auth from './auth';
import { UNIVERSITIES } from './data';
import Friends from './friends';
import Landing from './landing';
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

  return 'friends';
}

function getNavItems(hasAuthAccess: boolean, hasTakenQuiz: boolean, hasSelectedSchools: boolean): NavItem[] {
  if (!hasAuthAccess || !hasTakenQuiz) {
    return [];
  }

  const items: NavItem[] = [{ id: 'landing', label: 'Home' }];

  items.push({ id: 'quiz', label: 'Quiz' }, { id: 'results', label: 'Matches' });

  if (hasSelectedSchools) {
    items.push({ id: 'friends', label: 'Friends' }, { id: 'network', label: 'Network' });
  }

  return items;
}

export default function MesaApp() {
  const { isLoaded, isSignedIn } = useUser();
  const [route, setRoute] = useState<RouteName>('landing');
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [colleges, setColleges] = useState<MatchedSchool[]>(UNIVERSITIES);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedFriends, setSavedFriends] = useState<string[]>([]);
  const [variant, setVariant] = useState<'hinge' | 'polaroid' | 'structured'>('hinge');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [routeLoaded, setRouteLoaded] = useState(false);

  const hasAuthAccess = isSignedIn || isDemoMode;
  const hasTakenQuiz = Object.keys(answers).length > 0;
  const hasSelectedSchools = selected.length > 0;
  const navItems = getNavItems(hasAuthAccess, hasTakenQuiz, hasSelectedSchools);
  const showAccountChrome = hasTakenQuiz;

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
    if (!routeLoaded || !isLoaded) {
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
      allowedRoutes.add('friends');
      allowedRoutes.add('network');
      allowedRoutes.add('posts');

      if (viewProfileId) {
        allowedRoutes.add('profile');
      }
    }

    if (!allowedRoutes.has(route)) {
      setRoute(getFallbackRoute(hasAuthAccess, hasTakenQuiz, hasSelectedSchools));
    }
  }, [hasAuthAccess, hasSelectedSchools, hasTakenQuiz, isLoaded, route, routeLoaded, viewProfileId]);

  useEffect(() => {
    if (isSignedIn && isDemoMode) {
      setIsDemoMode(false);
    }
  }, [isDemoMode, isSignedIn]);

  useEffect(() => {
    if (route === 'friends' && selected.length === 0 && colleges.length >= 2) {
      setSelected([colleges[0].id, colleges[1].id]);
    }
  }, [route, selected.length, colleges]);

  const toggleSave = (id: string) => {
    setSaved((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(0, 3),
    );
  };

  const toggleSaveFriend = (id: string) => {
    setSavedFriends((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  let content;

  switch (route) {
    case 'auth':
      content = <Auth onNav={setRoute} onLogin={(mode: 'demo' | 'clerk') => { setIsDemoMode(mode === 'demo'); setRoute('quiz'); }} />;
      break;
    case 'quiz':
      content = <Quiz onNav={setRoute} answers={answers} setAnswers={setAnswers} />;
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
    case 'friends':
      content = (
        <Friends
          onNav={setRoute}
          selected={selected}
          colleges={colleges}
          variant={variant}
          setVariant={setVariant}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
        />
      );
      break;
    case 'network':
      content = (
        <Network
          onNav={setRoute}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
          onViewProfile={(id: string) => { setViewProfileId(id); setRoute('profile'); }}
        />
      );
      break;
    case 'profile':
      content = (
        <Profile
          onNav={setRoute}
          profileId={viewProfileId}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
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
