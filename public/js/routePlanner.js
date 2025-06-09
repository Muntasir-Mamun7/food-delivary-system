/**
 * Route Planner using Greedy Algorithm
 * For the food delivery system
 */

class RoutePlanner {
  constructor(locationData) {
    this.locationData = locationData;
  }
  
  /**
   * Plan the optimal route for a set of orders
   * @param {Array} orders - Array of orders to deliver
   * @param {String} startLocationId - Starting point location ID
   * @returns {Object} - Route information with ordered locations and stats
   */
  planRoute(orders, startLocationId = 'restaurant') {
    if (!orders || orders.length === 0) {
      return {
        route: [],
        totalTime: 0,
        totalDistance: 0
      };
    }
    
    const { locations, getTravelTime } = this.locationData;
    
    // Create pickup-delivery pairs for each order
    const orderPairs = orders.map(order => {
      return {
        orderId: order.id,
        pickupId: 'restaurant', // All pickups are from the restaurant
        deliveryId: order.customerId || order.customer_id,
        dueTime: new Date(order.required_due_time).getTime()
      };
    });
    
    // Initialize route with the starting location (typically restaurant)
    const route = [{ 
      locationId: startLocationId, 
      type: 'start',
      name: locations[startLocationId].name
    }];
    
    // Track which orders have been picked up but not delivered
    const pickedUpOrders = [];
    
    // Track all locations that need to be visited
    const locationsToVisit = new Set();
    
    // First add all pickups to locations to visit
    orderPairs.forEach(pair => {
      locationsToVisit.add(pair.pickupId);
    });
    
    // Start with current location as the start location
    let currentLocationId = startLocationId;
    let currentTime = Date.now(); // Start with current time
    let totalDistance = 0;
    
    // Continue until all orders are delivered
    while (locationsToVisit.size > 0 || pickedUpOrders.length > 0) {
      let nextLocationId = null;
      let minTime = Infinity;
      let nextAction = null;
      let nextOrderId = null;
      
      // First priority: Check if any order has been picked up and needs delivery
      if (pickedUpOrders.length > 0) {
        // Find the closest delivery location or the one with earliest due time
        for (const orderPair of pickedUpOrders) {
          const travelTime = getTravelTime(currentLocationId, orderPair.deliveryId);
          const estimatedTime = currentTime + (travelTime * 60 * 1000); // Convert minutes to milliseconds
          const timeUntilDue = orderPair.dueTime - estimatedTime;
          
          // Prioritize orders that need to be delivered soon
          const priority = (timeUntilDue < 0) ? -99999999 : -travelTime; // Negative time means late
          
          if (priority > minTime) {
            nextLocationId = orderPair.deliveryId;
            minTime = priority;
            nextAction = 'deliver';
            nextOrderId = orderPair.orderId;
          }
        }
      }
      
      // Second priority: If no deliveries are urgent, check for pickups
      if (nextLocationId === null && locationsToVisit.size > 0) {
        for (const locationId of locationsToVisit) {
          const travelTime = getTravelTime(currentLocationId, locationId);
          
          // Simple greedy approach: choose the closest pickup
          if (-travelTime > minTime) {
            nextLocationId = locationId;
            minTime = -travelTime;
            nextAction = 'pickup';
          }
        }
      }
      
      // If we found a next location, update route
      if (nextLocationId) {
        // Calculate travel time and distance
        const travelTime = getTravelTime(currentLocationId, nextLocationId);
        const distance = this.locationData.travelDistanceMatrix[currentLocationId][nextLocationId];
        
        currentTime += travelTime * 60 * 1000; // Add travel time (convert minutes to ms)
        totalDistance += distance;
        
        // Add to route
        route.push({
          locationId: nextLocationId,
          type: nextAction,
          time: travelTime,
          distance: distance,
          estimatedArrival: new Date(currentTime).toISOString(),
          orderId: nextOrderId
        });
        
        // Update tracking based on action type
        if (nextAction === 'pickup') {
          // Remove from locations to visit
          locationsToVisit.delete(nextLocationId);
          
          // Add pickup orders to pickedUpOrders
          const newPickups = orderPairs.filter(pair => pair.pickupId === nextLocationId);
          pickedUpOrders.push(...newPickups);
          
          // Add their delivery locations to locations to visit
          newPickups.forEach(pair => {
            locationsToVisit.add(pair.deliveryId);
          });
        } 
        else if (nextAction === 'deliver') {
          // Remove from locations to visit
          locationsToVisit.delete(nextLocationId);
          
          // Remove from pickedUpOrders
          const index = pickedUpOrders.findIndex(pair => pair.orderId === nextOrderId);
          if (index !== -1) {
            pickedUpOrders.splice(index, 1);
          }
        }
        
        // Update current location
        currentLocationId = nextLocationId;
      } else {
        // Should never happen, but break the loop if it does
        console.error('Error in route planning: no next location found');
        break;
      }
    }
    
    // Calculate total time in minutes
    const totalTime = route.reduce((sum, stop) => sum + (stop.time || 0), 0);
    
    return {
      route,
      totalTime,
      totalDistance
    };
  }
  
  /**
   * Estimate delivery time for a specific order
   * @param {Object} order - Order to estimate
   * @param {String} currentLocationId - Current courier location
   * @returns {Object} - Estimated delivery information
   */
  estimateDeliveryTime(order, currentLocationId = 'restaurant') {
    const { getTravelTime } = this.locationData;
    
    // Get customer ID from order
    const customerId = order.customerId || order.customer_id || `customer${order.id % 8 + 1}`;
    
    // Calculate travel time from current location to restaurant (if not already there)
    let totalTime = currentLocationId === 'restaurant' ? 0 : getTravelTime(currentLocationId, 'restaurant');
    
    // Add time from restaurant to customer
    totalTime += getTravelTime('restaurant', customerId);
    
    // Add 5 minutes for pickup and handling
    totalTime += 5;
    
    return {
      estimatedMinutes: totalTime,
      estimatedDeliveryTime: new Date(Date.now() + (totalTime * 60 * 1000)).toISOString()
    };
  }
}