"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAndMatchDonation = evaluateAndMatchDonation;
const database_1 = __importDefault(require("../db/database"));
const haversine_1 = require("../utils/haversine");
const DEFAULT_WEIGHTS = {
    needWeight: 0.25,
    urgencyWeight: 0.30,
    distanceWeight: 0.20,
    capacityWeight: 0.10,
    driverWeight: 0.15,
};
function evaluateAndMatchDonation(donationId, customWeights = {}) {
    const weights = { ...DEFAULT_WEIGHTS, ...customWeights };
    // Fetch donation
    const donation = database_1.default
        .prepare(`SELECT d.*, p.latitude as pickup_lat, p.longitude as pickup_lng FROM donations d JOIN donor_profiles p ON d.donor_id = p.id WHERE d.id = ?`)
        .get(donationId);
    if (!donation) {
        throw new Error(`Donation with ID ${donationId} not found`);
    }
    const now = new Date();
    const safeUntil = new Date(donation.safe_until);
    // RULE 1: Check Expiry
    if (now >= safeUntil) {
        database_1.default.prepare(`UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        return {
            matched: false,
            donationId,
            evaluations: [],
            message: 'Donation has expired and cannot be matched.',
        };
    }
    const timeRemainingMinutes = Math.max(0, Math.floor((safeUntil.getTime() - now.getTime()) / 60000));
    // Fetch active NGOs
    const ngos = database_1.default
        .prepare(`SELECT n.*, u.name as user_name FROM ngo_profiles n JOIN users u ON n.user_id = u.id WHERE n.is_active = 1`)
        .all();
    // Fetch available drivers
    const drivers = database_1.default
        .prepare(`SELECT d.*, u.name as driver_name FROM driver_profiles d JOIN users u ON d.user_id = u.id WHERE d.is_available = 1`)
        .all();
    const evaluations = [];
    const candidateMatches = [];
    for (const ngo of ngos) {
        const availableCapacity = ngo.maximum_capacity_kg - ngo.current_load_kg;
        const distanceKm = (0, haversine_1.calculateDistanceKm)(donation.pickup_latitude, donation.pickup_longitude, ngo.latitude, ngo.longitude);
        // RULE 2: NGO Capacity
        if (availableCapacity < donation.quantity_kg) {
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: `Insufficient capacity: available ${availableCapacity} kg, donation is ${donation.quantity_kg} kg`,
                distanceKm,
                availableCapacityKg: availableCapacity,
            });
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
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: `Food type incompatible: NGO accepts [${acceptedTypes.join(', ')}], donation is ${donation.food_type}`,
                distanceKm,
                availableCapacityKg: availableCapacity,
            });
            continue;
        }
        // Filter compatible & available drivers
        const feasibleDrivers = drivers.filter((driver) => {
            // RULE 4 & 5: Driver Capacity & Availability
            if (driver.vehicle_capacity_kg < donation.quantity_kg)
                return false;
            return true;
        });
        if (feasibleDrivers.length === 0) {
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: `No available driver with vehicle capacity >= ${donation.quantity_kg} kg`,
                distanceKm,
                availableCapacityKg: availableCapacity,
            });
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
            evaluations.push({
                ngoId: ngo.id,
                organizationName: ngo.organization_name,
                eligible: false,
                rejectionReason: `Time infeasible: total travel ${travelMinutes} mins exceeds remaining safe time ${timeRemainingMinutes} mins`,
                distanceKm,
                availableCapacityKg: availableCapacity,
            });
            continue;
        }
        // SCORING ALGORITHM
        // 1. Need score (0-100): NGOs with higher load ratio or higher urgent demand
        const loadRatio = ngo.current_load_kg / (ngo.maximum_capacity_kg || 1);
        const needScore = Math.min(100, (1 - loadRatio) * 100);
        // 2. Urgency score (0-100): shorter window remaining gives higher urgency
        const urgencyScore = Math.max(0, Math.min(100, 100 - (timeRemainingMinutes / 180) * 100));
        // 3. Distance score (0-100): closer is better
        const distanceScore = Math.max(0, 100 - distanceKm * 4);
        // 4. Capacity score (0-100): better fit relative to total capacity
        const capacityScore = Math.min(100, (donation.quantity_kg / (availableCapacity || 1)) * 100);
        // 5. Driver score (0-100): driver proximity
        const driverScore = Math.max(0, 100 - minDriverDist * 5);
        const matchScore = Math.round(needScore * weights.needWeight +
            urgencyScore * weights.urgencyWeight +
            distanceScore * weights.distanceWeight +
            capacityScore * weights.capacityWeight +
            driverScore * weights.driverWeight);
        evaluations.push({
            ngoId: ngo.id,
            organizationName: ngo.organization_name,
            eligible: true,
            distanceKm,
            availableCapacityKg: availableCapacity,
            score: matchScore,
        });
        candidateMatches.push({
            ngo,
            driver: bestDriver,
            distanceKm,
            estimatedMinutes: travelMinutes,
            matchScore,
        });
    }
    // Sort candidate matches by matchScore descending
    candidateMatches.sort((a, b) => b.matchScore - a.matchScore);
    if (candidateMatches.length === 0) {
        database_1.default.prepare(`UPDATE donations SET status = 'POSTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
        return {
            matched: false,
            donationId,
            evaluations,
            message: 'No eligible recipient/driver found matching criteria.',
        };
    }
    // Select top match candidate
    const bestMatch = candidateMatches[0];
    const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    // Insert match record
    database_1.default.prepare(`
    INSERT INTO matches (id, donation_id, ngo_id, driver_id, match_score, distance_km, estimated_minutes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(matchId, donationId, bestMatch.ngo.id, bestMatch.driver.id, bestMatch.matchScore, bestMatch.distanceKm, bestMatch.estimatedMinutes);
    // Create Delivery record
    const deliveryId = 'del_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    database_1.default.prepare(`
    INSERT INTO deliveries (id, donation_id, driver_id, ngo_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'ASSIGNED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(deliveryId, donationId, bestMatch.driver.id, bestMatch.ngo.id);
    // Update donation status to DRIVER_ASSIGNED
    database_1.default.prepare(`UPDATE donations SET status = 'DRIVER_ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(donationId);
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
        evaluations,
        message: `Matched successfully with ${bestMatch.ngo.organization_name} and assigned driver ${bestMatch.driver.driver_name}`,
    };
}
