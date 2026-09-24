export type DonationStatus =
  | 'POSTED'
  | 'MATCHING'
  | 'MATCHED'
  | 'DRIVER_ASSIGNED'
  | 'PICKUP_STARTED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'EXPIRED'
  | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<DonationStatus, DonationStatus[]> = {
  POSTED: ['MATCHING', 'EXPIRED', 'CANCELLED'],
  MATCHING: ['MATCHED', 'EXPIRED', 'CANCELLED'],
  MATCHED: ['DRIVER_ASSIGNED', 'EXPIRED', 'CANCELLED'],
  DRIVER_ASSIGNED: ['PICKUP_STARTED', 'EXPIRED', 'CANCELLED'],
  PICKUP_STARTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  EXPIRED: [],
  CANCELLED: [],
};

export function isValidTransition(
  currentStatus: DonationStatus,
  nextStatus: DonationStatus
): boolean {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

export function validateStateTransition(
  currentStatus: DonationStatus,
  nextStatus: DonationStatus
): void {
  if (!isValidTransition(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid donation state transition from '${currentStatus}' to '${nextStatus}'`
    );
  }
}
