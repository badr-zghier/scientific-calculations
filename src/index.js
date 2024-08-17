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

// Constants for the size of the map and field of view (FOV)
const MAP_SIZE = 200000;
const FOV = 100;

// Destructure the Vector3 and PerspectiveCamera classes from the THREE namespace
const { Vector3, PerspectiveCamera } = THREE;

// Create a renderer object, which handles drawing the scene onto the screen
const renderer = new Renderer({
  container: "container", // The DOM element ID where the renderer will attach the canvas
  pixelated: true, // Ensures sharp edges in the rendering
});

// Setting up the first camera, which provides a view of the scene from a specific position
const camera1 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight, // Aspect ratio based on the window size
  1, // Near clipping plane
  20000 // Far clipping plane, the maximum distance from the camera at which objects are still rendered
);
camera1.position.set(300, 100, 300); // Set the initial position of camera1

// Setting up a second camera, potentially for a different view (e.g., behind the boat)
const camera2 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight, // Aspect ratio based on the window size
  1,
  20000
);
camera2.position.set(0, 50, 0); // Set the initial position of camera2

// Create a new RealityGrid, which is a custom class that manages the scene and the rendering process
const grid = new RealityGrid({ renderer, camera: camera1 });

// Variables to manage the state of the game and objects in the scene
let stats; // To display performance statistics (e.g., FPS)
let water; // To hold the water surface object
let pcBoat; // To represent the boat
let enemyBoats = []; // An array to hold enemy boat objects
let mouseWheelWatcher; // To track and respond to mouse wheel movements (zoom)
let controls; // For camera controls, allowing the user to move the camera around

// Function to load the player's boat model
function loadBoatModel() {
  const mtlLoader = new MTLLoader(); // Create a material loader
  mtlLoader.setPath("assets/models/"); // Set the path to the models directory

  // Load the materials for the boat model
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload(); // Preload the materials for faster rendering

    // Load the boat object using OBJLoader
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials); // Apply the loaded materials to the object
    objLoader.setPath("assets/models/");
    objLoader.load("b.obj", (object) => {
      object.scale.set(0.05, 0.05, 0.05); // Scale the object to fit the scene
      object.position.set(0, 0, 0); // Set the initial position of the boat
      object.rotation.set(0, 0, 0); // Set the initial rotation of the boat

      // Change the boat color to gold by modifying the material's color
      object.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(0xffa900); // Set to a golden color
        }
      });

      pcBoat.mesh = object; // Assign the boat object to the player's boat
      grid.add(pcBoat); // Add the player's boat to the scene
    });
  });
}

// Function to apply user-inputted values to the boat's properties
function applyValues() {
  // Retrieve values from HTML input fields
  const weightInput = document.getElementById("weightInput").value;
  const submergedVolumeInput = document.getElementById(
    "submergedVolumeInput"
  ).value;
  const wave = document.getElementById("waveHeightInput").value;
  const wetArea = document.getElementById("wetAreaInput").value;

  // Apply the values to the boat's physical properties
  pcBoat.mass = parseFloat(weightInput); // Boat mass
  pcBoat.submergedVolume = parseFloat(submergedVolumeInput); // Volume submerged in water
  pcBoat.wave = parseFloat(wave); // Wave height affecting the boat
  pcBoat.wetArea = parseFloat(wetArea); // Surface area of the boat in contact with water

  // Display a message indicating the applied values
  // document.getElementById(
  //   "messageDisplay"
  // ).textContent = `Values applied: Weight=${weightInput}, Submerged Volume=${submergedVolumeInput},wave height=${wave}`;
}

// Set up event listeners to dynamically apply values when the user changes inputs
document.getElementById("weightInput").addEventListener("input", applyValues);
document
  .getElementById("submergedVolumeInput")
  .addEventListener("input", applyValues);
document.getElementById("wetAreaInput").addEventListener("input", applyValues);
document
  .getElementById("waveHeightInput")
  .addEventListener("input", applyValues);

