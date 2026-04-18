'use client';

import { createContext, useContext } from 'react';

import type { ReactNode } from 'react';

import type { NavItem } from '@/lib/types';

type NavigationContextValue = {
  items: NavItem[];
  isDemoMode: boolean;
  showAccountChrome: boolean;
};

type NavigationProviderProps = {
  value: NavigationContextValue;
  children: ReactNode;
};

const NavigationContext = createContext<NavigationContextValue>({
  items: [],
  isDemoMode: false,
  showAccountChrome: false,
});

export function NavigationProvider({ value, children }: NavigationProviderProps) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  return useContext(NavigationContext);
}
