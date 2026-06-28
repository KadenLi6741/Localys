'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  color: string;
  votes: number;
  userVote: 0 | 1 | -1;
}

export interface Thread {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  content: string;
  author: string;
  votes: number;
  userVote: 0 | 1 | -1;
  commentCount: number;
  createdAt: string;
}

export interface ThreadComment {
  id: string;
  threadId: string;
  author: string;
  content: string;
  votes: number;
  userVote: 0 | 1 | -1;
  createdAt: string;
}

const SEED_COMMUNITIES: Community[] = [
  { id: 'richmondhill-eats', name: 'RichmondHillEats', description: 'Food discoveries in Richmond Hill', memberCount: 1842, color: '#f97316', votes: 312, userVote: 0 },
  { id: 'local-services', name: 'LocalServices', description: 'Trusted local service providers', memberCount: 956, color: '#3b82f6', votes: 184, userVote: 0 },
  { id: 'support-local', name: 'SupportLocal', description: 'Champion local businesses', memberCount: 3210, color: '#10b981', votes: 528, userVote: 0 },
  { id: 'markham', name: 'Markham', description: 'Everything in Markham', memberCount: 2140, color: '#8b5cf6', votes: 267, userVote: 0 },
  { id: 'vaughan', name: 'Vaughan', description: 'Local deals and news in Vaughan', memberCount: 1320, color: '#ec4899', votes: 143, userVote: 0 },
];

const SEED_THREADS: Thread[] = [
  { id: 't1', communityId: 'richmondhill-eats', communityName: 'RichmondHillEats', title: 'Best hidden-gem bakery near Yonge & 16th?', content: 'Looking for a great bakery for weekend brunch. Hidden gems welcome — the more off the beaten path the better.', author: 'localfoodie', votes: 128, userVote: 0, commentCount: 34, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 't2', communityId: 'local-services', communityName: 'LocalServices', title: 'Reliable HVAC for a furnace tune-up before winter?', content: 'Need a trustworthy technician for annual furnace maintenance. Budget around $150. Any recommendations in the area?', author: 'homeowner_22', votes: 86, userVote: 0, commentCount: 19, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 't3', communityId: 'support-local', communityName: 'SupportLocal', title: 'Drop your favourite independent coffee shop', content: 'Compiling a community list of the best local cafes. Chain-free only. Share your go-to spots.', author: 'beanlover', votes: 254, userVote: 0, commentCount: 91, createdAt: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 't4', communityId: 'markham', communityName: 'Markham', title: 'New taco spot on Main St is exceptional', content: 'Tried it last weekend. The birria is genuinely one of the best in the GTA — rich broth, great beef. Worth the line.', author: 'tacotuesday', votes: 173, userVote: 0, commentCount: 47, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
  { id: 't5', communityId: 'vaughan', communityName: 'Vaughan', title: "Weekend farmers market — is it worth the trip?", content: 'Has anyone been to the Vaughan farmers market lately? Wondering if the produce selection has improved since last spring.', author: 'farmersmarket_fan', votes: 62, userVote: 0, commentCount: 28, createdAt: new Date(Date.now() - 3600000 * 48).toISOString() },
];

const SEED_COMMENTS: ThreadComment[] = [
  { id: 'c1', threadId: 't1', author: 'bakery_lover', content: 'Le Croissant on Yonge is excellent — small place, authentic French-style pastries. Go on Saturday morning for the best selection.', votes: 45, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'c2', threadId: 't1', author: 'richmond_resident', content: 'There is a Korean bakery on 16th that does incredible cream buns. Highly recommend going early on weekends — they sell out fast.', votes: 32, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: 'c3', threadId: 't3', author: 'coffee_nerd', content: 'Pilot Coffee on Yonge is my regular. Their pour-over is consistently excellent and the staff actually knows their beans.', votes: 88, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 22).toISOString() },
  { id: 'c4', threadId: 't3', author: 'espresso_daily', content: 'Dark Horse Espresso is worth the drive from Markham. Easily the best single origin espresso in the area right now.', votes: 41, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 20).toISOString() },
  { id: 'c5', threadId: 't4', author: 'food_explorer', content: 'Been twice already. The salsa verde is what makes it — bright and acidic. Do not skip the horchata either.', votes: 29, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 30).toISOString() },
  { id: 'c6', threadId: 't2', author: 'hvac_tech', content: 'Avoid the big-box service companies. Local independent techs are usually faster and more honest about what actually needs replacing.', votes: 67, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
];

