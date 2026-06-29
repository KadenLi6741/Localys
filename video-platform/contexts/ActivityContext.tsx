'use client';

/**
 * ActivityContext — shared open/closed state and unread count for the notifications (Activity) panel.
 * Purpose: Lets the nav bars toggle the ActivityPanel and show an unread badge without prop-drilling.
 *   The ActivityPanel owns the actual notification data; this context just coordinates open state + count.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { createContext, useContext, useState, useCallback, type ReactNode, type Dispatch, type SetStateAction } from 'react';

interface ActivityContextType {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  unreadCount: number;
  setUnreadCount: Dispatch<SetStateAction<number>>;
}

const ActivityContext = createContext<ActivityContextType>({
  isOpen: false,
  openPanel: () => {},
  closePanel: () => {},
  togglePanel: () => {},
  unreadCount: 0,
  setUnreadCount: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen(p => !p), []);

  return (
    <ActivityContext.Provider value={{ isOpen, openPanel, closePanel, togglePanel, unreadCount, setUnreadCount }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivity = () => useContext(ActivityContext);
