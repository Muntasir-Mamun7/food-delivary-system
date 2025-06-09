/**
 * Simple Map implementation for food delivery system
 * Replaces the Leaflet map with a custom implementation using a static image
 */

class SimpleMap {
  constructor(elementId, options = {}) {
    this.elementId = elementId;
    this.container = document.getElementById(elementId);
    this.markers = [];
    this.lines = [];
    this.clickCallback = null;
    
    if (!this.container) {
      console.error(`Element with ID ${elementId} not found`);
      return;
    }
    
    this.createMapElements();
    this.attachEventListeners();
  }
  
  createMapElements() {
    // Create map container with relative positioning
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    
    // Create the map image element
    this.mapImage = document.createElement('img');
    this.mapImage.src = 'images/citymap.jpg'; // Placeholder - you'll replace with your own image
    this.mapImage.style.width = '100%';
    this.mapImage.style.display = 'block';
    
    // Create the overlay for markers and routes
    this.overlay = document.createElement('div');
    this.overlay.style.position = 'absolute';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.pointerEvents = 'none'; // Allow clicks to pass through to map
    
    // Add elements to container
    this.container.appendChild(this.mapImage);
    this.container.appendChild(this.overlay);
  }
  
  attachEventListeners() {
    this.container.addEventListener('click', (e) => {
      if (this.clickCallback) {
        // Calculate click position relative to the map
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert to percentage of map size for responsiveness
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        
        this.clickCallback({ x: xPercent, y: yPercent });
      }
    });
  }
  
  // Register click callback
  onClick(callback) {
    this.clickCallback = callback;
  }
  
  // Add a marker to the map
  addMarker(options) {
    const marker = document.createElement('div');
    
    // Set marker style
    marker.style.position = 'absolute';
    marker.style.width = '20px';
    marker.style.height = '20px';
    marker.style.borderRadius = '50%';
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.backgroundColor = options.color || '#FF5722';
    marker.style.border = '2px solid white';
    marker.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';
    marker.style.cursor = 'pointer';
    marker.style.zIndex = '100';
    marker.style.display = 'flex';
    marker.style.justifyContent = 'center';
    marker.style.alignItems = 'center';
    marker.style.pointerEvents = 'auto'; // Make marker clickable
    
    // Position the marker
    marker.style.left = `${options.x}%`;
    marker.style.top = `${options.y}%`;
    
    // Add marker title/label if provided
    if (options.title) {
      marker.title = options.title;
      
      // Add label element
      const label = document.createElement('div');
      label.textContent = options.title;
      label.style.position = 'absolute';
      label.style.bottom = '-20px';
      label.style.left = '50%';
      label.style.transform = 'translateX(-50%)';
      label.style.whiteSpace = 'nowrap';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'bold';
      label.style.textShadow = '0 0 2px white';
      marker.appendChild(label);
    }
    
    // Add custom content if provided
    if (options.content) {
      marker.innerHTML = options.content;
    }
    
    // Add popup if provided
    if (options.popup) {
      marker.addEventListener('click', () => {
        this.showPopup(marker, options.popup);
      });
    }
    
    // Add data attribute for id if provided
    if (options.id) {
      marker.dataset.id = options.id;
    }
    
    // Add the marker to the overlay
    this.overlay.appendChild(marker);
    
    // Store marker reference
    this.markers.push({
      element: marker,
      options: options
    });
    
    return marker;
  }
  
  // Draw a line between two points
  addLine(fromX, fromY, toX, toY, options = {}) {
    const line = document.createElement('div');
    
    // Calculate length and angle
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Set line style
    line.style.position = 'absolute';
    line.style.height = `${options.weight || 3}px`;
    line.style.width = `${length}%`;
    line.style.backgroundColor = options.color || '#FF5722';
    line.style.opacity = options.opacity || '0.7';
    line.style.transformOrigin = '0 0';
    line.style.transform = `translate(${fromX}%, ${fromY}%) rotate(${angle}deg)`;
    line.style.zIndex = '90';
    
    // Add the line to the overlay
    this.overlay.appendChild(line);
    
    // Store line reference
    this.lines.push({
      element: line,
      options: options
    });
    
    return line;
  }
  
  // Clear all markers
  clearMarkers() {
    this.markers.forEach(marker => {
      if (marker.element && marker.element.parentNode) {
        marker.element.parentNode.removeChild(marker.element);
      }
    });
    this.markers = [];
  }
  
  // Clear all lines
  clearLines() {
    this.lines.forEach(line => {
      if (line.element && line.element.parentNode) {
        line.element.parentNode.removeChild(line.element);
      }
    });
    this.lines = [];
  }
  
  // Show popup on marker click
  showPopup(marker, content) {
    // Remove any existing popup
    this.hidePopup();
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'map-popup';
    popup.innerHTML = content;
    
    // Style the popup
    popup.style.position = 'absolute';
    popup.style.backgroundColor = 'white';
    popup.style.padding = '10px';
    popup.style.borderRadius = '4px';
    popup.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    popup.style.zIndex = '200';
    popup.style.minWidth = '150px';
    popup.style.maxWidth = '250px';
    popup.style.pointerEvents = 'auto';
    
    // Get marker position
    const markerPos = marker.getBoundingClientRect();
    const containerPos = this.container.getBoundingClientRect();
    
    // Position the popup above the marker
    const top = (markerPos.top - containerPos.top) - popup.offsetHeight - 10;
    const left = (markerPos.left - containerPos.left) - (popup.offsetWidth / 2) + (marker.offsetWidth / 2);
    
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = 'X';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.right = '5px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', () => this.hidePopup());
    
    popup.appendChild(closeButton);
    
    // Add to overlay
    this.overlay.appendChild(popup);
    this.currentPopup = popup;
  }
  
  // Hide popup
  hidePopup() {
    if (this.currentPopup && this.currentPopup.parentNode) {
      this.currentPopup.parentNode.removeChild(this.currentPopup);
      this.currentPopup = null;
    }
  }
  
  // Get position from location object
  getPositionFromLocation(location) {
    // Convert actual coordinates to percentage of map width/height
    // Assuming the map image represents a 1000x600 coordinate system
    const mapWidth = 1000;
    const mapHeight = 600;
    
    const x = (location.x / mapWidth) * 100;
    const y = (location.y / mapHeight) * 100;
    
    return { x, y };
  }
  
  // Add location marker
  addLocationMarker(location, options = {}) {
    const pos = this.getPositionFromLocation(location);
    
    // Determine marker color based on location type
    let color = '#FF5722'; // Default orange
    
    if (location.type === 'restaurant') {
      color = '#4CAF50'; // Green for restaurant
    } else if (location.type === 'customer') {
      color = '#2196F3'; // Blue for customers
    }
    
    return this.addMarker({
      x: pos.x,
      y: pos.y,
      title: location.name,
      color: options.color || color,
      id: location.id,
      popup: options.popup
    });
  }
  
  // Draw route between locations
  drawRoute(locations) {
    if (!locations || locations.length < 2) return;
    
    for (let i = 0; i < locations.length - 1; i++) {
      const from = this.getPositionFromLocation(locations[i]);
      const to = this.getPositionFromLocation(locations[i + 1]);
      
      this.addLine(from.x, from.y, to.x, to.y, {
        color: '#FF5722',
        opacity: 0.8,
        weight: 3
      });
    }
  }
}