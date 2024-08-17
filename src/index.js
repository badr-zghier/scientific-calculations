import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import Renderer from "rocket-boots-three-toolbox/src/Renderer.js";
import RealityGrid from "./RealityGrid.js";
import GameSky from "./Sky.js";
import GameWater from "./Water.js";
import Stats from "three/addons/libs/stats.module.js";
import Boat from "./Boat.js";
import GridEntity from "./GridEntity.js";
import { keyIsDown } from "./libs/engine.all.js";
import MouseWheelWatcher from "rocket-boots-three-toolbox/src/MouseWheelWatcher.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";

// Constants for map dimensions and field of view
const MAP_SIZE = 200000;
const MAP_MAX = MAP_SIZE / 2;
const MAP_MIN = -MAP_MAX;
const FOV = 100;

const { Vector3, PerspectiveCamera } = THREE;

// Create a renderer to display the scene
const renderer = new Renderer({
  container: "container",
  pixelated: true, // Ensures sharp edges are maintained
});

// Setting up the first camera
const camera1 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera1.position.set(300, 100, 300);

// Setting up the second camera
const camera2 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera2.position.set(0, 50, 0);

// Create a new RealityGrid to manage the scene and rendering
const grid = new RealityGrid({ renderer, camera: camera1 });

// Variable to track which camera is currently active
let activeCamera = camera1;

let stats;
let water;
let pcBoat;
let enemyBoats = [];
let mouseWheelWatcher;
let controls;

// Function to load the boat model
function loadBoatModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath("assets/models/");

  // Load the materials for the boat model
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload();

    // Load the boat object using OBJLoader
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/models/");
    objLoader.load("b.obj", (object) => {
      object.scale.set(0.05, 0.05, 0.05);
      object.position.set(0, 0, 0);
      object.rotation.set(0, 0, 0);

      // Change the boat color to gold
      object.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(0xffa900); // Set to a golden color
        }
      });

      pcBoat.mesh = object;
      grid.add(pcBoat);
    });
  });
}

// Function to load a dragon model (if needed)
function loadDModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath("assets/models/");

  // Load the materials for the dragon model
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload();

    // Load the dragon object using OBJLoader
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/models/");
    objLoader.load("Dragon.obj", (object) => {
      object.scale.set(5, 5, 5);
      object.position.set(-1000, 780, 110);
      object.rotation.set(0, 0, 0);

      pcBoat.mesh = object;
      grid.add(pcBoat);
    });
  });
}

// Function to apply input values to the boat
function applyValues() {
  const weightInput = document.getElementById("weightInput").value;
  const submergedVolumeInput = document.getElementById(
    "submergedVolumeInput"
  ).value;
  const wave = document.getElementById("waveHeightInput").value;
  const wetArea = document.getElementById("wetAreaInput").value;

  // Apply input values to the boat's properties
  pcBoat.mass = parseFloat(weightInput);
  pcBoat.submergedVolume = parseFloat(submergedVolumeInput);
  pcBoat.wave = parseFloat(wave);
  pcBoat.wetArea = parseFloat(wetArea);

  // Display the applied values
  document.getElementById(
    "messageDisplay"
  ).textContent = `Values applied: Weight=${weightInput}, Submerged Volume=${submergedVolumeInput},wave height=${wave}`;
}

// Event listeners for input fields to apply values dynamically
document.getElementById("weightInput").addEventListener("input", applyValues);
document
  .getElementById("submergedVolumeInput")
  .addEventListener("input", applyValues);
document.getElementById("wetAreaInput").addEventListener("input", applyValues);
document
  .getElementById("waveHeightInput")
  .addEventListener("input", applyValues);

// Function to initialize the scene
function init() {
  // Initialize the water surface
  const waterGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "images/waternormals.jpg",
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      }
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffdab99, // Light color for sunset
    waterColor: 0x89cff0, // Light blue water color
    distortionScale: 3.7,
    fog: grid.scene.fog !== undefined,
  });

  // Rotate the water plane to lay flat
  water.rotation.x = -Math.PI / 2;
  const waterEntity = new GridEntity({ mesh: water, wireframe: false });
  grid.add(waterEntity);

  // Add a directional light to the scene
  const directionalLight = new THREE.DirectionalLight(0xffdab9, 1); // Light orange color
  directionalLight.position.set(50, 200, 100);

  // Add an ambient light for overall illumination
  const ambientLight = new THREE.AmbientLight(0xffe4b5); // Light pink color
  grid.scene.add(ambientLight);
  grid.scene.add(directionalLight);

  // Initialize the sky
  const sky = new GameSky(grid.scene, grid.renderer);
  grid.scene.add(sky);

  // Initialize the player's boat with gravity and buoyancy settings
  pcBoat = new Boat({
    color: 0xffffff,
    worldGrid: grid,
    gravity: new Vector3(0, -9.81, 0),
  });

  pcBoat.buoyancy = new Vector3(0, 5.18, 0);

  // Load the boat model (uncomment the line below to load the dragon model instead)
  // loadDModel();
  loadBoatModel();

  // Initialize the stats panel to display performance information
  stats = new Stats();
  renderer.container.appendChild(stats.dom);

  // Initialize the mouse wheel watcher to track zoom level
  mouseWheelWatcher = new MouseWheelWatcher({ min: -400, max: 300 });

  // Initialize orbit controls for camera movement
  controls = new OrbitControls(camera1, renderer.container);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 500.0;
  controls.update();

  // Add event listeners for window resize and right-click actions
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("contextmenu", onRightClick);
}

