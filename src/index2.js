// Modified index.js with infinite rectangular grass tiles extending in Z direction

// Import the necessary Three.js components
import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js"

// Import OrbitControls to allow camera movement with mouse
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import the custom Grass class
import Grass from './modified-grass.js' // Using modified grass class that handles rectangular tiles

// Create a WebGL renderer to display the 3D scene
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

// Enable shadows for a more realistic scene
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Soft shadows for better visuals

// Set the renderer size to match the browser window
renderer.setSize(window.innerWidth, window.innerHeight);

// Attach the rendering output (canvas) to the webpage
document.body.appendChild(renderer.domElement);

// Create a perspective camera (simulates a real-world camera)
const camera = new THREE.PerspectiveCamera(
  75,  // Field of view (in degrees)
  window.innerWidth / window.innerHeight,  // Aspect ratio (width/height)
  0.1,  // Near clipping plane (closest visible distance)
  100   // Far clipping plane (farthest visible distance)
);

// Position the camera so it looks at the center of the scene
camera.position.set(15, 9, 15);
camera.lookAt(0, 0, 0);

// Create orbit controls to allow camera movement with the mouse
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth camera movement
controls.enablePan = false;  // Disable side-to-side movement
controls.maxPolarAngle = Math.PI / 2.2;  // Limit vertical movement to prevent going upside-down
controls.maxDistance = 15;  // Max zoom-out distance

// Create the main scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0); // Light gray background

// Add a directional light (simulating sunlight)
const directionalLight = new THREE.DirectionalLight(0xffccaa, 1.5);
directionalLight.position.set(10, 10, 5);  // Set light position
directionalLight.castShadow = true;  // Enable shadow casting

// Configure shadow settings for the directional light
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.left = 20;
directionalLight.shadow.camera.right = -20;

// Add the light to the scene
scene.add(directionalLight);

// Add ambient light for softer, indirect lighting
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// === TILE SYSTEM CONFIGURATION ===
const TILE_WIDTH = 10;       // Width of the corridor (X axis)
const TILE_LENGTH = 78;      // Length of each tile segment (Z axis)
const BLADE_COUNT = 20000;   // Number of grass blades per tile
const ACTIVE_TILES_AHEAD = 3;    // How many tiles to keep ahead of player
const ACTIVE_TILES_BEHIND = 1;   // How many tiles to keep behind player

// Store active grass tiles
const grassTiles = new Map(); // Map with "z" keys storing grass instances

// Player's current tile coordinate (only tracking Z since we're making a corridor)
let currentTileZ = 0;

// Create a sphere-shaped object that the user can move
const objectGeometry = new THREE.SphereGeometry(0.5, 32, 32);  // Sphere radius 0.5, 32 segments
const objectMaterial = new THREE.MeshStandardMaterial({ color: 0x552299 });  // Set colour of sphere
const controllableObject = new THREE.Mesh(objectGeometry, objectMaterial);
controllableObject.castShadow = true;  // Enable shadows for the object
controllableObject.position.set(0, 0.5, -50);  // Place object slightly above the ground
scene.add(controllableObject);

// Function to create a grass tile at the specified Z position
function createGrassTile(tileZ) {
    // Check if tile already exists
    if (grassTiles.has(tileZ)) return;
    
    // Calculate world position for this tile
    const worldZ = tileZ * TILE_LENGTH;
    
    // Create a new grass instance (we'll pass width and length separately)
    const grass = new Grass(TILE_WIDTH, TILE_LENGTH, BLADE_COUNT);
    grass.position.set(0, 0, worldZ);
    grass.castShadow = true;
    grass.receiveShadow = true;
    scene.add(grass);
    
    // Store the grass tile
    grassTiles.set(tileZ, grass);
}

// Function to remove a grass tile
function removeGrassTile(tileZ) {
    // Check if tile exists
    if (!grassTiles.has(tileZ)) return;
    
    // Get the grass object
    const grass = grassTiles.get(tileZ);
    
    // Remove from scene and dispose of resources
    scene.remove(grass);
    
    // If grass has a geometry that needs to be disposed
    if (grass.geometry) {
        grass.geometry.dispose();
    }
    
    // If grass has children with geometries
    grass.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
    
    // Remove from our tracking Map
    grassTiles.delete(tileZ);
}

// Function to update active tiles based on player position
function updateActiveTiles() {
    // Calculate current tile Z coordinate based on player position
    const newTileZ = Math.floor(controllableObject.position.z / TILE_LENGTH);
    
    // If player has moved to a new tile
    if (newTileZ !== currentTileZ) {
        currentTileZ = newTileZ;
        
        // Calculate tile range to keep active
        const minZ = currentTileZ - ACTIVE_TILES_BEHIND;
        const maxZ = currentTileZ + ACTIVE_TILES_AHEAD;
        
        // Create a set of tile Z coords that should be active
        const activeKeys = new Set();
        
        // Create new tiles as needed
        for (let z = minZ; z <= maxZ; z++) {
            activeKeys.add(z);
            createGrassTile(z);
        }
        
        // Remove tiles that are no longer needed
        for (const z of grassTiles.keys()) {
            if (!activeKeys.has(z)) {
                removeGrassTile(z);
            }
        }
    }
}

