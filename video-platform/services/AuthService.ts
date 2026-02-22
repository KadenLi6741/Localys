import type { SignUpData, SignInData } from '../models/Auth';
import { signUp, signIn, signOut, getSession, getCurrentUser, onAuthStateChange } from '../lib/supabase/auth';

export class AuthService {
  async signUp(data: SignUpData) {
    return signUp(data);
  }

  async signIn(data: SignInData) {
    return signIn(data);
  }

  async signOut() {
    return signOut();
  }

  async getSession() {
    return getSession();
  }

  async getCurrentUser() {
    return getCurrentUser();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
