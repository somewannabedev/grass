// Import Three.js library for 3D rendering
import * as THREE from 'three';

// Define a Player class to create and control a player object in the scene
class Player {
  constructor(scene) {
    // === PLAYER PROPERTIES ===
    this.speed = 0.1;         // Movement speed of the player
    this.rotationSpeed = 0.05; // Speed at which the player rotates
    this.position = new THREE.Vector3(0, 0.5, 0); // Initial position (center of the scene)
    this.radius = 0.5;        // Radius of the player (used for collision detection)
    this.velocity = new THREE.Vector3(); // Movement velocity (not used currently)

    // Track which movement keys are pressed
    this.keys = {
      forward: false,  // 'W' or Up Arrow
      backward: false, // 'S' or Down Arrow
      left: false,     // 'A' or Left Arrow
      right: false     // 'D' or Right Arrow
    };
    
    // === CREATE PLAYER MESH (3D Object) ===
    // Define player shape using a cone (like an arrow pointing forward)
    const geometry = new THREE.ConeGeometry(this.radius, 1, 8);
    geometry.rotateX(Math.PI / 2); // Rotate to face the correct direction
    
    // Define material (color and glow effect)
    const material = new THREE.MeshLambertMaterial({ 
      color: 0xffaa00,        // Orange base color
      emissive: 0x994400,     // Slight glowing effect
      emissiveIntensity: 0.3  // Glow strength
    });
    
    // Create a mesh (the actual 3D object)
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position); // Set initial position
    this.mesh.castShadow = true; // Enable shadow casting
    
    // Add the player to the scene
    scene.add(this.mesh);
    
    // === SET UP KEYBOARD CONTROLS ===
    this.setupControls();
  }
  
  setupControls() {
    // Listen for key press events
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event.key);
    });
    
    // Listen for key release events
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event.key);
    });
  }
  
  handleKeyDown(key) {
    // Update movement direction when a key is pressed
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.keys.forward = true;
        break;
      case 's':
      case 'arrowdown':
        this.keys.backward = true;
        break;
      case 'a':
      case 'arrowleft':
        this.keys.left = true;
        break;
      case 'd':
      case 'arrowright':
        this.keys.right = true;
        break;
    }
  }
  
  handleKeyUp(key) {
    // Stop movement when a key is released
    switch (key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        this.keys.forward = false;
        break;
      case 's':
      case 'arrowdown':
        this.keys.backward = false;
        break;
      case 'a':
      case 'arrowleft':
        this.keys.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.keys.right = false;
        break;
    }
  }
  
  update(deltaTime) {
    // === DETERMINE MOVEMENT DIRECTION ===
    let moveX = 0; // Left/Right movement
    let moveZ = 0; // Forward/Backward movement
    
    // Adjust movement values based on key presses
    if (this.keys.forward) moveZ -= this.speed;
    if (this.keys.backward) moveZ += this.speed;
    if (this.keys.left) moveX -= this.speed;
    if (this.keys.right) moveX += this.speed;
    
    // === NORMALIZE DIAGONAL MOVEMENT ===
    // If moving diagonally, adjust speed so total movement remains the same
    if (moveX !== 0 && moveZ !== 0) {
      moveX *= 0.7071; // 1/sqrt(2)
      moveZ *= 0.7071;
    }
    
    // === APPLY MOVEMENT ===
    this.position.x += moveX;
    this.position.z += moveZ;
    
    // Update the player's mesh position
    this.mesh.position.copy(this.position);
    
    // === ROTATE PLAYER TO FACE MOVEMENT DIRECTION ===
    if (moveX !== 0 || moveZ !== 0) {
      const angle = Math.atan2(moveX, moveZ);
      this.mesh.rotation.y = angle;
    }
    
    // === KEEP PLAYER WITHIN BOUNDS ===
    // Ensures the player doesn't leave a circular area (e.g., a grass field)
    const maxDistance = 14; // Maximum distance from the center
    const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    
    if (distanceFromCenter > maxDistance) {
      // Scale position back within the allowed boundary
      const scale = maxDistance / distanceFromCenter;
      this.position.x *= scale;
      this.position.z *= scale;
      this.mesh.position.copy(this.position);
    }
  }
  
  // === GETTER FUNCTIONS ===
  getPosition() {
    return this.position;
  }
  
  getRadius() {
    return this.radius;
  }
}

// Export the Player class so it can be used in other files
export default Player;
