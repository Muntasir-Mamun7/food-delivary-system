/**
 * Location data for the food delivery system
 * Contains predefined locations and travel time matrix
 */

// Predefined locations (coordinates based on grid positions)
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

// Helper function to calculate Euclidean distance between two points
function calculateDistance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Pre-calculated travel distances between locations (in arbitrary units)
// This will be used as the base for calculating travel time
const travelDistanceMatrix = {};

// Generate travel distances between all locations
function generateTravelDistances() {
  locationsList.forEach(locA => {
    travelDistanceMatrix[locA.id] = {};
    
    locationsList.forEach(locB => {
      // Calculate Euclidean distance
      const distance = calculateDistance(locA.x, locA.y, locB.x, locB.y);
      
      // Store distance
      travelDistanceMatrix[locA.id][locB.id] = distance;
    });
  });
}

// Generate travel time based on distance (in minutes)
// Assuming average speed allows 100 distance units to be covered in 10 minutes
function getTravelTime(fromId, toId) {
  if (!travelDistanceMatrix[fromId] || !travelDistanceMatrix[fromId][toId]) {
    return 15; // Default 15 minutes if not found
  }
  
  const distance = travelDistanceMatrix[fromId][toId];
  const travelTime = Math.ceil(distance / 10); // 10 distance units per minute
  
  return Math.max(5, travelTime); // Minimum 5 minutes travel time
}

// Initialize the travel distance matrix
generateTravelDistances();

// Get address string for a location
function getAddressForLocation(locationId) {
  const location = locations[locationId];
  if (!location) return "Unknown location";
  
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
  travelDistanceMatrix,
  getTravelTime,
  getAddressForLocation
};