// Function to update the camera aspect ratio and renderer size on window resize
function onWindowResize() {
  camera1.aspect = window.innerWidth / window.innerHeight;
  camera1.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Function to handle right-click actions (currently toggles between cameras)
function onRightClick(event) {
  event.preventDefault();
  if (activeCamera === camera1) {
    activeCamera = camera1;
  } else {
    activeCamera = camera1;
  }
}

// Function to handle collisions between the boat and obstacles
function handleBoatObstacleCollision(boat, obstacle) {
  boat.handleCollisionWithObstacle(obstacle);
}

// Function to create obstacles in the scene
function createObstacle(position, size) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const obstacle = new THREE.Mesh(geometry, material);
  obstacle.position.set(position.x, position.y, position.z);
  return obstacle;
}

// Initialize arrays to hold obstacles and their positions
const obstacles = [];
const obstaclePositions = [];

// Add obstacles to the scene based on predefined positions
obstaclePositions.forEach((pos) => {
  const obstacle = createObstacle(pos, 50);
  grid.scene.add(obstacle);
  obstacles.push(obstacle);
});

grid.obstacles = obstacles;

// Function to check for collisions between the player's boat and obstacles/enemy boats
function checkCollisions() {
  let hits = 0;

  enemyBoats.forEach((b) => {
    if (pcBoat.checkCollision(b)) {
      hits += 1;
      pcBoat.handleCollision(b);
    }
  });

  obstacles.forEach((obstacle) => {
    if (pcBoat.checkCollisionWithObstacle(obstacle)) {
      hits += 1;
      handleBoatObstacleCollision(pcBoat, obstacle);
    }
  });

  console.log(hits);
}

// Function to update the information panel with the boat's current status
function updateInfoPanel() {
  const speedDisplay = document.getElementById("speedDisplay");
  const accelerationDisplay = document.getElementById("accelerationDisplay");
  const rotationDisplay = document.getElementById("rotationDisplay");
  const sailAngleDisplay = document.getElementById("sailAngleDisplay"); // New element for sail angle

  const speed = pcBoat.velocity ? pcBoat.velocity.length() : 0;
  const acceleration = pcBoat.acceleration ? pcBoat.acceleration.length() : 0;
  const rotation = pcBoat.rotation ? pcBoat.rotation.y : 0;
  const sailAngle = pcBoat.sailAngle || 0;

  speedDisplay.textContent = speed.toFixed(2);
  accelerationDisplay.textContent = acceleration.toFixed(2);
  rotationDisplay.textContent = rotation.toFixed(2);
  sailAngleDisplay.textContent = sailAngle.toFixed(2); // Display sail angle
}

// Variables for tracking time in the animation loop
let nowTime;
let t;

// The main animation loop
function animate() {
  const lastTimeNow = nowTime;

  // Update the water's time uniform for animated water effects
  water.material.uniforms["time"].value += 1.0 / 60.0;
  nowTime = performance.now();
  t = lastTimeNow ? nowTime - lastTimeNow : 0.000001;
  t = t / 1000;

  // Boat controls for throttle and turning
  if (keyIsDown(38)) pcBoat.throttleUp(); // Up arrow for throttle up
  if (keyIsDown(40)) pcBoat.throttleDown(); // Down arrow for throttle down
  const turnAmount = keyIsDown(37) - keyIsDown(39); // Left and right arrows for turning

  pcBoat.turn(turnAmount);

  // Update and render the grid
  grid.update(t, nowTime);
  grid.render();
  checkCollisions(); // Check for collisions in each frame

  updateInfoPanel(); // Update the information panel with the latest data

  // Position and orient the second camera behind the boat
  camera2.position.copy(pcBoat.mesh.position).add(new Vector3(100, 300, -800));
  camera2.lookAt(pcBoat.mesh.position);

  requestAnimationFrame(animate); // Request the next frame
  renderer.render(grid.scene, activeCamera); // Render the scene with the active camera
}

// Initialize the scene and start the animation loop
init();
animate();
