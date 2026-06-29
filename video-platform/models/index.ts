/**
 * models/index — barrel of shared TypeScript types for the app's domain entities.
 * Purpose: Re-exports the model types (comments, messages, profiles, videos, auth, search, analytics)
 *   so other modules can import them from one path ('@/models'). Types only — no runtime code.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export type { Comment, CreateCommentPayload, CreateReplyPayload, UpdateCommentPayload, CommentSubscriptionCallback, LikeSubscriptionCallback } from './Comment';
export type { Message, Chat, ChatMember, ChatWithDetails } from './Message';
export type { Profile, Business, ProfileUpdateData, BusinessUpdateData } from './Profile';
export type { VideoMetadata } from './Video';
export type { SignUpData, SignInData } from './Auth';
export type { SearchMode, SearchFilters } from './Search';
export type { AnalyticsSummary, SpendingDataPoint, ViewsDataPoint, VideoPerformance, CoinDistribution, PromotionEntry, AnalyticsData } from './Analytics';
