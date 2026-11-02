import type { User } from '../types/auth';
import { useLanguageStore } from '../stores/languageStore';
import { translateText } from './translate';

/** The backend's default guest identity is UI copy; real and custom nicknames are content. */
export function userDisplayName(
  user: Pick<User, 'nickname' | 'is_guest'> | null | undefined,
  fallback = 'VidCrafter',
): string {
  if (user?.is_guest && (!user.nickname || user.nickname === '体验用户')) {
    return translateText('体验用户', useLanguageStore.getState().language);
  }
  return user?.nickname || fallback;
}
