import { supabase } from './client';

export interface CollectionBusiness {
  id: string;
  full_name: string | null;
  username: string | null;
  profile_picture_url: string | null;
  type: string | null;
  bio: string | null;
  latitude: number | null;
  longitude: number | null;
  note?: string | null;
  sort_order?: number | null;
}

export interface BusinessCollection {
  id: string;
  owner_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  image_class: string | null;
  is_public: boolean;
  created_at: string | null;
  updated_at: string | null;
  owner_name?: string | null;
  owner_username?: string | null;
  businesses_count: number;
  likes_count: number;
  viewer_has_liked: boolean;
  businesses?: CollectionBusiness[];
}

interface CollectionRow {
  id: string;
  owner_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  image_class: string | null;
  is_public: boolean;
  created_at: string | null;
  updated_at: string | null;
}

const fallbackCollections: BusinessCollection[] = [
  {
    id: 'fallback-best-study-cafes',
    owner_id: null,
    slug: 'best-study-cafes',
    title: 'Best study cafes',
    description: 'Quiet tables, reliable coffee, and a good rhythm for getting work done.',
    image_class: 'from-[#39302A] via-[#82643D] to-[#E1BE76]',
    is_public: true,
    created_at: null,
    updated_at: null,
    owner_name: 'Localys',
    owner_username: 'localys',
    businesses_count: 4,
    likes_count: 28,
    viewer_has_liked: false,
    businesses: [
      {
        id: 'daily-ritual-coffee',
        full_name: 'Daily Ritual Coffee',
        username: 'dailyritual',
        profile_picture_url: null,
        type: 'food',
        bio: 'Bright cafe with great lattes and an easy neighborhood rhythm.',
        latitude: 43.6548,
        longitude: -79.4007,
        note: 'Best for long laptop sessions near the window.',
        sort_order: 1,
      },
      {
        id: 'greenhouse-skin',
        full_name: 'Greenhouse Skin',
        username: 'greenhouseskin',
        profile_picture_url: null,
        type: 'service',
        bio: 'Calm local studio with a quiet front lounge and clean design.',
        latitude: 43.6573,
        longitude: -79.4076,
        note: 'Peaceful mid-day stop when Little Italy is slower.',
        sort_order: 2,
      },
    ],
  },
  {
    id: 'fallback-hidden-gems',
    owner_id: null,
    slug: 'hidden-gems',
    title: 'Hidden gems',
    description: 'Small spots locals keep recommending after one good visit.',
    image_class: 'from-[#234338] via-[#6BAF7A] to-[#D7E9D2]',
    is_public: true,
    created_at: null,
    updated_at: null,
    owner_name: 'Localys',
    owner_username: 'localys',
    businesses_count: 3,
    likes_count: 41,
    viewer_has_liked: false,
    businesses: [
      {
        id: 'common-sort',
        full_name: 'Common Sort',
        username: 'commonsort',
        profile_picture_url: null,
        type: 'retail',
        bio: 'Curated vintage finds with new treasures arriving daily.',
        latitude: 43.6529,
        longitude: -79.4017,
        note: 'A strong first stop for layered vintage pieces.',
        sort_order: 1,
      },
    ],
  },
  {
    id: 'fallback-weekend-markets',
    owner_id: null,
    slug: 'weekend-markets',
    title: 'Weekend markets',
    description: 'Markets, pop-ups, and maker-friendly stops for a slower weekend loop.',
    image_class: 'from-[#A65F25] via-[#F5A623] to-[#F5D496]',
    is_public: true,
    created_at: null,
    updated_at: null,
    owner_name: 'Localys',
    owner_username: 'localys',
    businesses_count: 5,
    likes_count: 19,
    viewer_has_liked: false,
    businesses: [
      {
        id: 'falafel-world',
        full_name: 'Falafel World',
        username: 'falafelworld',
        profile_picture_url: null,
        type: 'food',
        bio: 'Fresh, fast, and full of flavour. A local favourite.',
        latitude: 43.6553,
        longitude: -79.4029,
        note: 'Good casual bite before browsing the market.',
        sort_order: 1,
      },
    ],
  },
];

export function getFallbackCollections(limit?: number) {
  return typeof limit === 'number' ? fallbackCollections.slice(0, limit) : fallbackCollections;
}

export async function getFeaturedCollections(viewerId?: string | null, limit = 6) {
  const { data, error } = await supabase
    .from('business_collections')
    .select('id, owner_id, slug, title, description, image_class, is_public, created_at, updated_at')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('Collections table is not ready yet:', error.message);
    return { data: getFallbackCollections(limit), error: null };
  }

  return { data: await hydrateCollections(data || [], viewerId), error: null };
}

