import type { ProfileUpdateData, BusinessUpdateData } from '../models/Profile';
import {
  getProfileByUserId,
  uploadProfilePicture,
  updateProfile,
  getUserBusiness,
  updateBusinessInfo,
  getUserCoins,
  deductCoins,
  addCoins,
} from '../lib/supabase/profiles';

export class ProfileService {
  async getProfileByUserId(userId: string) {
    return getProfileByUserId(userId);
  }

  async uploadProfilePicture(file: File, userId: string) {
    return uploadProfilePicture(file, userId);
  }

  async updateProfile(userId: string, updates: ProfileUpdateData) {
    return updateProfile(userId, updates);
  }

  async getUserBusiness(userId: string) {
    return getUserBusiness(userId);
  }

  async updateBusinessInfo(businessId: string, updates: BusinessUpdateData) {
    return updateBusinessInfo(businessId, updates);
  }

  async getUserCoins(userId: string) {
    return getUserCoins(userId);
  }

  async deductCoins(userId: string, amount: number) {
    return deductCoins(userId, amount);
  }

  async addCoins(userId: string, amount: number) {
    return addCoins(userId, amount);
  }
}

export const profileService = new ProfileService();