// Function to initialize the scene with all objects, lighting, and controls
function init() {
  // Initialize the water surface using a plane geometry
  const waterGeometry = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE);
  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load(
      "images/waternormals.jpg", // Texture to create wave effects
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // Repeat the texture across the water surface
      }
    ),
    sunDirection: new THREE.Vector3(), // Sunlight direction for reflections
    sunColor: 0xffdab99, // Light color for sunset
    waterColor: 0x89cff0, // Light blue water color
    distortionScale: 3.7, // Intensity of water distortion
    fog: grid.scene.fog !== undefined, // Whether to apply fog effects to the water
  });

  // Rotate the water plane to lay flat horizontally
  water.rotation.x = -Math.PI / 2;
  const waterEntity = new GridEntity({ mesh: water, wireframe: false }); // Create a grid entity for the water
  grid.add(waterEntity); // Add the water entity to the scene

  // Add a directional light to simulate sunlight
  const directionalLight = new THREE.DirectionalLight(0xffdab9, 1); // Light orange color
  directionalLight.position.set(50, 200, 100); // Position of the sunlight in the scene

  // Add an ambient light to illuminate the entire scene uniformly
  const ambientLight = new THREE.AmbientLight(0xffe4b5); // Light pink color
  grid.scene.add(ambientLight); // Add ambient light to the scene
  grid.scene.add(directionalLight); // Add directional light to the scene

  // Initialize the skybox or sky dome
  const sky = new GameSky(grid.scene, grid.renderer); // Create a sky object
  grid.scene.add(sky); // Add the sky to the scene

  // Initialize the player's boat with gravity and buoyancy settings
  pcBoat = new Boat({
    color: 0xffffff, // Boat color (white)
    worldGrid: grid, // Reference to the world grid (scene manager)
    gravity: new Vector3(0, -9.81, 0), // Gravity vector affecting the boat
  });

  pcBoat.buoyancy = new Vector3(0, 5.18, 0); // Buoyancy force applied to the boat

  // Load the boat model (uncomment the line below to load the dragon model instead)
  // loadDModel();
  loadBoatModel(); // Load the player's boat model

  // Initialize the stats panel to display performance metrics (e.g., FPS)
  stats = new Stats();
  renderer.container.appendChild(stats.dom); // Attach the stats panel to the DOM

  // Initialize the mouse wheel watcher to track and respond to zooming
  mouseWheelWatcher = new MouseWheelWatcher({ min: -400, max: 300 });

  // Initialize orbit controls to allow the user to move the camera around
  controls = new OrbitControls(camera1, renderer.container);
  controls.maxPolarAngle = Math.PI * 0.495; // Limit the vertical rotation angle
  controls.target.set(0, 10, 0); // Set the point the camera looks at
  controls.minDistance = 40.0; // Minimum zoom distance
  controls.maxDistance = 500.0; // Maximum zoom distance
  controls.update(); // Update the controls

  // Add event listeners to handle window resizing and right-click actions
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("contextmenu", onRightClick);
}

// Function to handle window resizing and update the camera and renderer accordingly
function onWindowResize() {
  camera1.aspect = window.innerWidth / window.innerHeight; // Update the camera aspect ratio
  camera1.updateProjectionMatrix(); // Update the camera projection matrix
  renderer.setSize(window.innerWidth, window.innerHeight); // Update the renderer size
}

// Function to handle right-click actions (currently toggles between cameras)
function onRightClick(event) {
  event.preventDefault(); // Prevent the default context menu from appearing
  if (activeCamera === camera1) {
    activeCamera = camera1; // This condition currently does nothing; it can be expanded to switch cameras
  } else {
    activeCamera = camera1; // Keep the first camera as the active camera
  }
}

// Function to handle collisions between the boat and obstacles
function handleBoatObstacleCollision(boat, obstacle) {
  boat.handleCollisionWithObstacle(obstacle); // Call the boat's collision handling method
}

// Function to create obstacles in the scene at specified positions
function createObstacle(position, size) {
  const geometry = new THREE.BoxGeometry(size, size, size); // Create a box geometry for the obstacle
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red material for the obstacle
  const obstacle = new THREE.Mesh(geometry, material); // Create a mesh for the obstacle
  obstacle.position.set(position.x, position.y, position.z); // Set the obstacle's position
  return obstacle; // Return the created obstacle
}