// Keep player centered in X axis (corridor mode)
function keepPlayerCentered() {
    // Calculate how far player is from center X (0)
    const distanceFromCenter = Math.abs(controllableObject.position.x);
    const halfWidth = TILE_WIDTH / 2;
    
    // If player is getting close to edge, nudge them back to center
    if (distanceFromCenter > halfWidth - 1) {
        // Move player toward center
        const direction = controllableObject.position.x > 0 ? -1 : 1;
        controllableObject.position.x += direction * 0.05;
    }
}

// Initialize first grass tile at origin
createGrassTile(0);

// Set movement speed for the controllable object
const moveSpeed = 0.1;
const jumpStrength = 0.4;  // Jump velocity strength
const gravity = 0.2;      // Gravity force pulling the player down

let isJumping = false;     // Flag to check if the player is in the air
let velocityY = 0;         // Vertical velocity (for jumping and falling)

// Track which movement keys are being pressed
const keys = {
    'w': false, // Move forward
    'a': false, // Move left
    's': false, // Move backward
    'd': false,  // Move right
    'space': false // Jump
};

// Listen for key press events (when a key is pressed down)
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = true; break;  // Pressing 'W' moves forward
        case 'a': keys['a'] = true; break;  // Pressing 'A' moves left
        case 's': keys['s'] = true; break;  // Pressing 'S' moves backward
        case 'd': keys['d'] = true; break;  // Pressing 'D' moves right
        case ' ': // Spacebar for jumping
            if (!isJumping) { // Only jump if the player is on the ground
                velocityY = jumpStrength;  
                isJumping = true;  
            }
            break;
    }
});

// Listen for key release events (when a key is released)
document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = false; break;  // Releasing 'W' stops forward movement
        case 'a': keys['a'] = false; break;  // Releasing 'A' stops left movement
        case 's': keys['s'] = false; break;  // Releasing 'S' stops backward movement
        case 'd': keys['d'] = false; break;  // Releasing 'D' stops right movement
    }
});

// Camera follow offset (adjust as needed)
const cameraOffset = new THREE.Vector3(12, 7, 12); // Positioned behind and slightly above the sphere
//const followSpeed = 0.1; // Adjusts how smoothly the camera follows the sphere

// The main animation loop (runs continuously)
renderer.setAnimationLoop((time) => {
    // Move the object based on pressed keys
    if (keys['w']) controllableObject.position.z -= moveSpeed;  // Move forward
    if (keys['s']) controllableObject.position.z += moveSpeed;  // Move backward
    if (keys['a']) controllableObject.position.x -= moveSpeed;  // Move left
    if (keys['d']) controllableObject.position.x += moveSpeed;  // Move right

    // Apply gravity and jump mechanics
    if (isJumping) {
        velocityY -= gravity;  // Apply gravity
        controllableObject.position.y += velocityY;  // Update vertical position

        // Check if the player has landed
        if (controllableObject.position.y <= 0.5) {  
            controllableObject.position.y = 0.5;  // Reset to ground level
            velocityY = 0;  // Stop vertical movement
            isJumping = false;  // Player can jump again
        }
    }

    // Keep player within corridor boundaries
    keepPlayerCentered();
    
    // Check if we need to update tiles
    updateActiveTiles();

    // Update all active grass tiles
    for (const [tileZ, grass] of grassTiles.entries()) {
        // Calculate object position relative to this grass tile's origin
        const relativePosX = controllableObject.position.x - grass.position.x;
        const relativePosY = controllableObject.position.y;
        const relativePosZ = controllableObject.position.z - grass.position.z;
        
        // Create a temporary vector for the relative position
        const relativePos = new THREE.Vector3(relativePosX, relativePosY, relativePosZ);
        
        // Update the grass with the relative position
        grass.update(time, relativePos);
    }

    // Move the directional light with the player
    directionalLight.position.x = controllableObject.position.x + 10;
    directionalLight.position.z = controllableObject.position.z + 5;

    // // Smooth camera following
    // const desiredPosition = controllableObject.position.clone().add(cameraOffset);
    // camera.position.lerp(desiredPosition, followSpeed); // Smoothly transition the camera to the new position
    // // Keep the camera looking at the sphere
    // controls.target.copy(controllableObject.position);
    // // Update camera controls (smooth movement effect)
    // controls.update();

    // **Instant Camera Follow (No Smoothness)**
    camera.position.copy(controllableObject.position).add(cameraOffset);
    camera.lookAt(controllableObject.position); // Keep camera locked on the sphere

    // Render the updated scene
    renderer.render(scene, camera);
});