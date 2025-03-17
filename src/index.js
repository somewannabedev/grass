// Remove OrbitControls (we don't need them anymore)
import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js";

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
camera.position.set(0, 5, -10); // Position camera behind the object
camera.lookAt(0, 0, 0);

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
const TILE_WIDTH = 40;
const TILE_LENGTH = 40;
const BLADE_COUNT = 40000;

// Create a single grass tile
const grass = new Grass(TILE_WIDTH, TILE_LENGTH, BLADE_COUNT);
grass.position.set(0, 0, 0);
grass.castShadow = true;
grass.receiveShadow = true;
scene.add(grass);

// === CONTROLLABLE OBJECT ===
const objectGeometry = new THREE.BoxGeometry(1.5, 0.3, 2.2);
const objectMaterial = new THREE.MeshStandardMaterial({ color: 0x552299 });
const controllableObject = new THREE.Mesh(objectGeometry, objectMaterial);
controllableObject.castShadow = true;
controllableObject.position.set(0, 0.5, 0);
scene.add(controllableObject);

// === MOVEMENT SETTINGS ===
const moveSpeed = 0.1;
const rotationSpeed = 0.02;

// Movement controls
const keys = { 'w': false, 'a': false, 's': false, 'd': false, 'c': false };
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = true; break;
        case 'a': keys['a'] = true; break;
        case 's': keys['s'] = true; break;
        case 'd': keys['d'] = true; break;
        case 'c': keys['c'] = true; break;
    }
});
document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keys['w'] = false; break;
        case 'a': keys['a'] = false; break;
        case 's': keys['s'] = false; break;
        case 'd': keys['d'] = false; break;
        case 'c': keys['c'] = false; break;
    }
});

// Camera follow settings
const cameraOffset = new THREE.Vector3(0, 5, -10); // Offset behind the controllable object
const followSpeed = 0.1; 

// === GRASS CUTTING CONFIGURATION ===
const CUT_RADIUS = 1.2;
const CUT_INTERVAL = 100;
let lastCutTime = 0;

// Function to handle grass cutting
function cutGrassUnderObject() {
    const currentTime = Date.now();
    
    if (currentTime - lastCutTime > CUT_INTERVAL) {
        const objectPosition = new THREE.Vector3(
            controllableObject.position.x,
            0,
            controllableObject.position.z
        );
        
        grass.checkAndCutGrass(objectPosition, CUT_RADIUS);
        
        lastCutTime = currentTime;
    }
}

// Animation loop
let lastTime = 0;
renderer.setAnimationLoop((time) => {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    // Handle movement
    if (keys['w']) {
        controllableObject.position.x += Math.sin(controllableObject.rotation.y) * moveSpeed;
        controllableObject.position.z += Math.cos(controllableObject.rotation.y) * moveSpeed;
    }
    if (keys['s']) {
        controllableObject.position.x -= Math.sin(controllableObject.rotation.y) * moveSpeed;
        controllableObject.position.z -= Math.cos(controllableObject.rotation.y) * moveSpeed;
    }
    if (keys['a']) {
        controllableObject.rotation.y += rotationSpeed;
    }
    if (keys['d']) {
        controllableObject.rotation.y -= rotationSpeed;
    }

    // Cut grass when moving or when 'C' key is pressed
    if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['c']) {
        cutGrassUnderObject();
    }

    // Move the directional light with the player
    directionalLight.position.x = controllableObject.position.x + 10;
    directionalLight.position.z = controllableObject.position.z + 5;

    // Update grass
    grass.update(time, controllableObject.position);

    // Smooth camera follow
    const targetPosition = controllableObject.position.clone().add(
        cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), controllableObject.rotation.y)
    );
    camera.position.lerp(targetPosition, followSpeed);
    camera.lookAt(controllableObject.position);

    renderer.render(scene, camera);
});

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