// Initialize arrays to hold obstacles and their positions
const obstacles = [];
const obstaclePositions = [];

// Add obstacles to the scene based on predefined positions
obstaclePositions.forEach((pos) => {
  const obstacle = createObstacle(pos, 50); // Create an obstacle at each position
  grid.scene.add(obstacle); // Add the obstacle to the scene
  obstacles.push(obstacle); // Add the obstacle to the obstacles array
});

grid.obstacles = obstacles; // Store the obstacles in the grid's obstacles array

// Function to check for collisions between the player's boat and obstacles/enemy boats
function checkCollisions() {
  let hits = 0; // Initialize a counter for the number of collisions

  // Check for collisions between the player's boat and enemy boats
  enemyBoats.forEach((b) => {
    if (pcBoat.checkCollision(b)) {
      // If a collision is detected
      hits += 1; // Increment the collision counter
      pcBoat.handleCollision(b); // Handle the collision
    }
  });

  // Check for collisions between the player's boat and obstacles
  obstacles.forEach((obstacle) => {
    if (pcBoat.checkCollisionWithObstacle(obstacle)) {
      hits += 1; // Increment the collision counter
      handleBoatObstacleCollision(pcBoat, obstacle); // Handle the collision
    }
  });

  console.log(hits); // Log the number of collisions
}

// Function to update the information panel with the boat's current status
function updateInfoPanel() {
  const speedDisplay = document.getElementById("speedDisplay");
  const accelerationDisplay = document.getElementById("accelerationDisplay");
  const rotationDisplay = document.getElementById("rotationDisplay");
  const sailAngleDisplay = document.getElementById("sailAngleDisplay"); // New element for sail angle

  // Calculate and display the boat's speed, acceleration, and rotation
  const speed = pcBoat.velocity ? pcBoat.velocity.length() : 0;
  const acceleration = pcBoat.acceleration ? pcBoat.acceleration.length() : 0;
  const rotation = pcBoat.rotation ? pcBoat.rotation.y : 0;
  const sailAngle = pcBoat.sailAngle || 0; // Retrieve and display the sail angle

  speedDisplay.textContent = speed.toFixed(2); // Display the boat's speed
  accelerationDisplay.textContent = acceleration.toFixed(2); // Display the boat's acceleration
  rotationDisplay.textContent = rotation.toFixed(2); // Display the boat's rotation angle
  sailAngleDisplay.textContent = sailAngle.toFixed(2); // Display the sail angle
}

// Variables for tracking time in the animation loop
let nowTime;
let t;

// The main animation loop
function animate() {
  const lastTimeNow = nowTime;

  // Update the water's time uniform for animated water effects
  water.material.uniforms["time"].value += 1.0 / 60.0;
  nowTime = performance.now(); // Get the current time
  t = lastTimeNow ? nowTime - lastTimeNow : 0.000001; // Calculate the time delta
  t = t / 1000; // Convert time delta to seconds

  // Boat controls for throttle and turning based on keyboard input
  if (keyIsDown(38)) pcBoat.throttleUp(); // Up arrow for throttle up
  if (keyIsDown(40)) pcBoat.throttleDown(); // Down arrow for throttle down
  const turnAmount = keyIsDown(37) - keyIsDown(39); // Left and right arrows for turning

  pcBoat.turn(turnAmount); // Apply the turning based on input

  // Update and render the grid (the scene)
  grid.update(t, nowTime); // Update the grid with the time delta
  grid.render(); // Render the grid
  checkCollisions(); // Check for collisions in each frame

  updateInfoPanel(); // Update the information panel with the latest data

  // Position and orient the second camera behind the boat
  camera2.position.copy(pcBoat.mesh.position).add(new Vector3(100, 300, -800));
  camera2.lookAt(pcBoat.mesh.position); // Make the camera look at the boat

  requestAnimationFrame(animate); // Request the next frame to keep the loop going
  renderer.render(grid.scene, activeCamera); // Render the scene with the active camera
}

// Initialize the scene and start the animation loop
init(); // Initialize the scene
animate(); // Start the animation loop
