import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js";
import Grass from './modified-grass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GrassGeometry } from './modified-grass.js';


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
scene.background = new THREE.Color(0x87CEEB);


// Add ground beyond the garden
const groundGeometry = new THREE.PlaneGeometry(200, 200);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.position.y = -0.1;
ground.receiveShadow = true;
scene.add(ground);

// Lighting
const directionalLight = new THREE.DirectionalLight(0xffccaa, 1.5);
directionalLight.position.set(0, 8, -15);
directionalLight.castShadow = true;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

// === GARDEN CONFIGURATION ===
const GARDEN_WIDTH = 100;
const GARDEN_LENGTH = 120;
const BLADE_COUNT = 480000;

// Load fence and tree models
const modelLoader = new GLTFLoader();
let fenceSegments = [];
let trees = [];

// Create irregular garden boundary with fences
function createIrregularGarden() {
    // Define irregular garden boundary points
    const boundaryPoints = [
      {x: -30, z: -40},
      {x: 10, z: -50},
      {x: 40, z: -30},
      {x: 50, z: 5},
      {x: 40, z: 35},
      {x: 5, z: 40},
      {x: -20, z: 45},
      {x: -45, z: 25},
      {x: -50, z: -5},
      {x: -40, z: -25}
    ];
    
    // Create custom-shaped grass using a polygonal area
    const grassGeometry = createPolygonalGrassGeometry(boundaryPoints, BLADE_COUNT);
    const grass = new Grass(GARDEN_WIDTH, GARDEN_LENGTH, BLADE_COUNT, grassGeometry);
    grass.position.set(0, 0, 0);
    grass.castShadow = true;
    grass.receiveShadow = true;
    scene.add(grass);
    
    // Create fence segments along boundary
    for (let i = 0; i < boundaryPoints.length; i++) {
        const p1 = boundaryPoints[i];
        const p2 = boundaryPoints[(i + 1) % boundaryPoints.length];
    
        // Calculate length and correct angle
        const length = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
        const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z);
    
        // Create fence collision box
        const fenceBox = new THREE.Box3(
        new THREE.Vector3(Math.min(p1.x, p2.x) - 1, 0, Math.min(p1.z, p2.z) - 1),
        new THREE.Vector3(Math.max(p1.x, p2.x) + 1, 3, Math.max(p1.z, p2.z) + 1)
        );
    
        fenceSegments.push({
        start: p1, 
        end: p2, 
        box: fenceBox,
        length: length,
        angle: angle
        });
    
        // Create visual fence
        const fenceGeometry = new THREE.BoxGeometry(0.5, 2, length); // ✅ Corrected orientation
        const fenceMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const fence = new THREE.Mesh(fenceGeometry, fenceMaterial);
        fence.position.set((p1.x + p2.x) / 2, 1, (p1.z + p2.z) / 2);
        fence.rotation.y = angle;// + Math.PI / 2;
        fence.castShadow = true;
        scene.add(fence);
    }
    
    return grass;
}

