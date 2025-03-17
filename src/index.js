import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js";
import Grass from './modified-grass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Create WebGL renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create perspective camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, -10);
camera.lookAt(0, 0, 0);

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Lighting
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

// === CONTROLLABLE COLLISION BOX ===
const collisionBoxGeometry = new THREE.BoxGeometry(1.5, 0.3, 2.2);
const collisionBoxMaterial = new THREE.MeshStandardMaterial({ color: 0x552299, visible: false });
const collisionBox = new THREE.Mesh(collisionBoxGeometry, collisionBoxMaterial);
collisionBox.castShadow = true;
collisionBox.position.set(0, 0.5, 0);
scene.add(collisionBox);

// === MOWER MODEL ===
let mowerModel = null;

const loader = new GLTFLoader();
loader.load('/grassCutter/src/models/mower.gltf', function (gltf) {
    mowerModel = gltf.scene;
    mowerModel.scale.set(2, 2, 2);
    mowerModel.position.copy(collisionBox.position);
    scene.add(mowerModel);
}, undefined, function (error) {
    console.error(error);
});

// === MOVEMENT SETTINGS ===
const moveSpeed = 0.1;
const rotationSpeed = 0.02;

// Movement controls
const keys = { 'w': false, 'a': false, 's': false, 'd': false, 'c': false };

document.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = true;
    }
});
document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = false;
    }
});

// === CAMERA CONTROLS ===
const cameraOffset = new THREE.Vector3(0, 5, -10);
const followSpeed = 0.1;

let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
let cameraRotationX = 0;
let cameraRotationY = 0;
let returnToFollow = false;

document.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
    returnToFollow = false;
});

document.addEventListener('mousemove', (event) => {
    if (isDragging) {
        let deltaX = (event.clientX - previousMouseX) * 0.005; // Sensitivity
        let deltaY = (event.clientY - previousMouseY) * 0.005;

        cameraRotationX += deltaX;
        cameraRotationY = Math.min(Math.max(cameraRotationY + deltaY, -1.2), 1.2); // Limit up/down rotation

        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
});

document.addEventListener('mouseup', () => {
    isDragging = false;
    returnToFollow = true;
});

// === GRASS CUTTING CONFIGURATION ===
const CUT_RADIUS = 1.2;
const CUT_INTERVAL = 100;
let lastCutTime = 0;

function cutGrassUnderObject() {
    const currentTime = Date.now();
    
    if (currentTime - lastCutTime > CUT_INTERVAL) {
        const objectPosition = new THREE.Vector3(
            collisionBox.position.x,
            0,
            collisionBox.position.z
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
        collisionBox.position.x += Math.sin(collisionBox.rotation.y) * moveSpeed;
        collisionBox.position.z += Math.cos(collisionBox.rotation.y) * moveSpeed;
    }
    if (keys['s']) {
        collisionBox.position.x -= Math.sin(collisionBox.rotation.y) * moveSpeed;
        collisionBox.position.z -= Math.cos(collisionBox.rotation.y) * moveSpeed;
    }
    if (keys['a']) {
        collisionBox.rotation.y += rotationSpeed;
    }
    if (keys['d']) {
        collisionBox.rotation.y -= rotationSpeed;
    }

    // Sync mower model with collision box
    if (mowerModel) {
        mowerModel.position.copy(collisionBox.position);
        mowerModel.rotation.y = collisionBox.rotation.y;
    }

    // Cut grass when moving or when 'C' key is pressed
    if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['c']) {
        cutGrassUnderObject();
    }

    // Move the directional light with the player
    directionalLight.position.x = collisionBox.position.x + 10;
    directionalLight.position.z = collisionBox.position.z + 5;

    // Camera logic
    if (returnToFollow) {
        cameraRotationX *= 0.9; // Smooth return to default
        cameraRotationY *= 0.9;
        if (Math.abs(cameraRotationX) < 0.01 && Math.abs(cameraRotationY) < 0.01) {
            returnToFollow = false;
            cameraRotationX = 0;
            cameraRotationY = 0;
        }
    }

    const targetPosition = collisionBox.position.clone().add(
        cameraOffset.clone()
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), collisionBox.rotation.y + cameraRotationX)
    );
    targetPosition.y += cameraRotationY * 5; // Vertical movement

    camera.position.lerp(targetPosition, followSpeed);
    camera.lookAt(collisionBox.position);

    // Update grass
    grass.update(time, collisionBox.position);

    renderer.render(scene, camera);
});

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
