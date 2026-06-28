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

export interface ThreadMedia {
  type: 'image' | 'video';
  src: string;
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
  media?: ThreadMedia;
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

/* ----------------------------- deterministic helpers ----------------------------- */
// Stable across SSR/CSR (no Math.random) so counts/comments don't flicker or
// trigger hydration mismatches.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];
/** Realistic, non-round number in [min,max] (always under 1,000 by caller's bounds). */
const seededCount = (seed: number, min: number, max: number) => min + (hash('n' + seed) % (max - min + 1));

/* ----------------------------- communities ----------------------------- */
// Palette only: orange or black accents (no green/blue/purple/pink). US/varied
// communities have no real logo (they're demo subreddits) → CommunityAvatar shows
// a clean orange-circle placeholder.
const SEED_COMMUNITIES: Community[] = [
  // Local (Canada)
  { id: 'richmondhill-eats', name: 'RichmondHillEats', description: 'Food discoveries in Richmond Hill', memberCount: 1842, color: '#f97316', votes: 312, userVote: 0 },
  { id: 'support-local', name: 'SupportLocal', description: 'Champion local businesses', memberCount: 3210, color: '#111111', votes: 528, userVote: 0 },
  // United States — varied regions & themes
  { id: 'texas-steak-lovers', name: 'TexasSteakLovers', description: 'Brisket, ribeyes and BBQ pits across Texas', memberCount: 5840, color: '#f97316', votes: 921, userVote: 0 },
  { id: 'nyc-eats', name: 'NYCEats', description: 'Pizza, bagels and hidden gems in New York City', memberCount: 8421, color: '#111111', votes: 940, userVote: 0 },
  { id: 'california-foodies', name: 'CaliforniaFoodies', description: 'Farm-to-table and taco trucks across California', memberCount: 6210, color: '#f97316', votes: 845, userVote: 0 },
  { id: 'chicago-deep-dish', name: 'ChicagoDeepDish', description: 'Deep dish, Italian beef and the best of Chicago', memberCount: 4730, color: '#111111', votes: 712, userVote: 0 },
  { id: 'southern-comfort-food', name: 'SouthernComfortFood', description: 'Soul food, biscuits and BBQ across the South', memberCount: 3980, color: '#f97316', votes: 564, userVote: 0 },
  { id: 'pnw-coffee', name: 'PNWCoffee', description: 'Third-wave coffee and roasters in the Pacific Northwest', memberCount: 3120, color: '#111111', votes: 489, userVote: 0 },
  { id: 'local-services', name: 'LocalServices', description: 'Trusted local service providers', memberCount: 956, color: '#f97316', votes: 184, userVote: 0 },
];

/* ----------------------------- media (matched to posts by filename) ----------------------------- */
const THREAD_MEDIA: Record<string, ThreadMedia> = {
  t1: { type: 'image', src: '/community-media/images.jpg' },
  t2: { type: 'video', src: '/community-media/franklin-bbq-vs-austin-popups.mp4' },
  t3: { type: 'image', src: '/community-media/best-150-slice.jpg' },
  t5: { type: 'image', src: '/community-media/lou-malnati-vs-giordano-settle-it.jpg' },
  t6: { type: 'image', src: '/community-media/best-fried-chicken-nashville.jpg' },
  t7: { type: 'image', src: '/community-media/independent-coffee-shop.jpg' },
  t8: { type: 'video', src: '/community-media/independent-coffee-shop-video.mp4' },
};

const BASE_THREADS: Omit<Thread, 'commentCount' | 'media'>[] = [
  { id: 't1', communityId: 'richmondhill-eats', communityName: 'RichmondHillEats', title: 'Best hidden-gem bakery near Yonge & 16th?', content: 'Looking for a great bakery for weekend brunch. Hidden gems welcome — the more off the beaten path the better.', author: 'localfoodie', votes: 128, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: 't2', communityId: 'texas-steak-lovers', communityName: 'TexasSteakLovers', title: 'Franklin BBQ vs the new Austin pop-ups — worth the 3-hour line?', content: 'Visiting Austin next month. Is Franklin still the gold standard, or are the newer pop-up pits actually better brisket these days?', author: 'briskethunter', votes: 412, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: 't3', communityId: 'nyc-eats', communityName: 'NYCEats', title: 'Best $1.50 slice that is somehow still good in 2026?', content: 'Inflation is brutal but I refuse to give up the dollar-ish slice. Which spots still hold it down across the five boroughs?', author: 'slicelife', votes: 356, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 14).toISOString() },
  { id: 't4', communityId: 'california-foodies', communityName: 'CaliforniaFoodies', title: 'Best taco truck in the Mission right now?', content: 'In SF for the week and chasing the best al pastor. Truck recommendations only — no sit-down places. Bonus points for late-night.', author: 'tacotuesday', votes: 198, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 22).toISOString() },
  { id: 't5', communityId: 'chicago-deep-dish', communityName: 'ChicagoDeepDish', title: 'Lou Malnati’s vs Giordano’s — settle it', content: 'Hosting out-of-towners and can only do one deep dish night. Which one represents Chicago best? Convince me.', author: 'windycityeats', votes: 287, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 30).toISOString() },
  { id: 't6', communityId: 'southern-comfort-food', communityName: 'SouthernComfortFood', title: 'Best fried chicken biscuit in Nashville?', content: 'Hot chicken gets all the attention but I want the perfect fried chicken biscuit. Where do the locals actually go?', author: 'biscuitqueen', votes: 164, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 38).toISOString() },
  { id: 't7', communityId: 'pnw-coffee', communityName: 'PNWCoffee', title: 'Underrated Seattle roaster that beats the big names?', content: 'Tired of the usual suspects. Which small-batch roaster in the PNW is quietly doing the best work right now?', author: 'pourover_pdx', votes: 142, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 44).toISOString() },
  { id: 't8', communityId: 'support-local', communityName: 'SupportLocal', title: 'Drop your favourite independent coffee shop', content: 'Compiling a community list of the best local cafes. Chain-free only. Share your go-to spots.', author: 'beanlover', votes: 254, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 50).toISOString() },
  { id: 't9', communityId: 'local-services', communityName: 'LocalServices', title: 'Reliable HVAC for a furnace tune-up before winter?', content: 'Need a trustworthy technician for annual furnace maintenance. Budget around $150. Any recommendations in the area?', author: 'homeowner_22', votes: 86, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 56).toISOString() },
];

