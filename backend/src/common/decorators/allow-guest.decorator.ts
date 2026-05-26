import { SetMetadata } from '@nestjs/common';
import { ALLOW_GUEST } from '../guards/guest.guard';

/**
 * Mark a controller / handler as accessible to guest accounts.
 * Without this, BlockGuestGuard rejects guests.
 */
export const AllowGuest = () => SetMetadata(ALLOW_GUEST, true);
