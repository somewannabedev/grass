import * as THREE from 'three';

class Player {
  constructor(scene) {
    // Player properties
    this.speed = 0.1;
    this.rotationSpeed = 0.05;
    this.position = new THREE.Vector3(0, 0.5, 0);
    this.radius = 0.5;
    this.velocity = new THREE.Vector3();
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };
    
    // Create player mesh
    const geometry = new THREE.ConeGeometry(this.radius, 1, 8);
    geometry.rotateX(Math.PI / 2);
    
    const material = new THREE.MeshLambertMaterial({ 
      color: 0xffaa00,
      emissive: 0x994400,
      emissiveIntensity: 0.3
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = true;
    
    scene.add(this.mesh);
    
    // Set up keyboard controls
    this.setupControls();
  }
  
  setupControls() {
    // Add keyboard event listeners
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event.key);
    });
    
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event.key);
    });
  }
  
  handleKeyDown(key) {
    switch(key.toLowerCase()) {
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
    switch(key.toLowerCase()) {
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
    // Calculate movement direction
    let moveX = 0;
    let moveZ = 0;
    
    if (this.keys.forward) moveZ -= this.speed;
    if (this.keys.backward) moveZ += this.speed;
    if (this.keys.left) moveX -= this.speed;
    if (this.keys.right) moveX += this.speed;
    
    // Normalize diagonal movement
    if (moveX !== 0 && moveZ !== 0) {
      moveX *= 0.7071; // 1/sqrt(2)
      moveZ *= 0.7071;
    }
    
    // Update position
    this.position.x += moveX;
    this.position.z += moveZ;
    
    // Update mesh position
    this.mesh.position.copy(this.position);
    
    // Update rotation to face movement direction
    if (moveX !== 0 || moveZ !== 0) {
      const angle = Math.atan2(moveX, moveZ);
      this.mesh.rotation.y = angle;
    }
    
    // Keep player within bounds (adjust to match your grass field size)
    const maxDistance = 14;
    const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    
    if (distanceFromCenter > maxDistance) {
      const scale = maxDistance / distanceFromCenter;
      this.position.x *= scale;
      this.position.z *= scale;
      this.mesh.position.copy(this.position);
    }
  }
  
  getPosition() {
    return this.position;
  }
  
  getRadius() {
    return this.radius;
  }
}

export default Player;