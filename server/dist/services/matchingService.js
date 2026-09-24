"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRescueRisk = calculateRescueRisk;
exports.evaluateAndMatchDonation = evaluateAndMatchDonation;
exports.reassignDriver = reassignDriver;
exports.reassignNgo = reassignNgo;
const database_1 = __importStar(require("../db/database"));
const haversine_1 = require("../utils/haversine");
const DEFAULT_WEIGHTS = {
    urgencyWeight: 0.30,
    distanceWeight: 0.20,
    needWeight: 0.20,
    driverSuitabilityWeight: 0.15,
    capacityFitWeight: 0.10,
    foodCompatibilityWeight: 0.05,
};
function calculateRescueRisk(timeRemainingMinutes, hasDriverAssigned, distanceKm) {
    if (timeRemainingMinutes <= 0) {
        return { riskLevel: 'CRITICAL', riskReason: 'Food donation safe-window has expired.' };
    }
    if (timeRemainingMinutes < 30) {
        return {
            riskLevel: 'CRITICAL',
            riskReason: `Less than 30 minutes remaining (${timeRemainingMinutes}m) - high urgency rescue window!`,
        };
    }
    if (timeRemainingMinutes < 60 && !hasDriverAssigned) {
        return {
            riskLevel: 'HIGH',
            riskReason: `Only ${timeRemainingMinutes}m remaining and no driver has been confirmed yet.`,
        };
    }
    if (timeRemainingMinutes < 120) {
        return {
            riskLevel: 'MEDIUM',
            riskReason: `${timeRemainingMinutes}m safe time remaining. Active dispatch required.`,
        };
    }
    return {
        riskLevel: 'LOW',
        riskReason: `${timeRemainingMinutes}m safe window available. Optimal rescue feasibility.`,
    };
}
function evaluateAndMatchDonation(donationId, customWeights = {}) {
    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
    // Fetch donation details
    const donation = database_1.default
        .prepare(`SELECT d.*, p.organization_name as donor_name, p.user_id as donor_user_id, p.latitude as pickup_lat, p.longitude as pickup_lng 
       FROM donations d 
       JOIN donor_profiles p ON d.donor_id = p.id 
       WHERE d.id = ?`)
        .get(donationId);
    if (!donation) {
        throw new Error(`Donation with ID ${donationId} not found`);
    }
    const now = new Date();
    const safeUntil = new Date(donation.safe_until);
    // RULE 1: Check Expiry
    if (now >= safeUntil) {
        database_1.default.prepare(`UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        (0, database_1.addRescueLog)(donationId, 'System', 'ADMIN', 'EXPIRY_CHECK', 'EXPIRED', 'Donation expired before rescue could be completed.');
        (0, database_1.addNotification)(donation.donor_user_id, 'EXPIRED', 'Donation Expired', `Donation of ${donation.quantity_kg}kg ${donation.food_type} has expired.`, donationId);
        return {
            matched: false,
            donationId,
            riskLevel: 'CRITICAL',
            riskReason: 'Food safe donation window has expired.',
            reasons: ['Donation has passed safe-until timestamp'],
            evaluations: [],
            noMatchDiagnostics: ['Current time exceeds safe_until timestamp.'],
            message: 'Donation has expired and cannot be matched.',
        };
    }
    const timeRemainingMinutes = Math.max(0, Math.floor((safeUntil.getTime() - now.getTime()) / 60000));
    // Fetch active NGOs
    const ngos = database_1.default
        .prepare(`SELECT n.*, u.id as user_id, u.name as user_name FROM ngo_profiles n JOIN users u ON n.user_id = u.id WHERE n.is_active = 1`)
        .all();
    // Fetch available drivers
    const drivers = database_1.default
        .prepare(`SELECT d.*, u.id as user_id, u.name as driver_name FROM driver_profiles d JOIN users u ON d.user_id = u.id WHERE d.is_available = 1`)
        .all();
    const evaluations = [];
    const candidateMatches = [];
    const noMatchDiagnostics = [];
    if (ngos.length === 0) {
        noMatchDiagnostics.push('No active shelters/NGOs are currently registered in the area.');
    }
    if (drivers.length === 0) {
        noMatchDiagnostics.push('No volunteer drivers are currently marked available online.');
    }
    for (const ngo of ngos) {
        const availableCapacity = ngo.maximum_capacity_kg - ngo.current_load_kg;
        const distanceKm = (0, haversine_1.calculateDistanceKm)(donation.pickup_latitude, donation.pickup_longitude, ngo.latitude, ngo.longitude);
        const ngoReasons = [];
        // RULE 2: NGO Capacity
        if (availableCapacity < donation.quantity_kg) {
            const reason = `Insufficient capacity: shelter has ${availableCapacity} kg available vs ${donation.quantity_kg} kg required.`;
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: reason,
                distanceKm,
                availableCapacityKg: availableCapacity,
                reasons: [reason],
            });
            if (!noMatchDiagnostics.includes('Shelters found but have insufficient available capacity.')) {
                noMatchDiagnostics.push('Shelters found but have insufficient available capacity.');
            }
            continue;
        }
        // RULE 3: Food Compatibility
        let acceptedTypes = [];
        try {
            acceptedTypes = JSON.parse(ngo.accepted_food_types);
        }
        catch {
            acceptedTypes = [ngo.accepted_food_types];
        }
        const typeMatch = acceptedTypes.includes('All') ||
            acceptedTypes.includes('ALL') ||
            acceptedTypes.some((t) => t.toLowerCase() === donation.food_type.toLowerCase());
        if (!typeMatch) {
            const reason = `Food type incompatible: NGO accepts [${acceptedTypes.join(', ')}], donation is ${donation.food_type}.`;
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: reason,
                distanceKm,
                availableCapacityKg: availableCapacity,
                reasons: [reason],
            });
            if (!noMatchDiagnostics.includes('Food category is not accepted by nearby shelters.')) {
                noMatchDiagnostics.push('Food category is not accepted by nearby shelters.');
            }
            continue;
        }
        // Filter compatible & available drivers
        const feasibleDrivers = drivers.filter((driver) => driver.vehicle_capacity_kg >= donation.quantity_kg);
        if (feasibleDrivers.length === 0) {
            const reason = `No available driver with vehicle carrying capacity >= ${donation.quantity_kg} kg.`;
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: reason,
                distanceKm,
                availableCapacityKg: availableCapacity,
                reasons: [reason],
            });
            if (!noMatchDiagnostics.includes('No available driver has sufficient vehicle payload capacity.')) {
                noMatchDiagnostics.push('No available driver has sufficient vehicle payload capacity.');
            }
            continue;
        }
        // Pick best driver for this NGO (closest driver to donor pickup)
        let bestDriver = null;
        let minDriverDist = Infinity;
        for (const d of feasibleDrivers) {
            const distToPickup = (0, haversine_1.calculateDistanceKm)(d.latitude, d.longitude, donation.pickup_latitude, donation.pickup_longitude);
            if (distToPickup < minDriverDist) {
                minDriverDist = distToPickup;
                bestDriver = d;
            }
        }
        const travelMinutes = (0, haversine_1.estimateTravelTimeMinutes)(distanceKm) + (0, haversine_1.estimateTravelTimeMinutes)(minDriverDist);
        // RULE 7: Time Feasibility
        if (travelMinutes > timeRemainingMinutes) {
            const reason = `Transit time (${travelMinutes} mins) exceeds remaining safe donation time window (${timeRemainingMinutes} mins).`;
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: reason,
                distanceKm,
                availableCapacityKg: availableCapacity,
                reasons: [reason],
            });
            if (!noMatchDiagnostics.includes('Estimated travel route time exceeds remaining safe food expiry window.')) {
                noMatchDiagnostics.push('Estimated travel route time exceeds remaining safe food expiry window.');
            }
            continue;
        }
        // EXPLAINABLE WEIGHTED SCORING ALGORITHM
        // 1. Urgency score (30%): shorter window remaining gives higher urgency priority
        const urgencyScore = Math.max(0, Math.min(100, 100 - (timeRemainingMinutes / 180) * 100));
        // 2. Distance score (20%): proximity
        const distanceScore = Math.max(0, 100 - distanceKm * 5);
        // 3. Need score (20%): higher current load ratio = higher active demand
        const loadRatio = ngo.current_load_kg / (ngo.maximum_capacity_kg || 1);
        const needScore = Math.min(100, (1 - loadRatio) * 100);
        // 4. Driver suitability (15%): driver proximity to donor pickup
        const driverScore = Math.max(0, 100 - minDriverDist * 5);
        // 5. Capacity fit score (10%): ratio of donation size to available space
        const capacityScore = Math.min(100, (donation.quantity_kg / (availableCapacity || 1)) * 100);
        // 6. Food compatibility (5%): perfect match bonus
        const compatibilityScore = acceptedTypes.includes(donation.food_type) ? 100 : 80;
        const matchScore = Math.round(urgencyScore * weights.urgencyWeight +
            distanceScore * weights.distanceWeight +
            needScore * weights.needWeight +
            driverScore * weights.driverSuitabilityWeight +
            capacityScore * weights.capacityFitWeight +
            compatibilityScore * weights.foodCompatibilityWeight);
        ngoReasons.push(`✓ Recipient ${ngo.organization_name} has ${availableCapacity} kg storage capacity available`);
        ngoReasons.push(`✓ Food category '${donation.food_type}' matches shelter requirements`);
        ngoReasons.push(`✓ Driver ${bestDriver.driver_name} available (${bestDriver.vehicle_type}, ${bestDriver.vehicle_capacity_kg} kg payload)`);
        ngoReasons.push(`✓ Geographic distance is ${distanceKm} km from donor`);
        ngoReasons.push(`✓ Total estimated arrival: ${travelMinutes} mins (Food safe for next ${timeRemainingMinutes} mins)`);
        evaluations.push({
            ngoId: ngo.id,
            organizationName: ngo.organization_name,
            eligible: true,
            distanceKm,
            availableCapacityKg: availableCapacity,
            score: matchScore,
            reasons: ngoReasons,
        });
        candidateMatches.push({
            ngo,
            driver: bestDriver,
            distanceKm,
            estimatedMinutes: travelMinutes,
            matchScore,
            reasons: ngoReasons,
        });
    }
    // Sort candidates by matchScore descending
    candidateMatches.sort((a, b) => b.matchScore - a.matchScore);
    const initialRisk = calculateRescueRisk(timeRemainingMinutes, candidateMatches.length > 0);
    if (candidateMatches.length === 0) {
        database_1.default.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        (0, database_1.addRescueLog)(donationId, 'Matching Engine', 'SYSTEM', 'NO_MATCH_FOUND', 'POSTED', `No feasible match found. Risk: ${initialRisk.riskLevel}. Diagnostics: ${noMatchDiagnostics.join(' | ')}`);
        return {
            matched: false,
            donationId,
            riskLevel: initialRisk.riskLevel === 'LOW' ? 'HIGH' : initialRisk.riskLevel,
            riskReason: initialRisk.riskReason || 'No feasible rescue partner or driver available.',
            reasons: ['No recipient/driver pair satisfied all time, capacity, and route constraints.'],
            evaluations,
            noMatchDiagnostics,
            message: '⚠ RESCUE AT RISK: We could not find a feasible rescue partner matching all criteria.',
        };
    }
    // Top match selection
    const bestMatch = candidateMatches[0];
    const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    // De-activate existing pending matches for this donation if any
    database_1.default.prepare(`UPDATE matches SET status = 'CANCELLED' WHERE donation_id = ? AND status = 'PENDING'`).run(donationId);
    // Insert Match Record
    database_1.default.prepare(`
    INSERT INTO matches (id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, match_reasons, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(matchId, donationId, bestMatch.ngo.id, bestMatch.driver.id, bestMatch.matchScore, bestMatch.distanceKm, bestMatch.estimatedMinutes, JSON.stringify(bestMatch.reasons));
    // De-activate existing deliveries for this donation if any
    database_1.default.prepare(`DELETE FROM deliveries WHERE donation_id = ?`).run(donationId);
    // Create Delivery Record
    const deliveryId = 'del_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    database_1.default.prepare(`
    INSERT INTO deliveries (id, donation_id, driver_id, ngo_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'ASSIGNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(deliveryId, donationId, bestMatch.driver.id, bestMatch.ngo.id);
    // Update donation status
    database_1.default.prepare(`UPDATE donations SET status = 'DRIVER_ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
    // Add Rescue Audit Log
    (0, database_1.addRescueLog)(donationId, 'Matching Decision Engine', 'SYSTEM', 'MATCH_CREATED', 'DRIVER_ASSIGNED', `Matched with ${bestMatch.ngo.organization_name} & Driver ${bestMatch.driver.driver_name} (Score: ${bestMatch.matchScore}/100, Est: ${bestMatch.estimatedMinutes}m)`);
    // Notifications to Donor, NGO, and Driver
    (0, database_1.addNotification)(donation.donor_user_id, 'MATCH_FOUND', 'Rescue Partner & Driver Assigned!', `Matched with ${bestMatch.ngo.organization_name}. Driver ${bestMatch.driver.driver_name} dispatched. ETA: ${bestMatch.estimatedMinutes} mins.`, donationId);
    (0, database_1.addNotification)(bestMatch.ngo.user_id, 'INCOMING_RESCUE', 'Incoming Rescue Matched', `${donation.quantity_kg} kg ${donation.food_type} matched from ${donation.donor_name}.`, donationId);
    (0, database_1.addNotification)(bestMatch.driver.user_id, 'JOB_ASSIGNED', 'New Food Rescue Dispatch', `Assigned to pickup ${donation.quantity_kg} kg ${donation.food_type} at ${donation.pickup_address}.`, donationId);
    const finalRisk = calculateRescueRisk(timeRemainingMinutes, true, bestMatch.distanceKm);
    return {
        matched: true,
        donationId,
        matchId,
        ngoId: bestMatch.ngo.id,
        ngoName: bestMatch.ngo.organization_name,
        driverId: bestMatch.driver.id,
        driverName: bestMatch.driver.driver_name,
        distanceKm: bestMatch.distanceKm,
        estimatedMinutes: bestMatch.estimatedMinutes,
        matchScore: bestMatch.matchScore,
        riskLevel: finalRisk.riskLevel,
        riskReason: finalRisk.riskReason,
        reasons: bestMatch.reasons,
        evaluations,
        message: `Matched successfully with ${bestMatch.ngo.organization_name} and dispatched driver ${bestMatch.driver.driver_name}`,
    };
}
/**
 * AUTOMATIC DRIVER REASSIGNMENT FLOW (Requirement 12)
 */
function reassignDriver(donationId, cancellationReason) {
    const donation = database_1.default.prepare(`SELECT * FROM donations WHERE id = ?`).get(donationId);
    if (!donation)
        throw new Error('Donation not found');
    (0, database_1.addRescueLog)(donationId, 'Dispatch Service', 'SYSTEM', 'DRIVER_CANCELLED', 'REASSIGNING', `Assigned driver cancelled/reported issue: "${cancellationReason}". Executing automatic driver reassignment...`);
    // Clear current active delivery
    database_1.default.prepare(`UPDATE deliveries SET status = 'CANCELLED', cancellation_reason = ? WHERE donation_id = ?`).run(cancellationReason, donationId);
    // Trigger matching engine to find alternative replacement driver
    const result = evaluateAndMatchDonation(donationId);
    if (!result.matched) {
        (0, database_1.addNotification)('ALL', 'RESCUE_ALERT', '⚠ RESCUE AT RISK - Driver Cancelled', `Driver cancelled job for ${donation.quantity_kg} kg donation. System searching for urgent replacement!`, donationId);
    }
    else {
        (0, database_1.addRescueLog)(donationId, 'Dispatch Service', 'SYSTEM', 'DRIVER_REASSIGNED', 'DRIVER_ASSIGNED', `Successfully reassigned replacement driver ${result.driverName}!`);
    }
    return result;
}
/**
 * AUTOMATIC NGO REMATCHING FLOW (Requirement 13)
 */
function reassignNgo(donationId, rejectionReason) {
    (0, database_1.addRescueLog)(donationId, 'NGO Service', 'NGO', 'NGO_REJECTED', 'REMATCHING', `Matched NGO rejected donation: "${rejectionReason}". Executing automatic re-matching to find alternative shelter...`);
    database_1.default.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
    return evaluateAndMatchDonation(donationId);
}
