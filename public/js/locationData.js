/**
 * Location data for the food delivery system
 * Contains predefined locations and travel time matrix
 */

// Predefined locations
const locations = {
  restaurant: { id: 'restaurant', name: 'Restaurant HQ', x: 480, y: 420, type: 'restaurant' },
  
  // Customer locations
  customer1: { id: 'customer1', name: 'Customer 1', x: 56, y: 285, type: 'customer' },
  customer2: { id: 'customer2', name: 'Customer 2', x: 258, y: 203, type: 'customer' },
  customer3: { id: 'customer3', name: 'Customer 3', x: 480, y: 211, type: 'customer' },
  customer4: { id: 'customer4', name: 'Customer 4', x: 566, y: 77, type: 'customer' },
  customer5: { id: 'customer5', name: 'Customer 5', x: 814, y: 203, type: 'customer' },
  customer6: { id: 'customer6', name: 'Customer 6', x: 708, y: 433, type: 'customer' },
  customer7: { id: 'customer7', name: 'Customer 7', x: 268, y: 423, type: 'customer' },
  customer8: { id: 'customer8', name: 'Customer 8', x: 87, y: 519, type: 'customer' },
};

// Get all locations as array
const locationsList = Object.values(locations);

// Pre-calculated travel times in minutes between all locations
const travelTimeMatrix = {
  restaurant: {
    restaurant: 0,
    customer1: 20,  // Time from restaurant to customer1
    customer2: 15,  // Time from restaurant to customer2
    customer3: 12,  // Time from restaurant to customer3
    customer4: 18,  // Time from restaurant to customer4
    customer5: 25,  // Time from restaurant to customer5
    customer6: 14,  // Time from restaurant to customer6
    customer7: 10,  // Time from restaurant to customer7
    customer8: 22   // Time from restaurant to customer8
  },
  customer1: {
    restaurant: 20,
    customer1: 0,
    customer2: 16,
    customer3: 25,
    customer4: 30,
    customer5: 38,
    customer6: 32,
    customer7: 15,
    customer8: 12
  },
  customer2: {
    restaurant: 15,
    customer1: 16,
    customer2: 0,
    customer3: 14,
    customer4: 19,
    customer5: 27,
    customer6: 21,
    customer7: 11,
    customer8: 20
  },
  customer3: {
    restaurant: 12,
    customer1: 25,
    customer2: 14,
    customer3: 0,
    customer4: 10,
    customer5: 18,
    customer6: 15,
    customer7: 15,
    customer8: 28
  },
  customer4: {
    restaurant: 18,
    customer1: 30,
    customer2: 19,
    customer3: 10,
    customer4: 0,
    customer5: 15,
    customer6: 22,
    customer7: 24,
    customer8: 35
  },
  customer5: {
    restaurant: 25,
    customer1: 38,
    customer2: 27,
    customer3: 18,
    customer4: 15,
    customer5: 0,
    customer6: 13,
    customer7: 30,
    customer8: 40
  },
  customer6: {
    restaurant: 14,
    customer1: 32,
    customer2: 21,
    customer3: 15,
    customer4: 22,
    customer5: 13,
    customer6: 0,
    customer7: 18,
    customer8: 28
  },
  customer7: {
    restaurant: 10,
    customer1: 15,
    customer2: 11,
    customer3: 15,
    customer4: 24,
    customer5: 30,
    customer6: 18,
    customer7: 0,
    customer8: 14
  },
  customer8: {
    restaurant: 22,
    customer1: 12,
    customer2: 20,
    customer3: 28,
    customer4: 35,
    customer5: 40,
    customer6: 28,
    customer7: 14,
    customer8: 0
  }
};

// Get travel time between two locations
function getTravelTime(fromId, toId) {
  if (travelTimeMatrix[fromId] && travelTimeMatrix[fromId][toId] !== undefined) {
    return travelTimeMatrix[fromId][toId];
  }
  return 15; // Default 15 minutes if not found
}

// Get address string for a location
function getAddressForLocation(locationId) {
  const streets = ["Main St", "Oak Ave", "Maple Dr", "Pine Rd", "Cedar Ln", "Elm Blvd", "Birch Way", "Walnut Ct"];
  const numbers = ["123", "456", "789", "321", "654", "987", "135", "246"];
  
  // Generate a deterministic address based on the location ID
  const index = locationId.charCodeAt(locationId.length - 1) % streets.length;
  return `${numbers[index]} ${streets[index]}, Xianlin District`;
}

// Export the location data and functions
const LocationData = {
  locations,
  locationsList,
  getTravelTime,
  getAddressForLocation
};
