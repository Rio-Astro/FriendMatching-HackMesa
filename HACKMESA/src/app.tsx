'use client';

import { useEffect, useState } from 'react';

import type { MatchedSchool, QuizAnswers, RouteName } from '@/lib/types';

import Auth from './auth';
import { UNIVERSITIES } from './data';
import Friends from './friends';
import Landing from './landing';
import Network from './network';
import Posts from './posts';
import Profile from './profile';
import Quiz from './quiz';
import Results from './results';
import Selection from './selection';

export default function MesaApp() {
  const [route, setRoute] = useState<RouteName>('landing');
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [colleges, setColleges] = useState<MatchedSchool[]>(UNIVERSITIES);
  const [saved, setSaved] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [savedFriends, setSavedFriends] = useState<string[]>([]);
  const [variant, setVariant] = useState<'hinge' | 'polaroid' | 'structured'>('hinge');
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [routeLoaded, setRouteLoaded] = useState(false);

  useEffect(() => {
    const savedRoute = window.localStorage.getItem('mesa.route');
    if (savedRoute) {
      setRoute(savedRoute as RouteName);
    }
    setRouteLoaded(true);
  }, []);

  useEffect(() => {
    if (!routeLoaded) {
      return;
    }

    window.localStorage.setItem('mesa.route', route);
    window.scrollTo({ top: 0 });
  }, [route, routeLoaded]);

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

  switch (route) {
    case 'auth':
      return <Auth onNav={setRoute} onLogin={() => setRoute('quiz')} />;
    case 'quiz':
      return <Quiz onNav={setRoute} answers={answers} setAnswers={setAnswers} />;
    case 'results':
      return (
        <Results
          onNav={setRoute}
          saved={saved}
          toggleSave={toggleSave}
          answers={answers}
          colleges={colleges}
          setColleges={setColleges}
        />
      );
    case 'selection':
      return (
        <Selection
          onNav={setRoute}
          selected={selected}
          toggleSelect={toggleSelect}
          colleges={colleges}
        />
      );
    case 'friends':
      return (
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
    case 'network':
      return (
        <Network
          onNav={setRoute}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
          onViewProfile={(id: string) => { setViewProfileId(id); setRoute('profile'); }}
        />
      );
    case 'profile':
      return (
        <Profile
          onNav={setRoute}
          profileId={viewProfileId}
          savedFriends={savedFriends}
          toggleSaveFriend={toggleSaveFriend}
        />
      );
    case 'posts':
      return <Posts onNav={setRoute} />;
    default:
      return <Landing onNav={setRoute} />;
  }
}
