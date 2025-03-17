// Import Three.js
import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import custom Grass class
import Grass from './modified-grass.js';

// Create WebGL renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create perspective camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(15, 9, 15);
camera.lookAt(0, 0, 0);

// Enable camera controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.maxPolarAngle = Math.PI / 2.2;
controls.maxDistance = 15;

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Add lighting
const directionalLight = new THREE.DirectionalLight(0xffccaa, 1.5);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// === TILE CONFIGURATION ===
const TILE_WIDTH = 40;       // <-- Set tile width here
const TILE_LENGTH = 40;      // <-- Set tile length here
const BLADE_COUNT = 40000;   // Number of grass blades

// Create a single grass tile
const grass = new Grass(TILE_WIDTH, TILE_LENGTH, BLADE_COUNT);
grass.position.set(0, 0, 0);
grass.castShadow = true;
grass.receiveShadow = true;
scene.add(grass);

// === CONTROLLABLE SPHERE ===
const objectGeometry = new THREE.BoxGeometry(1.5, 0.3, 2.2);
const objectMaterial = new THREE.MeshStandardMaterial({ color: 0x552299 });
const controllableObject = new THREE.Mesh(objectGeometry, objectMaterial);
controllableObject.castShadow = true;
controllableObject.position.set(0, 0.5, 0);
scene.add(controllableObject);

// Movement settings
const moveSpeed = 0.1;
const jumpStrength = 0.8;


// Movement controls
const keys = { 'w': false, 'a': false, 's': false, 'd': false, 'space': false };
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = true; break;
        case 'a': keys['a'] = true; break;
        case 's': keys['s'] = true; break;
        case 'd': keys['d'] = true; break;

    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = false; break;
        case 'a': keys['a'] = false; break;
        case 's': keys['s'] = false; break;
        case 'd': keys['d'] = false; break;
    }
});

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

// Camera follow settings
const cameraOffset = new THREE.Vector3(12, 7, 12);
const followSpeed = 0.1; // Adjusts how smoothly the camera follows the sphere

// Animation loop
renderer.setAnimationLoop(() => {
    // Movement
    if (keys['w']) controllableObject.position.z -= moveSpeed;
    if (keys['s']) controllableObject.position.z += moveSpeed;
    if (keys['a']) controllableObject.position.x -= moveSpeed;
    if (keys['d']) controllableObject.position.x += moveSpeed;

    // Keep player within corridor boundaries
    keepPlayerCentered();    

    // Move the directional light with the player
    directionalLight.position.x = controllableObject.position.x + 10;
    directionalLight.position.z = controllableObject.position.z + 5;

    // Smooth camera following
    const desiredPosition = controllableObject.position.clone().add(cameraOffset);
    camera.position.lerp(desiredPosition, followSpeed); // Smoothly transition the camera to the new position
    // Keep the camera looking at the sphere
    controls.target.copy(controllableObject.position);
    // Update camera controls (smooth movement effect)
    controls.update();
    renderer.render(scene, camera);
});
