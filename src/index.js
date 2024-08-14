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

const MAP_SIZE = 200000;
const MAP_MAX = MAP_SIZE / 2;
const MAP_MIN = -MAP_MAX;
const FOV = 100;

const { Vector3, PerspectiveCamera } = THREE;

const renderer = new Renderer({
  container: "container",
  pixelated: true, // to maintain sharp edges
});

const camera1 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera1.position.set(300, 100, 300);

const camera2 = new PerspectiveCamera(
  FOV,
  window.innerWidth / window.innerHeight,
  1,
  20000
);
camera2.position.set(0, 50, 0);

const grid = new RealityGrid({ renderer, camera: camera1 });

let activeCamera = camera1;

let stats;
let water;
let pcBoat;
let enemyBoats = [];
let mouseWheelWatcher;
let controls;

function loadBoatModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath("assets/models/");
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/models/");
    objLoader.load("b.obj", (object) => {
      object.scale.set(0.05, 0.05, 0.05);
      object.position.set(0, 0, 0);
      object.rotation.set(0, 0, 0);

      // تعديل لون القارب إلى اللون الذهبي
      object.traverse((child) => {
        if (child.isMesh) {
          child.material.color.set(0xffa9000); // اللون الذهبي
        }
      });

      pcBoat.mesh = object;
      grid.add(pcBoat);
    });
  });
}

function loadDModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath("assets/models/");
  mtlLoader.load("boat.mtl", (materials) => {
    materials.preload();
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

function applyValues() {
  const weightInput = document.getElementById("weightInput").value;
  const submergedVolumeInput = document.getElementById(
    "submergedVolumeInput"
  ).value;
  const wave = document.getElementById("waveHeightInput").value;
  const wetArea = document.getElementById("wetAreaInput").value;

  pcBoat.mass = parseFloat(weightInput);
  pcBoat.submergedVolume = parseFloat(submergedVolumeInput);
  pcBoat.wave = parseFloat(wave);
  pcBoat.wetArea = parseFloat(wetArea);

  document.getElementById(
    "messageDisplay"
  ).textContent = `Values applied: Weight=${weightInput}, Submerged Volume=${submergedVolumeInput},wave height=${wave}`;
}

document.getElementById("weightInput").addEventListener("input", applyValues);
document
  .getElementById("submergedVolumeInput")
  .addEventListener("input", applyValues);
document.getElementById("wetAreaInput").addEventListener("input", applyValues);
document
  .getElementById("waveHeightInput")
  .addEventListener("input", applyValues);

function init() {
  // تهيئة الماء
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
    sunColor: 0xffdab99, // لون فاتح لغروب الشمس
    waterColor: 0x89cff0, // لون ماء أفتح يميل إلى الأزرق الفاتح
    distortionScale: 3.7,
    fog: grid.scene.fog !== undefined,
  });

  water.rotation.x = -Math.PI / 2;
  const waterEntity = new GridEntity({ mesh: water, wireframe: false });
  grid.add(waterEntity);
  const directionalLight = new THREE.DirectionalLight(0xffdab9, 1); // لون برتقالي فاتح
  directionalLight.position.set(50, 200, 100);

  const ambientLight = new THREE.AmbientLight(0xffe4b5); // لون وردي فاتح
  grid.scene.add(ambientLight);

  grid.scene.add(directionalLight);

  const sky = new GameSky(grid.scene, grid.renderer);
  grid.scene.add(sky);

  pcBoat = new Boat({
    color: 0xffffff,
    worldGrid: grid,
    gravity: new Vector3(0, -9.81, 0),
  });

  pcBoat.buoyancy = new Vector3(0, 5.18, 0);

  //loadDModel();
  loadBoatModel();

  stats = new Stats();
  renderer.container.appendChild(stats.dom);

  mouseWheelWatcher = new MouseWheelWatcher({ min: -400, max: 300 });

  controls = new OrbitControls(camera1, renderer.container);
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 500.0;
  controls.update();

  window.addEventListener("resize", onWindowResize);
  window.addEventListener("contextmenu", onRightClick);
}

function onWindowResize() {
  camera1.aspect = window.innerWidth / window.innerHeight;
  camera1.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onRightClick(event) {
  event.preventDefault();
  if (activeCamera === camera1) {
    activeCamera = camera1;
  } else {
    activeCamera = camera1;
  }
}

function handleBoatObstacleCollision(boat, obstacle) {
  boat.handleCollisionWithObstacle(obstacle);
}

function createObstacle(position, size) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
  const obstacle = new THREE.Mesh(geometry, material);
  obstacle.position.set(position.x, position.y, position.z);
  return obstacle;
}

const obstacles = [];
const obstaclePositions = [];

obstaclePositions.forEach((pos) => {
  const obstacle = createObstacle(pos, 50);
  grid.scene.add(obstacle);
  obstacles.push(obstacle);
});

grid.obstacles = obstacles;

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

function updateInfoPanel() {
  const speedDisplay = document.getElementById("speedDisplay");
  const accelerationDisplay = document.getElementById("accelerationDisplay");
  const rotationDisplay = document.getElementById("rotationDisplay");
  const sailAngleDisplay = document.getElementById("sailAngleDisplay"); // عنصر جديد

  const speed = pcBoat.velocity ? pcBoat.velocity.length() : 0;
  const acceleration = pcBoat.acceleration ? pcBoat.acceleration.length() : 0;
  const rotation = pcBoat.rotation ? pcBoat.rotation.y : 0;
  const sailAngle = pcBoat.sailAngle || 0;

  speedDisplay.textContent = speed.toFixed(2);
  accelerationDisplay.textContent = acceleration.toFixed(2);
  rotationDisplay.textContent = rotation.toFixed(2);
  sailAngleDisplay.textContent = sailAngle.toFixed(2); // عرض زاوية الشراع
}

let nowTime;
let t;

function animate() {
  const lastTimeNow = nowTime;
  // تحديث الوقت في الماء
  water.material.uniforms["time"].value += 1.0 / 60.0;
  nowTime = performance.now();
  t = lastTimeNow ? nowTime - lastTimeNow : 0.000001;
  t = t / 1000;

  if (keyIsDown(38)) pcBoat.throttleUp();
  if (keyIsDown(40)) pcBoat.throttleDown();
  const turnAmount = keyIsDown(37) - keyIsDown(39);

  pcBoat.turn(turnAmount);

  grid.update(t, nowTime);

  grid.render();
  checkCollisions();

  updateInfoPanel();

  camera2.position.copy(pcBoat.mesh.position).add(new Vector3(100, 300, -800));
  camera2.lookAt(pcBoat.mesh.position);

  requestAnimationFrame(animate);
  renderer.render(grid.scene, activeCamera);
}

init();
animate();