// Create a polygonal grass geometry that fits the irregular shape
function createPolygonalGrassGeometry(boundaryPoints, bladeCount) {
    // Calculate bounding box of the polygon
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const point of boundaryPoints) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
    
    // Function to check if a point is inside the polygon
    function isPointInPolygon(x, z, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, zi = polygon[i].z;
        const xj = polygon[j].x, zj = polygon[j].z;
        
        const intersect = ((zi > z) !== (zj > z)) &&
            (x < (xj - xi) * (z - zi) / (zj - zi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
    
    // Modify the GrassGeometry to ensure grass only grows inside the polygon
    const originalGeometry = GrassGeometry.prototype.constructor;
    GrassGeometry.prototype.constructor = function(width, length, count) {
      THREE.BufferGeometry.call(this);
      
      const positions = [];
      const uvs = [];
      const indices = [];
      
      this.bladePositions = [];
      let actualCount = 0;
      
      // Try to generate the requested number of blades
      for (let i = 0; i < count * 2 && actualCount < count; i++) {
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);
        
        // Only add grass inside the polygon
        if (isPointInPolygon(x, z, boundaryPoints)) {
          this.bladePositions.push([x, 0, z]);
          
          uvs.push(
            ...Array.from({ length: 5 }).flatMap(() => [
              (x - minX) / (maxX - minX),
              (z - minZ) / (maxZ - minZ)
            ])
          );
          
          const blade = this.computeBlade([x, 0, z], actualCount);
          positions.push(...blade.positions);
          indices.push(...blade.indices.map(idx => idx + actualCount * 5));
          
          actualCount++;
        }
      }
      
      this.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      this.setIndex(indices);
      this.computeVertexNormals();
    };
    
    return new GrassGeometry(0, 0, 0); // Dimensions don't matter, we're using the polygon
  }
  
  // Add trees to the garden
  function addTrees() {
    const treePositions = [
      {x: -15, z: -10, scale: 1.5},
      {x: 15, z: 10, scale: 1.2},
      {x: 0, z: -20, scale: 1.8},
      {x: -20, z: 20, scale: 1.3},
      {x: 25, z: -15, scale: 1.6},
      {x: -25, z: 0, scale: 1.4},
      {x: 10, z: 25, scale: 1.5}
    ];
    
    treePositions.forEach(pos => {
      // Create simple tree model
      const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
      const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.set(pos.x, 1.5, pos.z);
      trunk.castShadow = true;
      scene.add(trunk);
      
      const leavesGeometry = new THREE.ConeGeometry(2.5 * pos.scale, 5 * pos.scale, 8);
      const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57 });
      const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
      leaves.position.set(pos.x, 5 * pos.scale, pos.z);
      leaves.castShadow = true;
      scene.add(leaves);
      
      // Add tree to the collision list
      trees.push({
        position: {x: pos.x, z: pos.z},
        radius: 1.5 * pos.scale
      });
    });
  }
  
  // === COLLISION DETECTION ===
  function checkCollisions(nextPosition) {
    // Check fence collisions - use line segments for more accurate collision
    for (const fence of fenceSegments) {
      // Simple distance check to fence line segment
      const p1 = fence.start;
      const p2 = fence.end;
      
      const segmentLength = fence.length;
      
      // Vector from segment start to point
      const dx = nextPosition.x - p1.x;
      const dz = nextPosition.z - p1.z;
      
      // Vector along segment
      const segmentDx = p2.x - p1.x;
      const segmentDz = p2.z - p1.z;
      
      // Project point onto segment
      const t = (dx * segmentDx + dz * segmentDz) / (segmentLength * segmentLength);
      const clampedT = Math.max(0, Math.min(1, t));
      
      // Closest point on segment
      const closestX = p1.x + clampedT * segmentDx;
      const closestZ = p1.z + clampedT * segmentDz;
      
      // Distance to closest point
      const distance = Math.sqrt(Math.pow(nextPosition.x - closestX, 2) + 
                                Math.pow(nextPosition.z - closestZ, 2));
      
      if (distance < 1.5) { // Collision threshold
        return true;
      }
    }
    
    // Check tree collisions
    for (const tree of trees) {
      const distance = Math.sqrt(
        Math.pow(nextPosition.x - tree.position.x, 2) + 
        Math.pow(nextPosition.z - tree.position.z, 2)
      );
      if (distance < tree.radius + 1.5) {
        return true;
      }
    }
    
    return false;
}

// Replace the existing grass creation with the irregular garden
const grass = createIrregularGarden();
addTrees();

// // === TILE CONFIGURATION ===
// const TILE_WIDTH = 40;
// const TILE_LENGTH = 40;
// const BLADE_COUNT = 80000;

// // Create a single grass tile
// const grass = new Grass(TILE_WIDTH, TILE_LENGTH, BLADE_COUNT);
// grass.position.set(0, 0, 0);
// grass.castShadow = true;
// grass.receiveShadow = true;
// scene.add(grass);

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
loader.load('/grassCutter/src/models/greenLowPoly2.glb', function (gltf) {
    mowerModel = gltf.scene;
    mowerModel.scale.set(10, 10, 10);
    mowerModel.position.set(80,85,0);
    //mowerModel.position.copy(collisionBox.position.set);
    scene.add(mowerModel);
}, undefined, function (error) {
    console.error(error);
});

// === MOVEMENT SETTINGS ===
const moveSpeed = 0.1;
const rotationSpeed = 0.02;

