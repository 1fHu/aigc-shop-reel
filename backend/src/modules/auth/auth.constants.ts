export const GUEST_USER_ID = 'a0000000-0000-0000-0000-000000000001';
export const GUEST_USER_EMAIL = 'demo@vidcraft.io';
export const GUEST_USER_NICKNAME = '体验用户';
export const GUEST_USER_PASSWORD = 'demo1234';

export const GUEST_VIDEO_QUOTA_PER_SESSION = 2;
export const GUEST_ACCESS_TOKEN_TTL_SEC = 2 * 60 * 60;
export const GUEST_REFRESH_TOKEN_TTL_SEC = 24 * 60 * 60;

export const USER_ACCESS_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;
export const USER_REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60;

export const isGuestId = (id?: string | null): boolean => id === GUEST_USER_ID;
