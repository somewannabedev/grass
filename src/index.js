// Import the necessary Three.js components
import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js"

// Import OrbitControls to allow camera movement with mouse
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import the custom Grass class
import Grass from './grass.js'

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
camera.position.set(0, 7, 12);
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

// Create and add a grass field using the imported Grass class
const grass = new Grass(30, 60000);  // 30x30 area with 60,000 blades of grass
grass.castShadow = true;  // Allow grass to cast shadows
grass.receiveShadow = true;  // Allow grass to receive shadows
scene.add(grass);


// Create a sphere-shaped object that the user can move
const objectGeometry = new THREE.SphereGeometry(0.5, 32, 32);  // Sphere radius 0.5, 32 segments
const objectMaterial = new THREE.MeshStandardMaterial({ color: 0x552299 });  // Set colour of sphere
const controllableObject = new THREE.Mesh(objectGeometry, objectMaterial);
controllableObject.castShadow = true;  // Enable shadows for the object
controllableObject.position.set(0, 0.5, 0);  // Place object slightly above the ground
scene.add(controllableObject);

// Attempt to find an existing floor object in the scene
const floor = scene.getObjectByName('floorMesh');

if (floor) {
    // If the floor already exists, enable shadow receiving
    floor.receiveShadow = true;
} else {
    // Otherwise, create a new floor
    const floorGeometry = new THREE.CircleGeometry(15, 8).rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });  // Transparent material for shadows
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.receiveShadow = true;  // Allow floor to receive shadows
    floorMesh.position.y = -Number.EPSILON;  // Slightly lower the floor to prevent clipping issues
    floorMesh.name = 'floorMesh';  // Assign a name to the floor
    scene.add(floorMesh);
}

// Set movement speed for the controllable object
const moveSpeed = 0.2;
const jumpStrength = 0.4;  // Jump velocity strength
const gravity = 0.02;      // Gravity force pulling the player down

let isJumping = false;     // Flag to check if the player is in the air
let velocityY = 0;         // Vertical velocity (for jumping and falling)
let positionY = 0;         // Player's current vertical position

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
const cameraOffset = new THREE.Vector3(0, 7, 12); // Positioned behind and slightly above the sphere
const followSpeed = 0.1; // Adjusts how smoothly the camera follows the sphere

// The main animation loop (runs continuously)
renderer.setAnimationLoop((time) => {
    // Update the grass movement based on time and the object's position
    grass.update(time, controllableObject.position);

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

    // Smooth camera following
    const desiredPosition = controllableObject.position.clone().add(cameraOffset);
    camera.position.lerp(desiredPosition, followSpeed); // Smoothly transition the camera to the new position

    // Keep the camera looking at the sphere
    controls.target.copy(controllableObject.position);

    // Update camera controls (smooth movement effect)
    controls.update();

    // Render the updated scene
    renderer.render(scene, camera);
});
