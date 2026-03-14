db.createCollection('Devices', { capped: false });

// Get all device groups from the database and map them to device types
const deviceGroups = db.Groups.find({});
const deviceGroupArray = deviceGroups.toArray();

// Create device group lookup map and categorize by device type based on description
const deviceGroupMap = {};
const deviceTypeGroups = {
    'Gateway': [],
    'Haptic Module': [],
    'Communication Module': [],
    'Receptor Sole': []
};

deviceGroupArray.forEach(group => {
    const desc = group.group_desc.toLowerCase();
    let deviceType;
    
    if (desc.includes('gateway')) {
        deviceType = 'Gateway';
    } else if (desc.includes('haptic')) {
        deviceType = 'Haptic Module';
    } else if (desc.includes('comm')) {
        deviceType = 'Communication Module';
    } else if (desc.includes('receptor')) {
        deviceType = 'Receptor Sole';
    } else {
        // Fallback - assign based on group_id pattern or default
        deviceType = 'Haptic Module'; // Default fallback
    }
    
    deviceGroupMap[group._id.toString()] = deviceType;
    deviceTypeGroups[deviceType].push(group._id.toString());
});

const groupIds = Object.keys(deviceGroupMap);
const deviceTypes = ["Gateway", "Receptor Sole", "Haptic Module", "Communication Module"];
const baseTimestamp = 1747143119280; // Base UTC timestamp
const oneWeekMs = 7 * 24 * 60 * 60 * 1000; // One week in milliseconds

// Device distribution per system for comprehensive edge case testing:
const systemDeviceCounts = [];
// 0 devices: systems 1-5
for (let i = 1; i <= 5; i++) systemDeviceCounts.push(0);
// 1 device: systems 6-10
for (let i = 6; i <= 10; i++) systemDeviceCounts.push(1);
// 2 devices: systems 11-15
for (let i = 11; i <= 15; i++) systemDeviceCounts.push(2);
// 3 devices: systems 16-25
for (let i = 16; i <= 25; i++) systemDeviceCounts.push(3);
// 4 devices: systems 26-45
for (let i = 26; i <= 45; i++) systemDeviceCounts.push(4);
// 5 devices: systems 46-75
for (let i = 46; i <= 75; i++) systemDeviceCounts.push(5);
// 6 devices: systems 76-120
for (let i = 76; i <= 120; i++) systemDeviceCounts.push(6);
// 7 devices: systems 121-180
for (let i = 121; i <= 180; i++) systemDeviceCounts.push(7);
// 8 devices: systems 181-240
for (let i = 181; i <= 240; i++) systemDeviceCounts.push(8);
// 9 devices: systems 241-280
for (let i = 241; i <= 280; i++) systemDeviceCounts.push(9);
// 10 devices: systems 281-301
for (let i = 281; i <= 301; i++) systemDeviceCounts.push(10);

// Get all systems and fleets to determine firmware assignments
const systems = db.Systems.find({}).sort({system_name: 1});
const systemArray = systems.toArray();
const fleets = db.SystemFleets.find({});
const fleetArray = fleets.toArray();

// Create fleet lookup map
const fleetMap = {};
fleetArray.forEach(fleet => {
    fleetMap[fleet._id.toString()] = fleet;
});

let deviceIdCounter = 1;
let thingCounter = 1;

systemArray.forEach((system, systemIndex) => {
    const deviceCount = systemDeviceCounts[systemIndex] || 0;
    
    if (deviceCount === 0) return; // Skip systems with no devices
    
    // Get the fleet for this system
    const fleet = fleetMap[system.fleet.toString()];
    
    // Track if we need an inactive receptor sole for this system
    let hasInactiveReceptorSole = false;
    
    const devices = [];
    
    for (let deviceIndex = 0; deviceIndex < deviceCount; deviceIndex++) {
        // Generate unique device ID
        const deviceId = `202220000${deviceIdCounter.toString().padStart(8, '0')}`;
        deviceIdCounter++;
        
        // Randomly select a device type
        let deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        if(deviceIndex == 0) {
            deviceType = "Gateway"
        }
        
        // Find appropriate group for the device type
        const availableGroups = deviceTypeGroups[deviceType];
        const selectedGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
        
        // Find the firmware for this group from the fleet configuration
        let currentFirmware = "Unknown_Firmware";
        if (fleet && fleet.device_groups) {
            const deviceGroupEntry = fleet.device_groups.find(dg => dg.group.toString() === selectedGroup);
            if (deviceGroupEntry) {
                // Look up the firmware from the firmware collection
                const firmware = db.DeviceFirmware.findOne({_id: deviceGroupEntry.firmware});
                if (firmware) {
                    currentFirmware = firmware.firmware_id;
                }
            }
        }
        
        // Generate last_reported_online timestamp with variation
        let lastReported;
        if (Math.random() < 0.02) { // 2% chance of never reported (0)
            lastReported = 0;
        } else if (Math.random() < 0.05) { // 3% chance of outlier (very old)
            lastReported = baseTimestamp - (Math.random() * 30 * 24 * 60 * 60 * 1000); // Up to 30 days old
        } else {
            // Normal variation: +/- 1 week
            const variation = (Math.random() - 0.5) * 2 * oneWeekMs;
            lastReported = Math.floor(baseTimestamp + variation);
        }
        
        // Determine if device should be active
        let isActive = true;
        
        // Most systems with 3+ devices should have at least one inactive receptor sole
        if (deviceType === "Receptor Sole" && deviceCount >= 3 && !hasInactiveReceptorSole && Math.random() < 0.7) {
            isActive = false;
            hasInactiveReceptorSole = true;
        } else if (Math.random() < 0.05) { // 5% chance of any device being inactive
            isActive = false;
        }
        
        // Create device object
        const device = {
            device_id: deviceId,
            system: system._id,
            update_group: ObjectId(selectedGroup),
            type: deviceType,
            last_reported_online: lastReported,
            current_firmware: currentFirmware,
            active: isActive
        };
        
        // Add thing_id for Gateways (only first Gateway gets test_tls12, others get unique names)
        if (deviceType === "Gateway") {
            if (thingCounter === 1) {
                device.thing_id = "test_tls12";
            } else {
                device.thing_id = `unknown${thingCounter}`;
            }
            thingCounter++;
        }
        
        devices.push(device);
    }
    
    // Insert devices for this system
    if (devices.length > 0) {
        db.Devices.insertMany(devices);
    }
});