interface CommunitiesContextType {
  communities: Community[];
  threads: Thread[];
  comments: ThreadComment[];
  vote: (threadId: string, direction: 1 | -1) => void;
  voteComment: (commentId: string, direction: 1 | -1) => void;
  voteCommunity: (communityId: string, direction: 1 | -1) => void;
  createCommunity: (name: string, description: string) => Community;
  createThread: (communityId: string, title: string, content: string, author: string) => Thread;
  addComment: (threadId: string, content: string, author: string) => ThreadComment;
}

const CommunitiesContext = createContext<CommunitiesContextType | null>(null);

export function CommunitiesProvider({ children }: { children: ReactNode }) {
  const [communities, setCommunities] = useState<Community[]>(SEED_COMMUNITIES);
  const [threads, setThreads] = useState<Thread[]>(SEED_THREADS);
  const [comments, setComments] = useState<ThreadComment[]>(SEED_COMMENTS);

  const vote = (threadId: string, direction: 1 | -1) => {
    setThreads(prev => prev.map(t => {
      if (t.id !== threadId) return t;
      const newVote: 0 | 1 | -1 = t.userVote === direction ? 0 : direction;
      const delta = newVote - t.userVote;
      return { ...t, votes: t.votes + delta, userVote: newVote };
    }));
  };

  const voteComment = (commentId: string, direction: 1 | -1) => {
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      const newVote: 0 | 1 | -1 = c.userVote === direction ? 0 : direction;
      const delta = newVote - c.userVote;
      return { ...c, votes: c.votes + delta, userVote: newVote };
    }));
  };

  const voteCommunity = (communityId: string, direction: 1 | -1) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== communityId) return c;
      const newVote: 0 | 1 | -1 = c.userVote === direction ? 0 : direction;
      const delta = newVote - c.userVote;
      return { ...c, votes: c.votes + delta, userVote: newVote };
    }));
  };

  const createCommunity = (name: string, description: string): Community => {
    const community: Community = {
      id: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name: name.replace(/\s+/g, ''),
      description,
      memberCount: 1,
      color: '#f97316',
      votes: 1,
      userVote: 1,
    };
    setCommunities(prev => [community, ...prev]);
    return community;
  };

  const createThread = (communityId: string, title: string, content: string, author: string): Thread => {
    const community = communities.find(c => c.id === communityId);
    const thread: Thread = {
      id: `t-${Date.now()}`,
      communityId,
      communityName: community?.name || communityId,
      title,
      content,
      author,
      votes: 1,
      userVote: 1,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };
    setThreads(prev => [thread, ...prev]);
    return thread;
  };

  const addComment = (threadId: string, content: string, author: string): ThreadComment => {
    const comment: ThreadComment = {
      id: `c-${Date.now()}`,
      threadId,
      author,
      content,
      votes: 1,
      userVote: 1,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, comment]);
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, commentCount: t.commentCount + 1 } : t
    ));
    return comment;
  };

  return (
    <CommunitiesContext.Provider value={{ communities, threads, comments, vote, voteComment, voteCommunity, createCommunity, createThread, addComment }}>
      {children}
    </CommunitiesContext.Provider>
  );
}

export function useCommunities() {
  const ctx = useContext(CommunitiesContext);
  if (!ctx) throw new Error('useCommunities must be used inside CommunitiesProvider');
  return ctx;
}