// Hand-written featured top comments (shown first; specific to each thread).
const SEED_COMMENTS: ThreadComment[] = [
  { id: 'c1', threadId: 't1', author: 'bakery_lover', content: 'Le Croissant on Yonge is excellent — small place, authentic French-style pastries. Go on Saturday morning for the best selection.', votes: 245, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'c2', threadId: 't2', author: 'smokering', content: 'Franklin is still elite but the line is a part-time job. For the same quality with no wait, hit the weekend pop-ups in East Austin.', votes: 421, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 7).toISOString() },
  { id: 'c3', threadId: 't2', author: 'pitmaster_tx', content: 'Drive to Lockhart. Smitty’s and Black’s will change your life and you skip the Austin crowds entirely.', votes: 398, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: 'c4', threadId: 't3', author: 'boroughbites', content: 'Joe’s on Carmine is technically over a buck-fifty now but the slice quality is unmatched for the price. Worth it.', votes: 376, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 13).toISOString() },
  { id: 'c5', threadId: 't4', author: 'food_explorer', content: 'El Farolito at 1 AM is the answer. The al pastor off the trompo is bright and acidic — do not skip the salsa verde.', votes: 264, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 20).toISOString() },
  { id: 'c6', threadId: 't5', author: 'deepdishdan', content: 'Lou Malnati’s butter crust wins it for me every time. Giordano’s is good but Lou’s is the one I bring people to.', votes: 388, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 28).toISOString() },
  { id: 'c7', threadId: 't6', author: 'nashville_native', content: 'Skip the tourist spots — the biscuit place in East Nashville does a buttermilk fried chicken biscuit that locals swear by.', votes: 252, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
  { id: 'c8', threadId: 't7', author: 'coffee_nerd', content: 'A small roaster in Ballard is quietly out-roasting the big names. Their single-origin Ethiopian is consistently excellent.', votes: 241, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 42).toISOString() },
  { id: 'c9', threadId: 't8', author: 'beanlover', content: 'My go-to is a tiny chain-free cafe with one barista who remembers your order. That is the whole magic of independent shops.', votes: 233, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 48).toISOString() },
  { id: 'c10', threadId: 't9', author: 'hvac_tech', content: 'Avoid the big-box service companies. Local independent techs are usually faster and more honest about what actually needs replacing.', votes: 167, userVote: 0, createdAt: new Date(Date.now() - 3600000 * 54).toISOString() },
];

