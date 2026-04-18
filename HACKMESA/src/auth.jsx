'use client';

import { useEffect, useState } from 'react';

import { UserButton, useClerk, useUser } from '@clerk/nextjs';

import { Icon, Nav } from './shared';

export default function Auth({ onNav, onLogin }) {
  const [mode, setMode] = useState('signup');
  const { openSignIn, openSignUp } = useClerk();
  const { isSignedIn, isLoaded, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    onLogin('clerk');
    onNav('quiz');
  }, [isLoaded, isSignedIn, onLogin, onNav, user]);

  const launchAuth = async () => {
    if (mode === 'signup') {
      await openSignUp();
      return;
    }

    await openSignIn();
  };

  const continueDemo = () => {
    onLogin('demo');
    onNav('quiz');
  };

  return (
    <div className="page" data-screen-label="02 Auth">
      <Nav route="auth" onNav={onNav} showLogin />
      <div className="auth">
        <div className="auth-copy">
          <span className="eyebrow">Almost there</span>
          <h1>The short part,<br/>then the fun part.</h1>
          <p>Make a free account to save your matches and come back to them. Or try demo mode if you just want to look around first. No pressure either way.</p>
        </div>

        <div className="auth-form">
          <div className="auth-tabs">
            <button type="button" className={mode==='signup' ? 'on' : ''} onClick={()=>setMode('signup')}>Create account</button>
            <button type="button" className={mode==='login' ? 'on' : ''} onClick={()=>setMode('login')}>Log in</button>
          </div>

          <h2 className="serif" style={{ fontWeight: 380, fontSize: 36, margin: '0 0 10px', lineHeight: 1 }}>
            {mode==='signup' ? 'Nice to meet you.' : 'Welcome back.'}
          </h2>
          <p style={{ color: 'var(--ink-2)', margin: 0, marginBottom: 28 }}>
            {mode==='signup' ? 'Takes about 20 seconds. You can change everything later.' : 'Pick up where you left off.'}
          </p>

          <div style={{ color: 'var(--ink-2)', marginBottom: 28, lineHeight: 1.6 }}>
            {isSignedIn ? (
              <>
                <div style={{ marginBottom: 14 }}>Signed in as {user?.primaryEmailAddress?.emailAddress || user?.fullName || 'your account'}.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserButton />
                  <span>Continue when you're ready.</span>
                </div>
              </>
            ) : (
              <>
                Authentication is handled by Clerk in a secure popup, so you do not need to type credentials directly into this prototype screen.
              </>
            )}
          </div>

          <button className="btn" type="button" onClick={launchAuth} style={{ justifyContent: 'center', marginTop: 10 }}>
            {mode==='signup' ? 'Create account and start quiz' : 'Log in with Clerk'} <Icon.arrowR size={14}/>
          </button>

          <div className="divider">or</div>

          <button className="btn ghost" type="button" onClick={continueDemo} style={{ justifyContent: 'center' }}>
            Continue in demo mode
          </button>
        </div>
      </div>
    </div>
  );
}
