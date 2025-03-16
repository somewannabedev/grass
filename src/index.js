import * as THREE from "https://unpkg.com/three@0.138.0/build/three.module.js"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Grass from './grass.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100
)
camera.position.set(-7, 3, 7)
camera.lookAt(0, 0, 0)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enablePan = false
controls.maxPolarAngle = Math.PI / 2.2
controls.maxDistance = 15

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xf0f0f0);

const directionalLight = new THREE.DirectionalLight(0xffccaa, 1.5);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.camera.left = 20;
directionalLight.shadow.camera.right = -20;
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const grass = new Grass(30, 60000);
grass.castShadow = true;
grass.receiveShadow = true;
scene.add(grass);

const objectGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const objectMaterial = new THREE.MeshStandardMaterial({ color: 0x995522 });
const controllableObject = new THREE.Mesh(objectGeometry, objectMaterial);
controllableObject.castShadow = true;
controllableObject.position.set(0, 0.5, 0);
scene.add(controllableObject);

const floor = scene.getObjectByName('floorMesh');
if (floor) {
    floor.receiveShadow = true;
} else {
    const floorGeometry = new THREE.CircleGeometry(15, 8).rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.receiveShadow = true;
    floorMesh.position.y = -Number.EPSILON;
    floorMesh.name = 'floorMesh';
    scene.add(floorMesh);
}

const moveSpeed = 0.1;
const keys = {
    'w': false, 'a': false, 's': false, 'd': false
};

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


renderer.setAnimationLoop((time) => {
    grass.update(time, controllableObject.position);

    if (keys['w']) controllableObject.position.z -= moveSpeed;
    if (keys['s']) controllableObject.position.z += moveSpeed;
    if (keys['a']) controllableObject.position.x -= moveSpeed;
    if (keys['d']) controllableObject.position.x += moveSpeed;

    controls.update()
    renderer.render(scene, camera)
})