// Varied usernames + natural comment lines used to fill each thread to 30+ comments.
const USERNAMES = [
  'mapleleafeats', 'corner_table', 'hungry_hannah', 'devon_eats', 'spoonandfork', 'noodlenomad',
  'cravingsdaily', 'thelocalbite', 'sidewalk_chef', 'brunchbandit', 'midnight_muncher', 'saucy_sam',
  'forkyeah', 'plate_chaser', 'the_food_map', 'curiouspalate', 'weeknightcook', 'snackscout',
  'first_in_line', 'tabletalk', 'grazinggrace', 'urban_grazer', 'flavor_finder', 'tastebud_tom',
  'queue_jumper', 'locallegend', 'theusualorder', 'bite_sized', 'roamandeat', 'kitchen_nomad',
  'second_helping', 'reservation_for1', 'crumbcatcher', 'dailyspecial', 'eats_with_amy', 'no_reservations',
  'pantry_raider', 'streetfood_stan', 'the_quiet_eater', 'wellfedwes',
];
const COMMENT_POOL = [
  'This is exactly what I was looking for, thanks for sharing.',
  'Came here to say the same thing — totally agree.',
  'Saving this thread for the weekend, great recs.',
  'Underrated take. People sleep on this spot.',
  'Tried it last week on a recommendation and it lived up to the hype.',
  'Honestly the value here is unbeatable for what you get.',
  'Been going for years and it never disappoints.',
  'The line moves faster than you would expect, worth it.',
  'Go early — they sell out of the good stuff by noon.',
  'Service was friendly and everything came out fresh.',
  'Took my family and everyone left happy.',
  'Hidden gem for sure, glad someone finally mentioned it.',
  'Disagree slightly but I respect the pick.',
  'Adding this to my list immediately.',
  'Portion sizes are generous and the prices are fair.',
  'Best in the area, hands down. Nothing else comes close.',
  'I drove across town for this and would do it again.',
  'Ask for it fresh off the grill, makes a huge difference.',
  'Parking is rough but the food makes up for it.',
  'Local favorite for a reason, support these folks.',
  'Their weekday special is the move if you want to save a bit.',
  'Quality has stayed consistent which is rare these days.',
  'Solid spot, though I think the one downtown is slightly better.',
  'My order is always ready on time and packaged well.',
  'Can confirm — this is the real deal.',
  'Great atmosphere and even better staff.',
  'Wish more places put this much care into the basics.',
  'Took a chance based on this thread and was not let down.',
  'The owner is super welcoming, makes you want to come back.',
  'Perfect for a casual night out without breaking the bank.',
  'Went last Friday with the whole family and we were absolutely blown away — the quality has gone up significantly since the last time we visited. Would recommend calling ahead on weekends because the wait can be 20 to 30 minutes.',
  'Honestly the best version of this I have had in years. The owner clearly puts real care into every detail, from sourcing to presentation. I have already sent three friends and they all came back with the same reaction.',
  'Hard to find spots like this anymore. The prices are fair for what you get, the staff remembered my order on my second visit, and nothing felt rushed.',
  'Tried it based on this thread and it exceeded the hype. Showed up at opening on a Saturday and there was already a small line — totally worth it. The staff moved quickly and everyone seemed to know what they were doing.',
  'What makes this place stand out is consistency. I have been probably fifteen times over the past year and it has never had an off day — same quality every single time, which is rarer than it should be.',
  'First time visiting and I was genuinely impressed. The portions were larger than I expected, the flavour was dialled in, and I appreciated that they use quality ingredients without charging you extra for it.',
  'Came for the first time based on this recommendation and will absolutely be back. It is the kind of place where you can tell the people running it actually care about what they are serving.',
  'The location is not ideal for parking but once you are in, the experience makes you forget about it completely. Everything we ordered came out perfectly and the staff were attentive without being overbearing.',
];

function generateComments(): ThreadComment[] {
  const all: ThreadComment[] = [...SEED_COMMENTS];
  for (const t of BASE_THREADS) {
    const seeded = SEED_COMMENTS.filter((c) => c.threadId === t.id).length;
    const total = 30 + (hash('total' + t.id) % 60); // 30–89 comments per thread
    const need = Math.max(0, total - seeded);
    for (let i = 0; i < need; i++) {
      const h = hash(`${t.id}:c:${i}`);
      all.push({
        id: `${t.id}-gc${i}`,
        threadId: t.id,
        author: pick(USERNAMES, h),
        content: pick(COMMENT_POOL, h >> 5),
        votes: 2 + (h % 760), // 2–761, varied and under 1,000
        userVote: 0,
        createdAt: new Date(Date.now() - 3600000 * (2 + (h % 120))).toISOString(),
      });
    }
  }
  return all;
}

const GENERATED_COMMENTS = generateComments();

const SEED_THREADS: Thread[] = BASE_THREADS.map((t) => ({
  ...t,
  media: THREAD_MEDIA[t.id],
  commentCount: GENERATED_COMMENTS.filter((c) => c.threadId === t.id).length,
}));

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
  const [comments, setComments] = useState<ThreadComment[]>(GENERATED_COMMENTS);

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