export async function getCollectionBySlug(slug: string, viewerId?: string | null) {
  const { data, error } = await supabase
    .from('business_collections')
    .select('id, owner_id, slug, title, description, image_class, is_public, created_at, updated_at')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (error) {
    const fallback = fallbackCollections.find((collection) => collection.slug === slug) || null;
    return { data: fallback, error: fallback ? null : error };
  }

  if (!data) {
    const fallback = fallbackCollections.find((collection) => collection.slug === slug) || null;
    return { data: fallback, error: null };
  }

  const [collection] = await hydrateCollections([data], viewerId);
  const businesses = await getCollectionBusinesses(collection.id);
  return { data: { ...collection, businesses }, error: null };
}

export async function likeCollection(collectionId: string, userId: string) {
  if (!collectionId || !userId || collectionId.startsWith('fallback-')) {
    return { error: new Error('Collection likes require the Supabase tables to be installed.') };
  }

  const { error } = await supabase
    .from('business_collection_likes')
    .insert({ collection_id: collectionId, user_id: userId });

  return { error };
}

export async function unlikeCollection(collectionId: string, userId: string) {
  if (!collectionId || !userId || collectionId.startsWith('fallback-')) {
    return { error: new Error('Collection likes require the Supabase tables to be installed.') };
  }

  const { error } = await supabase
    .from('business_collection_likes')
    .delete()
    .eq('collection_id', collectionId)
    .eq('user_id', userId);

  return { error };
}

async function hydrateCollections(rows: CollectionRow[], viewerId?: string | null): Promise<BusinessCollection[]> {
  if (!rows.length) return [];

  const collectionIds = rows.map((row) => row.id).filter(Boolean);
  const ownerIds = [...new Set(rows.map((row) => row.owner_id).filter(Boolean))];
  const ownerMap: Record<string, { full_name: string | null; username: string | null }> = {};
  const itemCountMap: Record<string, number> = {};
  const likeCountMap: Record<string, number> = {};
  const likedSet = new Set<string>();

  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', ownerIds);

    for (const owner of owners || []) {
      ownerMap[owner.id] = {
        full_name: owner.full_name,
        username: owner.username,
      };
    }
  }

  if (collectionIds.length > 0) {
    const [{ data: items }, { data: likes }] = await Promise.all([
      supabase
        .from('business_collection_items')
        .select('collection_id')
        .in('collection_id', collectionIds),
      supabase
        .from('business_collection_likes')
        .select('collection_id, user_id')
        .in('collection_id', collectionIds),
    ]);

    for (const item of items || []) {
      itemCountMap[item.collection_id] = (itemCountMap[item.collection_id] || 0) + 1;
    }

    for (const like of likes || []) {
      likeCountMap[like.collection_id] = (likeCountMap[like.collection_id] || 0) + 1;
      if (viewerId && like.user_id === viewerId) {
        likedSet.add(like.collection_id);
      }
    }
  }

  return rows.map((row) => {
    const owner = row.owner_id ? ownerMap[row.owner_id] : null;

    return {
      id: row.id,
      owner_id: row.owner_id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      image_class: row.image_class,
      is_public: row.is_public,
      created_at: row.created_at,
      updated_at: row.updated_at,
      owner_name: owner?.full_name || owner?.username || 'Localys curator',
      owner_username: owner?.username || null,
      businesses_count: itemCountMap[row.id] || 0,
      likes_count: likeCountMap[row.id] || 0,
      viewer_has_liked: likedSet.has(row.id),
    };
  });
}

async function getCollectionBusinesses(collectionId: string): Promise<CollectionBusiness[]> {
  const { data: items, error } = await supabase
    .from('business_collection_items')
    .select('business_id, note, sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !items?.length) return [];

  const businessIds = items.map((item) => item.business_id).filter(Boolean);
  const { data: businesses } = await supabase
    .from('profiles')
    .select('id, full_name, username, profile_picture_url, type, bio, latitude, longitude')
    .in('id', businessIds);

  const businessMap = new Map((businesses || []).map((business) => [business.id, business]));

  return items
    .map((item) => {
      const business = businessMap.get(item.business_id);
      if (!business) return null;

      return {
        id: business.id,
        full_name: business.full_name,
        username: business.username,
        profile_picture_url: business.profile_picture_url,
        type: business.type,
        bio: business.bio,
        latitude: business.latitude,
        longitude: business.longitude,
        note: item.note,
        sort_order: item.sort_order,
      };
    })
    .filter(Boolean) as CollectionBusiness[];
}
