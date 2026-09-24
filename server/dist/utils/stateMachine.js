"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTransition = isValidTransition;
exports.validateStateTransition = validateStateTransition;
const ALLOWED_TRANSITIONS = {
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
function isValidTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus)
        return true;
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(nextStatus);
}
function validateStateTransition(currentStatus, nextStatus) {
    if (!isValidTransition(currentStatus, nextStatus)) {
        throw new Error(`Invalid donation state transition from '${currentStatus}' to '${nextStatus}'`);
    }
}
