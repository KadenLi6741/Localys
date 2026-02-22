import type { VideoMetadata } from '../models/Video';
import {
  uploadVideoMetadata,
  getVideosFeed,
  getVideoById,
  uploadVideoFile,
  getLikeCount,
  getLikeCounts,
  likeVideo,
  unlikeVideo,
  likeItem,
  unlikeItem,
  bookmarkVideo,
  unbookmarkVideo,
  getUserBookmarkedVideos,
  promoteVideo,
  getVideoBoost,
  getWeightedVideoFeed,
  trackVideoView,
} from '../lib/supabase/videos';

export class VideoService {
  async uploadMetadata(metadata: VideoMetadata) {
    return uploadVideoMetadata(metadata);
  }

  async getFeed(limit = 20, offset = 0) {
    return getVideosFeed(limit, offset);
  }

  async getById(videoId: string) {
    return getVideoById(videoId);
  }

  async uploadFile(file: File, userId: string) {
    return uploadVideoFile(file, userId);
  }

  async getLikeCount(businessId: string) {
    return getLikeCount(businessId);
  }

  async getLikeCounts(businessIds: string[]) {
    return getLikeCounts(businessIds);
  }

  async like(userId: string, businessId: string) {
    return likeVideo(userId, businessId);
  }

  async unlike(userId: string, businessId: string) {
    return unlikeVideo(userId, businessId);
  }

  async likeItem(userId: string, itemId: string, itemType: 'video' | 'business' = 'video') {
    return likeItem(userId, itemId, itemType);
  }

  async unlikeItem(userId: string, itemId: string, itemType: 'video' | 'business' = 'video') {
    return unlikeItem(userId, itemId, itemType);
  }

  async bookmark(userId: string, videoId: string) {
    return bookmarkVideo(userId, videoId);
  }

  async unbookmark(userId: string, videoId: string) {
    return unbookmarkVideo(userId, videoId);
  }

  async getUserBookmarkedVideos(userId: string, limit = 20, offset = 0) {
    return getUserBookmarkedVideos(userId, limit, offset);
  }

  async promote(userId: string, videoId: string, coinsToSpend: number) {
    return promoteVideo(userId, videoId, coinsToSpend);
  }

  async getBoost(videoId: string) {
    return getVideoBoost(videoId);
  }

  async getWeightedFeed(limit = 20, offset = 0) {
    return getWeightedVideoFeed(limit, offset);
  }

  async trackView(videoId: string, userId?: string, ipAddress?: string) {
    return trackVideoView(videoId, userId, ipAddress);
  }
}

export const videoService = new VideoService();
