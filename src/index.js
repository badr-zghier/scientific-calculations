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

// Constants defining the map's dimensions and camera field of view
const MAP_SIZE = 200000; // The size of the water plane
const FOV = 100; // Field of view for the cameras

// Destructuring necessary classes from THREE.js
const { Vector3, PerspectiveCamera } = THREE;

// Renderer setup: Manages how the scene is rendered onto the screen
const renderer = new Renderer({
  container: "container", // ID of the DOM element where the renderer will append the canvas
  pixelated: true, // Render with pixelation to keep sharp edges
});

renderer.setSize(window.innerWidth, window.innerHeight); // Set the initial size of the renderer canvas

// First camera setup: Primary perspective camera for viewing the scene
const camera1 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight, // Aspect ratio of the camera
  1, // Near clipping plane distance
  20000 // Far clipping plane distance
);
camera1.position.set(300, 100, 300); // Initial position of camera1 in the scene

// Second camera setup: Alternative perspective camera for different views
const camera2 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight, // Aspect ratio of the camera
  1, // Near clipping plane distance
  20000 // Far clipping plane distance
);
camera2.position.set(0, 50, 0); // Initial position of camera2 in the scene

// Create a RealityGrid instance to manage the scene and rendering
const grid = new RealityGrid({ renderer, camera: camera1 });

// Variables to manage the state of the game and objects
let stats; // Performance statistics display (FPS)
let water; // The water surface object
let pcBoat; // Player's boat object
let mouseWheelWatcher; // Handles mouse wheel interactions for zooming
let controls; // Camera controls for user interaction

// Function to load and set up the player's boat model
function loadBoatModel() {
  const mtlLoader = new MTLLoader(); // Create a loader for material files
  mtlLoader.setPath("assets/models/"); // Set the path for loading material files

  // Load the boat materials
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload(); // Preload materials to optimize loading

    const objLoader = new OBJLoader(); // Create a loader for OBJ files
    objLoader.setMaterials(materials); // Apply loaded materials to the OBJ model
    objLoader.setPath("assets/models/");
    objLoader.load("b.obj", (object) => {
      object.scale.set(0.05, 0.05, 0.05); // Scale the boat model to fit the scene
      object.position.set(0, 0, 0); // Set the initial position of the boat
      object.rotation.set(0, 0, 0); // Set the initial rotation of the boat

      // Change the boat's color to gold
      object.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(0xffa900); // Apply golden color to the boat
        }
      });

      pcBoat.mesh = object; // Assign the boat model to the pcBoat object
      grid.add(pcBoat); // Add the player's boat to the scene
    });
  });
}

// Function to apply user-defined values to the boat's properties
function applyValues() {
  // Retrieve values from HTML input elements
  const weightInput = document.getElementById("weightInput").value;
  const submergedVolumeInput = document.getElementById(
    "submergedVolumeInput"
  ).value;
  const wave = document.getElementById("waveHeightInput").value;
  const wetArea = document.getElementById("wetAreaInput").value;

  // Update the boat's properties based on user input
  pcBoat.mass = parseFloat(weightInput); // Set the boat's mass
  pcBoat.submergedVolume = parseFloat(submergedVolumeInput); // Set the submerged volume
  pcBoat.wave = parseFloat(wave); // Set the wave height affecting the boat
  pcBoat.wetArea = parseFloat(wetArea); // Set the wet surface area

  // Optional message display could be implemented here
}

// Add event listeners to apply changes in real-time when inputs are modified
document.getElementById("weightInput").addEventListener("input", applyValues);
document
  .getElementById("submergedVolumeInput")
  .addEventListener("input", applyValues);
document.getElementById("wetAreaInput").addEventListener("input", applyValues);
document
  .getElementById("waveHeightInput")
  .addEventListener("input", applyValues);

