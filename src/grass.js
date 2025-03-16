// Import Three.js library for 3D rendering
import * as THREE from 'three';

// Import vertex and fragment shaders (used for custom grass rendering)
import { vertexShader, fragmentShader } from './shaders.js';

// === GRASS BLADE CONSTANTS ===
// These define the shape and variation of individual grass blades
const BLADE_WIDTH = 0.1;          // Width of a single grass blade
const BLADE_HEIGHT = 0.8;         // Base height of a grass blade
const BLADE_HEIGHT_VARIATION = 0.6; // Random height variation for realism
const BLADE_VERTEX_COUNT = 5;     // Number of vertices per blade
const BLADE_TIP_OFFSET = 0.1;     // Tip bending offset for more natural look

// === INTERPOLATION FUNCTION ===
// Used to map values from one range to another
// Example: Convert (x, y) position to a (0,1) UV coordinate for textures
function interpolate(val, oldMin, oldMax, newMin, newMax) {
  return ((val - oldMin) * (newMax - newMin)) / (oldMax - oldMin) + newMin;
}

// === GRASS GEOMETRY CLASS ===
// This class generates and manages grass blades
export class GrassGeometry extends THREE.BufferGeometry {
  constructor(size, count) {
    super();

    // Arrays to store geometry data
    const positions = []; // Stores vertex positions
    const uvs = [];       // Stores texture mapping coordinates
    const indices = [];   // Stores how vertices form triangles

    // Loop to create multiple grass blades
    for (let i = 0; i < count; i++) {
      // Define random placement within a circular field
      const surfaceMin = (size / 2) * -1;
      const surfaceMax = size / 2;
      const radius = (size / 2) * Math.random(); // Random distance from center
      const theta = Math.random() * 2 * Math.PI; // Random angle

      // Convert polar coordinates (radius, theta) to (x, y) position
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);

      // Store UV coordinates for texturing
      uvs.push(
        ...Array.from({ length: BLADE_VERTEX_COUNT }).flatMap(() => [
          interpolate(x, surfaceMin, surfaceMax, 0, 1),
          interpolate(y, surfaceMin, surfaceMax, 0, 1)
        ])
      );

      // Compute the blade's shape and add its data to the arrays
      const blade = this.computeBlade([x, 0, y], i);
      positions.push(...blade.positions);
      indices.push(...blade.indices);
    }

    // Convert arrays into Three.js buffer attributes (required for rendering)
    this.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3) // 3D coordinates
    );
    this.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2)); // 2D texture coordinates
    this.setIndex(indices); // Define how vertices form triangles
    this.computeVertexNormals(); // Calculate normals for lighting effects
  }

  // === GENERATE A SINGLE GRASS BLADE ===
  computeBlade(center, index = 0) {
    // Randomize height to make grass look more natural
    const height = BLADE_HEIGHT + Math.random() * BLADE_HEIGHT_VARIATION;
    const vIndex = index * BLADE_VERTEX_COUNT; // Base index for this blade

    // Generate random rotation (yaw) for the blade
    const yaw = Math.random() * Math.PI * 2;
    const yawVec = [Math.sin(yaw), 0, -Math.cos(yaw)]; // Direction vector

    // Generate random bending direction
    const bend = Math.random() * Math.PI * 2;
    const bendVec = [Math.sin(bend), 0, -Math.cos(bend)];

    // Define the blade's four base vertices (bottom left, bottom right, etc.)
    const bl = yawVec.map((n, i) => n * (BLADE_WIDTH / 2) * 1 + center[i]);
    const br = yawVec.map((n, i) => n * (BLADE_WIDTH / 2) * -1 + center[i]);
    const tl = yawVec.map((n, i) => n * (BLADE_WIDTH / 4) * 1 + center[i]);
    const tr = yawVec.map((n, i) => n * (BLADE_WIDTH / 4) * -1 + center[i]);
    const tc = bendVec.map((n, i) => n * BLADE_TIP_OFFSET + center[i]); // Tip control point

    // Adjust height positions
    tl[1] += height / 2;
    tr[1] += height / 2;
    tc[1] += height;

    return {
      positions: [...bl, ...br, ...tr, ...tl, ...tc], // All vertex positions
      indices: [
        vIndex, vIndex + 1, vIndex + 2,  // Bottom triangle
        vIndex + 2, vIndex + 4, vIndex + 3, // Top triangle
        vIndex + 3, vIndex, vIndex + 2   // Side triangle
      ]
    };
  }
}

// === CLOUD TEXTURE ===
// Used to add a subtle texture effect to the grass
const cloudTexture = new THREE.TextureLoader().load('/cloud.jpg');
cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping; // Makes texture tile seamlessly

// === GRASS CLASS ===
// This class creates the full grass object and manages its updates
class Grass extends THREE.Mesh {
  constructor(size, count) {
    // Create grass geometry and custom shader material
    const geometry = new GrassGeometry(size, count);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uCloud: { value: cloudTexture }, // Cloud texture for variation
        uTime: { value: 0 }, // Time uniform (used for animation)
        uObjectPosition: { value: new THREE.Vector3() } // Player position (for interaction effects)
      },
      side: THREE.DoubleSide, // Render both sides of the grass blades
      vertexShader,
      fragmentShader,
      shadowSide: THREE.DoubleSide // Allow shadows on both sides
    });

    // Call the parent class (THREE.Mesh) constructor
    super(geometry, material);

    this.name = 'grassMesh'; // Assign name for reference
    this.castShadow = true; // Enable shadows
    this.receiveShadow = true;

    // === CREATE FLOOR (GIVES THE GRASS A BASE) ===
    const floorGeometry = new THREE.CircleGeometry(15, 8).rotateX(-Math.PI / 2);
    const floorMaterial = material.clone(); // Use the same shader material
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -Number.EPSILON; // Slight offset to avoid z-fighting (visual glitch)
    floor.name = 'floorMesh';

    // Add floor to grass object
    this.add(floor);
  }

  // === UPDATE FUNCTION (CALLED EVERY FRAME) ===
  update(time, objectPosition) {
    this.material.uniforms.uTime.value = time; // Update animation time
    this.material.uniforms.uObjectPosition.value.copy(objectPosition); // Update player position for interaction effects
  }
}

// Export Grass class for use in other files
export default Grass;
