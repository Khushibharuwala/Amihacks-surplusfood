# Surplus-to-Shelter — Real-Time Food Rescue Routing

> **24-Hour Hackathon MVP**  
> Connecting surplus edible food from restaurants, grocery stores, caterers, and cafeterias with suitable NGOs/shelters and available drivers before the food's safe donation window expires.

---

## 🌟 Overview & System Architecture

Surplus-to-Shelter treats food rescue as a **time-constrained, multi-variable logistics problem**. Rather than a static listing board, the system executes real-time deterministic matching based on:

1. **Food Expiry Window** (Rule 1: Never match expired food)
2. **NGO Capacity** (Rule 2: Fit full quantity vs available shelter load)
3. **Food Compatibility** (Rule 3: Match dietary preferences e.g. Cooked vs Raw)
4. **Driver Vehicle Capacity** (Rule 4: Fit vehicle payload limits)
5. **Driver Availability** (Rule 5: Active online volunteers)
6. **Geographic Proximity** (Rule 6: Haversine distance formula)
7. **Time Feasibility** (Rule 7: Transit time + loading buffer strictly < time until safe expiry)

---

## 🚀 Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, REST API
- **Database**: SQLite (via `better-sqlite3`), Relational schema with foreign keys and strict constraints
- **Auth**: JWT Authentication with role-based access control + 1-Click Quick Demo User Switcher

---

## 👥 User Roles & Features

### 1. 🍽️ DONOR (Restaurants, Caterers, Grocery Stores)
- **Post Surplus Food**: Quick submission form taking food type, quantity in kg, description, pickup address, and safe donation window.
- **Real-Time Matching Feedback**: Immediate display of matched shelter, assigned driver, distance in km, and pickup ETA.

### 2. 🏠 NGO / SHELTER
- **Capacity Management**: Live visual load ratio gauge (`current_load_kg` / `maximum_capacity_kg`).
- **Match Response**: Accept or Reject incoming matches (rejection automatically triggers system re-matching!).
- **Delivery Monitor**: Track active in-transit deliveries and past rescue history.

### 3. 🚚 DRIVER / VOLUNTEER
- **Availability Toggle**: Go Online/Offline.
- **Route Logistics**: View pickup address, destination shelter, distance, and estimated travel time.
- **Operational Workflow**: Sequential state updates: `Accept Job` → `Start Pickup` → `Mark Picked Up` → `Mark Delivered`.

### 4. 🛡️ ADMIN COMMAND CENTER
- **Operational Metrics**: Active Donations, Food Rescued (kg), Active NGOs, Available Drivers, Deliveries Completed, Expired Count, and **Estimated Meals Supported** (`quantity_kg * 2.5`).
- **Live Monitor Table**: Real-time table with match scores, urgency indicators, and state badges.

---

## 🔄 Status State Machine Flow

```text
POSTED → MATCHING → MATCHED → DRIVER_ASSIGNED → PICKUP_STARTED → PICKED_UP → DELIVERED
                                                      ↓
                                              EXPIRED / CANCELLED
```

Invalid state transitions (e.g. `POSTED` → `DELIVERED`) are strictly rejected by backend state machine validation.

---

## 🛠️ Local Setup & Quickstart

### Prerequisites
- Node.js (v18+)
- NPM

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
cd surplus-to-shelter
npm install --prefix server
npm install --prefix client
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Application
To run the Express backend (port 5000) and Vite frontend (port 5173):

```bash
# Terminal 1: Backend Server
npm run server

# Terminal 2: Frontend App
npm run client
```

Open browser at `http://localhost:5173`

---

## 🎬 Section 17 Demo Scenario Walkthrough

The application includes an **Interactive Demo Simulator Modal** accessible directly from the top navigation bar.

### Walkthrough Sequence:
1. **Donor (Tasty Bites)** posts **25 kg Cooked Rice** safe until 8:30 PM.
2. **Matching Engine evaluates candidates**:
   - `St. Mary's Shelter` ❌ REJECTED (Insufficient capacity: 5 kg available)
   - `Vegan Safe Pantry` ❌ REJECTED (Incompatible food type)
   - `Hope Community Kitchen` ✅ SELECTED (80 kg capacity available, compatible food, best score)
   - `Rahul Express` ✅ ASSIGNED (Van capacity 80 kg, online)
3. **Driver Accepts Job**.
4. **Driver Starts Pickup** (`PICKUP_STARTED`).
5. **Food Picked Up** (`PICKED_UP`).
6. **Food Delivered** (`DELIVERED`).
7. **Impact Metrics Update** (Rescued food & meals supported increase).

---

## 📊 Database Schema Overview

- `users`: User authentication, email, password hash, role (`DONOR`, `NGO`, `DRIVER`, `ADMIN`)
- `donor_profiles`: Organization name, address, latitude, longitude, phone
- `ngo_profiles`: Capacity kg, current load kg, accepted food types JSON, requirements, location
- `driver_profiles`: Vehicle type, vehicle capacity kg, availability, location
- `donations`: Quantity kg, safe until timestamp, status, pickup coordinates
- `matches`: Match score, distance km, estimated minutes, NGO ID, Driver ID, status
- `deliveries`: Operational pickup time, delivery time, driver assignment
# Amihacks-surplusfood