// Initialize the scene, including objects, lighting, and controls
function init() {
  // Create and configure the water surface
  const waterGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE); // Plane geometry for water
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "images/waternormals.jpg", // Texture for simulating water normals
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // Repeat the texture across the water surface
      }
    ),
    sunDirection: new THREE.Vector3(), // Direction of sunlight
    sunColor: 0xffdab9, // Color of sunlight
    waterColor: 0x89cff0, // Color of the water
    distortionScale: 3.7, // Scale of water distortion effects
    fog: grid.scene.fog !== undefined, // Whether fog effects are applied
  });

  water.rotation.x = -Math.PI / 2; // Rotate water to be horizontal
  const waterEntity = new GridEntity({ mesh: water, wireframe: false }); // Create a GridEntity for the water
  grid.add(waterEntity); // Add water entity to the scene

  // Add lighting to the scene
  const directionalLight = new THREE.DirectionalLight(0xffdab9, 1); // Create a directional light (simulates sunlight)
  directionalLight.position.set(50, 200, 100); // Set light position

  const ambientLight = new THREE.AmbientLight(0xffe4b5); // Create ambient light (uniform light across scene)
  grid.scene.add(ambientLight); // Add ambient light to the scene
  grid.scene.add(directionalLight); // Add directional light to the scene

  // Initialize the skybox or sky dome
  const sky = new GameSky(grid.scene, grid.renderer); // Create a sky object
  grid.scene.add(sky); // Add the sky to the scene

  // Create and configure the player's boat
  pcBoat = new Boat({
    color: 0xffffff, // Boat color (white)
    worldGrid: grid, // Reference to the scene manager
    gravity: new Vector3(0, -9.81, 0), // Gravity vector
  });

  pcBoat.buoyancy = new Vector3(0, 5.18, 0); // Set the buoyancy force for the boat

  loadBoatModel(); // Load the boat model into the scene

  // Initialize the performance statistics panel
  stats = new Stats();
  renderer.container.appendChild(stats.dom); // Add the stats panel to the DOM

  // Initialize mouse wheel interactions for zooming
  mouseWheelWatcher = new MouseWheelWatcher({ min: -400, max: 300 });

  // Set up camera controls for user interaction
  controls = new OrbitControls(camera1, renderer.container);
  controls.maxPolarAngle = Math.PI * 0.495; // Limit vertical camera rotation
  controls.target.set(0, 10, 0); // Set the target point of the camera
  controls.minDistance = 40.0; // Minimum zoom distance
  controls.maxDistance = 500.0; // Maximum zoom distance
  controls.update(); // Update controls based on current settings

  // Set up event listeners for resizing and context menu
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("contextmenu", onRightClick);
}

// Handle window resizing to update camera and renderer settings
function onWindowResize() {
  camera1.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
  camera1.updateProjectionMatrix(); // Recompute the camera projection matrix
  renderer.setSize(window.innerWidth, window.innerHeight); // Update renderer size
}

// Handle right-click actions (currently set to default behavior)
function onRightClick(event) {
  event.preventDefault(); // Prevent the context menu from appearing
  if (activeCamera === camera1) {
    activeCamera = camera1; // Switch to camera1 if it's the current active camera
  } else {
    activeCamera = camera1; // Default to camera1
  }
}

// Update the display with the boat's current status
function updateInfoPanel() {
  const speedDisplay = document.getElementById("speedDisplay");
  const accelerationDisplay = document.getElementById("accelerationDisplay");
  const rotationDisplay = document.getElementById("rotationDisplay");
  const sailAngleDisplay = document.getElementById("sailAngleDisplay"); // New element for sail angle

  // Calculate and display the boat's speed, acceleration, rotation, and sail angle
  const speed = pcBoat.velocity ? pcBoat.velocity.length() : 0;
  const acceleration = pcBoat.acceleration ? pcBoat.acceleration.length() : 0;
  const rotation = pcBoat.rotation ? pcBoat.rotation.y : 0;
  const sailAngle = pcBoat.sailAngle || 0; // Retrieve the sail angle

  speedDisplay.textContent = speed.toFixed(2); // Display the speed
  accelerationDisplay.textContent = acceleration.toFixed(2); // Display the acceleration
  rotationDisplay.textContent = rotation.toFixed(2); // Display the rotation angle
  sailAngleDisplay.textContent = sailAngle.toFixed(2); // Display the sail angle
}

// Variables to track time and animation frame updates
let nowTime;
let t;

// Main animation loop to update and render the scene
function animate() {
  const lastTimeNow = nowTime;

  // Update the water material to animate water effects
  water.material.uniforms["time"].value += 1.0 / 60.0;
  nowTime = performance.now(); // Get the current time
  t = lastTimeNow ? nowTime - lastTimeNow : 0.000001; // Calculate the time delta
  t = t / 1000; // Convert delta to seconds

  // Update boat controls based on keyboard input
  if (keyIsDown(38)) pcBoat.throttleUp(); // Up arrow key increases throttle
  if (keyIsDown(40)) pcBoat.throttleDown(); // Down arrow key decreases throttle
  const turnAmount = keyIsDown(37) - keyIsDown(39); // Left and right arrow keys for turning

  pcBoat.turn(turnAmount); // Apply turning based on input

  // Update and render the scene
  grid.update(t, nowTime); // Update grid with time delta
  grid.render(); // Render the grid
  updateInfoPanel(); // Update the information panel with the latest data

  requestAnimationFrame(animate); // Request the next animation frame
  renderer.render(grid.scene, activeCamera); // Render the scene with the active camera
}

// Initialize the scene and start the animation loop
init(); // Set up the initial scene
animate(); // Begin the animation loop
