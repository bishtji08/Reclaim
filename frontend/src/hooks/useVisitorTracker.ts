import { useEffect, useRef } from 'react';
import { apiService } from '../lib/api/client';
import { User } from '../types';

const SESSION_STORAGE_KEY = 'reclaim_visitor_session_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Generates an RFC4122 v4 compliant UUID
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retrieves the current browser session ID from sessionStorage, or initializes a new one.
 * Reusing sessionStorage ensures one visit per browser session (closing the tab/browser ends the session).
 */
export function getOrCreateVisitorSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && UUID_REGEX.test(existing)) {
      return existing;
    }
    const newId = generateUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newId);
    return newId;
  } catch {
    // If sessionStorage is restricted (e.g. strict sandbox), generate in-memory
    return generateUUID();
  }
}

interface UseVisitorTrackerOptions {
  user: User | null;
  currentPath?: string;
}

/**
 * Privacy-friendly passive visitor tracking hook
 * - Zero personal data collected (No IP, No email, No fingerprints)
 * - Counts 1 visit per browser session
 * - Sends periodic heartbeats to maintain active status
 */
export function useVisitorTracker({ user, currentPath = window.location.pathname }: UseVisitorTrackerOptions) {
  const sessionIdRef = useRef<string>(getOrCreateVisitorSessionId());
  const initializedRef = useRef<boolean>(false);
  const previousPathRef = useRef<string>(currentPath);
  const previousUserRef = useRef<User | null>(user);

  // 1. Initial Session Registration (Once per browser session)
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const sessionId = sessionIdRef.current;
    const landingPath = window.location.pathname || '/';
    const visitorType = user ? 'authenticated' : 'guest';

    apiService.recordVisitorSession({
      sessionId,
      landingPath,
      visitorType,
    }).catch(() => {
      // Passive tracking: swallow errors silently
    });
  }, [user]);

  // 2. Auth State Transition (Guest -> Authenticated)
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (user && !previousUserRef.current) {
      // User just logged in during this active session
      apiService.recordVisitorAuth({ sessionId }).catch(() => {});
    }
    previousUserRef.current = user;
  }, [user]);

  // 3. Route Change / Pageview tracking
  useEffect(() => {
    if (currentPath !== previousPathRef.current) {
      previousPathRef.current = currentPath;
      const sessionId = sessionIdRef.current;
      apiService.recordVisitorPageview({ sessionId, path: currentPath }).catch(() => {});
    }
  }, [currentPath]);

  // 4. Session Heartbeat (every 45s while tab is visible)
  useEffect(() => {
    const sessionId = sessionIdRef.current;

    const sendHeartbeat = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return; // Don't ping if tab is in background
      }
      apiService.recordVisitorHeartbeat({
        sessionId,
        currentPath: window.location.pathname
      }).catch(() => {});
    };

    // Send heartbeat interval
    const interval = setInterval(sendHeartbeat, 45000);

    // Also send on visibility return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { sessionId: sessionIdRef.current };
}
