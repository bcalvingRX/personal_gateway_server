db.createCollection('Systems', { capped: false });
// Get all fleets from the database
const fleets = db.SystemFleets.find({}).sort({fleet_name: 1});
const fleetArray = fleets.toArray();

// Fleet assignment distribution for comprehensive edge case testing:
// Distribute systems across fleets to create various scenarios:
// - Large fleets (production-like scenarios)
// - Medium fleets (development/staging scenarios) 
// - Small fleets (specialized scenarios)
// - Minimal fleets (support/emergency scenarios)
// - Empty fleets (ready for deployment scenarios)

const fleetAssignments = [];
const totalFleets = fleetArray.length;

if (totalFleets >= 20) {
    // If we have 20+ fleets, use our optimal distribution
    fleetAssignments.push(85, 65, 35, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3, 2, 2, 2, 1, 1, 0, 0);
    // For any additional fleets beyond 20, assign 0 systems
    for (let i = 20; i < totalFleets; i++) {
        fleetAssignments.push(0);
    }
} else {
    // If we have fewer fleets, distribute proportionally
    const baseCounts = [85, 65, 35, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0];
    for (let i = 0; i < totalFleets; i++) {
        fleetAssignments.push(baseCounts[i] || 0);
    }
}

const systems = [];
let systemIndex = 1;

for (let fleetIndex = 0; fleetIndex < fleetArray.length; fleetIndex++) {
    const systemCount = fleetAssignments[fleetIndex];
    const fleet = fleetArray[fleetIndex];
    
    for (let i = 0; i < systemCount; i++) {
        systems.push({
            system_name: `W2-${systemIndex.toString().padStart(9, '0')}`,
            fleet: fleet._id,
            dirty_flag: Math.random() > 0.8, // 20% chance of being dirty
            active: true
        });
        systemIndex++;
    }
}

db.Systems.insertMany(systems);