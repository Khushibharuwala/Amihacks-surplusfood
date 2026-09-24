export type UserRole = 'DONOR' | 'NGO' | 'DRIVER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  donor_org?: string;
  ngo_org?: string;
  vehicle_type?: string;
}

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

export interface Donation {
  id: string;
  donor_id: string;
  food_type: string;
  description: string;
  quantity_kg: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  available_from: string;
  safe_until: string;
  status: DonationStatus;
  created_at: string;
  updated_at: string;
  // Extra joined fields
  donor_name?: string;
  donor_phone?: string;
  match_id?: string;
  match_score?: number;
  distance_km?: number;
  estimated_minutes?: number;
  ngo_name?: string;
  ngo_phone?: string;
  ngo_address?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_type?: string;
  delivery_status?: string;
}

export interface NgoEvaluation {
  ngoId: string;
  organizationName: string;
  eligible: boolean;
  rejectionReason?: string;
  distanceKm: number;
  availableCapacityKg: number;
  score?: number;
}

export interface MatchResult {
  matched: boolean;
  donationId: string;
  matchId?: string;
  ngoId?: string;
  ngoName?: string;
  driverId?: string;
  driverName?: string;
  distanceKm?: number;
  estimatedMinutes?: number;
  matchScore?: number;
  evaluations: NgoEvaluation[];
  message: string;
}

export interface NgoProfile {
  id: string;
  user_id: string;
  organization_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  maximum_capacity_kg: number;
  current_load_kg: number;
  available_capacity_kg: number;
  accepted_food_types: string[];
  requirements: string;
  is_active: number;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  phone: string;
  latitude: number;
  longitude: number;
  vehicle_type: string;
  vehicle_capacity_kg: number;
  is_available: number;
}

export interface AdminMetrics {
  activeDonations: number;
  foodRescuedKg: number;
  activeNgos: number;
  availableDrivers: number;
  successfulDeliveries: number;
  expiredDonations: number;
  activeDonors: number;
  estimatedMeals: number;
  mealsPerKgFactor: number;
}