// Movement controls
const keys = { 'w': false, 'a': false, 's': false, 'd': false, 'c': false };
let mowerDown = false; // Mower starts OFF

document.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = true;
    }

    if (event.key.toLowerCase() === 'c') {
        mowerDown = !mowerDown; // Toggle mower ON/OFF
        updateMowerIndicator();
    }
});
document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key.toLowerCase())) {
        keys[event.key.toLowerCase()] = false;
    }
});

// === CAMERA CONTROLS ===
const cameraOffset = new THREE.Vector3(0, 8, -15);
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
    if (!mowerDown) return; // Don't cut if mower is OFF

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

// === ADDING MOWER STATUS INDICATOR ===
const mowerIndicator = document.createElement('div');
mowerIndicator.style.position = 'absolute';
mowerIndicator.style.top = '20px';
mowerIndicator.style.left = '20px';
mowerIndicator.style.padding = '10px 20px';
mowerIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
mowerIndicator.style.color = 'white';
mowerIndicator.style.fontSize = '18px';
mowerIndicator.style.fontFamily = 'Arial, sans-serif';
mowerIndicator.style.borderRadius = '5px';
mowerIndicator.style.zIndex = '1000';
mowerIndicator.innerText = 'Mower: OFF';
document.body.appendChild(mowerIndicator);

function updateMowerIndicator() {
    mowerIndicator.innerText = mowerDown ? 'Mower: ON' : 'Mower: OFF';
    mowerIndicator.style.backgroundColor = mowerDown ? 'rgba(0, 150, 0, 0.7)' : 'rgba(150, 0, 0, 0.7)';
}

// Animation loop
let lastTime = 0;
renderer.setAnimationLoop((time) => {
    const deltaTime = time - lastTime;
    lastTime = time;
    
    const nextPosition = collisionBox.position.clone();
    if (keys['w']) {
      nextPosition.x += Math.sin(collisionBox.rotation.y) * moveSpeed;
      nextPosition.z += Math.cos(collisionBox.rotation.y) * moveSpeed;
    }
    if (keys['s']) {
      nextPosition.x -= Math.sin(collisionBox.rotation.y) * moveSpeed;
      nextPosition.z -= Math.cos(collisionBox.rotation.y) * moveSpeed;
    }
    
    // Move only if no collision detected
    if (!checkCollisions(nextPosition)) {
      collisionBox.position.copy(nextPosition);
    }

    // Handle movement
    // if (keys['w']) {
    //     collisionBox.position.x += Math.sin(collisionBox.rotation.y) * moveSpeed;
    //     collisionBox.position.z += Math.cos(collisionBox.rotation.y) * moveSpeed;
    // }
    // if (keys['s']) {
    //     collisionBox.position.x -= Math.sin(collisionBox.rotation.y) * moveSpeed;
    //     collisionBox.position.z -= Math.cos(collisionBox.rotation.y) * moveSpeed;
    // }
    if (keys['a']) {
        collisionBox.rotation.y += rotationSpeed;
    }
    if (keys['d']) {
        collisionBox.rotation.y -= rotationSpeed;
    }

    // Sync mower model with collision box
    if (mowerModel) {
        mowerModel.position.copy(collisionBox.position);
        mowerModel.position.y += 2.3;
        mowerModel.rotation.y = collisionBox.rotation.y;
    }

    // Cut grass only if mower is ON
    if ((keys['w'] || keys['s'] || keys['a'] || keys['d']) && mowerDown) {
        cutGrassUnderObject();
    }

    // Camera logic
    if (returnToFollow) {
        cameraRotationX *= 0.9; 
        cameraRotationY *= 0.9;
        if (Math.abs(cameraRotationX) < 0.01 && Math.abs(cameraRotationY) < 0.01) {
            returnToFollow = false;
            cameraRotationX = 0;
            cameraRotationY = 0;
        }
    }

    const targetPosition = collisionBox.position.clone().add(
        cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), collisionBox.rotation.y + cameraRotationX)
    );
    targetPosition.y += cameraRotationY * 5;

    camera.position.lerp(targetPosition, followSpeed);
    camera.lookAt(collisionBox.position);

    grass.update(time, collisionBox.position);
    renderer.render(scene, camera);
});
