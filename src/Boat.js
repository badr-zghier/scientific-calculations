import Grid from "./Grid.js";
import Cooldown from "./Cooldown.js";
import * as THREE from "three";

const THROTTLE_UP_PER = 1;
const THROTTLE_ACC_SCALE = 0.5;

class Boat extends Grid {
  constructor(options = {}) {
    // Extract color from options
    const color = options.color;

    // Create the boat's geometry (a simple box shape)
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create the boat's material with specified roughness and color
    const material = new THREE.MeshStandardMaterial({ roughness: 0.9, color });

    // Combine the geometry and material into a mesh (the visible 3D object)
    const mesh = new THREE.Mesh(geometry, material);

    // Assign the created mesh to the options object so it can be used by the parent class
    options.mesh = mesh;

    // Call the parent class (Grid) constructor with the options object
    super(options);

    // Initialize the boat's velocity vector (for linear movement)
    this.velocity = new THREE.Vector3();

    // Initialize the boat's acceleration vector (for linear acceleration)
    this.acceleration = new THREE.Vector3();

    // Initialize the boat's angular velocity vector (for rotational movement)
    this.angularVelocity = new THREE.Vector3();

    // Initialize the boat's angular acceleration vector (for rotational acceleration)
    this.angularAcceleration = new THREE.Vector3();

    // Rotate the boat 180 degrees around the Y-axis (likely to face west)
    this.mesh.rotation.y = Math.PI; // 180 degrees clockwise (west) if Y-axis is the rotation axis

    // Initialize the bobbing motion parameters with a random starting point
    this.bob = { t: Math.random() * 999, y: 0 };

    // Initialize the throttle, which controls the boat's speed
    this.throttle = 0;

    // Set the rate at which the throttle increases
    this.throttleSpeed = 1;

    // Set the maximum throttle value (speed limit)
    this.maxThrottle = 0.1;

    // Initialize a cooldown timer for the throttle, preventing immediate reactivation
    this.throttleCooldown = new Cooldown(0, 0.3);

    // Reference to the world grid, possibly for collision detection or spatial awareness
    this.worldGrid = options.worldGrid;

    // Set the water level, which could be used for buoyancy calculations
    this.waterLevel = options.waterLevel || 0;

    // Flag to indicate whether the boat is sinking
    this.isSinking = false;

    // Initialize the sail angle, which might affect the boat's movement in the wind
    this.sailAngle = 0;

    // Set the mass of the boat, important for physics calculations like inertia
    this.mass = options.mass || 1;

    // Set the volume of the boat that is submerged, important for buoyancy
    this.submergedVolume = options.submergedVolume || 1;

    // Set the wet area of the boat, which could be used to calculate drag in the water
    this.wetArea = options.wetArea || 1;
  }

  // gravity force
  calculateGravityForce() {
    return this.mass * 9.8;
  }
  // Byoyant force
  calculateBuoyantForce() {
    const densityOfWater = 1000;
    return densityOfWater * this.submergedVolume * 9.8;
  }

  // Method to increase the throttle value, which controls the speed of the vehicle
  throttleUp() {
    // If the throttle is on cooldown (i.e., recently adjusted), do nothing
    if (this.throttleCooldown.isHot()) return;

    // Increase the throttle value, ensuring it doesn't exceed the maximum throttle limit
    this.throttle = Math.min(this.maxThrottle, this.throttle + THROTTLE_UP_PER);

    // Activate the cooldown to prevent immediate further adjustments
    this.throttleCooldown.heat();
  }

  // Method to decrease the throttle value, reducing the speed of the vehicle
  throttleDown() {
    // If the throttle is on cooldown, do nothing
    if (this.throttleCooldown.isHot()) return;

    // Decrease the throttle value, ensuring it doesn't drop below 0 (no reverse throttle)
    this.throttle = Math.max(0, this.throttle - 1);

    // Activate the cooldown to prevent immediate further adjustments
    this.throttleCooldown.heat();
  }

  // Method to apply the current throttle value to the velocity of the vehicle
  applyThrottleVelocity() {
    // Get the direction the vehicle is currently facing as a 2D vector
    const directionVec2 = this.getFacingVector2();

    // Convert the 2D direction vector into a 3D vector, assuming Y-axis (up) remains 0
    const throttleDirectionVec3 = new THREE.Vector3(
      directionVec2.y, // Z-axis component in 3D space
      0, // Y-axis component (up/down) remains 0, assuming no vertical movement
      directionVec2.x // X-axis component in 3D space
    );

    // Calculate the throttle's effect on acceleration, scaled by a constant
    const throttleScale = this.throttle * THROTTLE_ACC_SCALE;
    const throttleAcceleration =
      throttleDirectionVec3.multiplyScalar(throttleScale);

    // Apply the calculated throttle acceleration to the vehicle's acceleration
    this.applyAcceleration(throttleAcceleration);

    // Update the object's acceleration property to reflect the new throttle acceleration
    this.acceleration.copy(throttleAcceleration);
  }

  updateBob(t) {
    const waveHeight = parseFloat(
      document.getElementById("waveHeightInput").value
    );

    this.bob.t += t * 1;
    this.bob.y = (Math.sin(this.bob.t) * waveHeight) / 8;
    const y = this.position.y + this.bob.y;
    const newPos = this.position.clone().setY(y);
    this.setPosition(newPos);
  }

  turn(turnAmount) {
    this.updateSailAngle(); // تحديث زاوية الشراع
    const angAcc = new THREE.Vector3(0, turnAmount * 0.02, 0);
    this.applyAngularAcceleration(angAcc);
  }

  updateSailAngle() {
    // معادلة لتحديث زاوية الشراع بناءً على زاوية دوران القارب
    this.sailAngle = this.rotation.y / 2;
  }
  calculateKineticEnergy() {
    const speed = this.velocity.length();
    const mass = this.mass;
    const kineticEnergy = 0.5 * mass * speed * speed;
    return kineticEnergy;
  }

  claculateWindForce() {
    const windSpeed =
      parseFloat(document.getElementById("windSpeedInput").value) || 5;
    const sailArea =
      parseFloat(document.getElementById("sailAreaInput").value) || 10;
    const airDensity = 1.225;
    const efficiency = 0.5;
    const dynamicPressure = 0.5 * airDensity * windSpeed * windSpeed;
    const thrustForce = efficiency * dynamicPressure * sailArea;
    return thrustForce;
  }

  calculateWindTorque() {
    const windDirection = this.getWindDirection();
    const windSpeed = parseFloat(
      document.getElementById("windSpeedInput").value
    );

    // تقدير قوة الرياح
    const windForce = windSpeed * 10; // افتراض أن قوة الرياح تتناسب مع سرعة الرياح

    const distanceFromCenter = 1; // المسافة من محور التدوير إلى مكان تطبيق القوة

    // حساب العزم الناتج عن الرياح
    const windTorque = windForce * distanceFromCenter;
    return windTorque;
  }

  // Boat Momentum
  calculateMomentum() {
    return this.mass * this.velocity.length();
  }

  calculateDragForce() {
    const dragCoefficient = 0.47; // معامل السحب
    const densityOfWater = 1000; // كثافة الماء (كجم/م³)
    const velocitySquared = this.velocity.lengthSq();

    // التأكد من أن السرعة ليست صفر لتجنب القسمة على صفر
    if (velocitySquared === 0) return 0;

    return (
      0.5 * dragCoefficient * densityOfWater * this.wetArea * velocitySquared
    );
  }

  calculateWaterMomentumAndKineticEnergy() {
    const waterSpeed = parseFloat(
      document.getElementById("waterSpeedInput").value
    );
    const waterMass = this.mass; // كتلة الماء تساوي كتلة ابلقار

    // حساب كمية الحركة
    const waterMomentum = waterMass * waterSpeed;

    // حساب الطاقة الحركية
    const waterKineticEnergy = 0.5 * waterMass * waterSpeed * waterSpeed;

    return { waterMomentum, waterKineticEnergy };
  }

  calculateElasticCollisionVelocity() {
    const waterSpeed = parseFloat(
      document.getElementById("waterSpeedInput").value
    );
    const waterMass = this.mass; // كتلة الماء تساوي كتلة القارب
    const boatMass = this.mass;

    // حفظ كمية الحركة
    const totalMomentum =
      waterMass * waterSpeed + boatMass * this.velocity.length();

    // حفظ الطاقة الحركية
    const totalKineticEnergy =
      0.5 * waterMass * waterSpeed * waterSpeed +
      0.5 * boatMass * this.velocity.length() * this.velocity.length();

    // حساب السرعة بعد التصادم
    const velocityAfterCollision = totalMomentum / (waterMass + boatMass);

    // تحديث سرعة القارب بناءً على هذا الحساب
    this.velocity.setLength(velocityAfterCollision);

    return velocityAfterCollision;
  }

  getCompassDirection() {
    // الاتجاه الحالي هو زاوية الدوران Y للقارب، يمكنك تحويله إلى درجات
    const angleInRadians = this.mesh.rotation.y;
    const angleInDegrees = THREE.MathUtils.radToDeg(angleInRadians);

    // تصحيح زاوية البداية: القارب موجه غرباً في البداية
    const correctedAngle = (angleInDegrees + 270) % 360;

    // حساب الاتجاهات بناءً على الزاوية المصححة
    if (correctedAngle >= 315 || correctedAngle < 45) return "S"; // غرب
    if (correctedAngle >= 45 && correctedAngle < 135) return "E"; // شمال
    if (correctedAngle >= 135 && correctedAngle < 225) return "N"; // شرق
    return "W"; // جنوب
  }

  updateCompass() {
    const compassNeedle = document.querySelector("#compass .needle");
    const direction = this.getCompassDirection();
    const angleInRadians = this.mesh.rotation.y;
    const angleInDegrees = THREE.MathUtils.radToDeg(angleInRadians);

    // تصحيح زاوية البداية: القارب موجه غرباً في البداية
    const correctedAngle = (angleInDegrees + 270) % 360;

    compassNeedle.style.transform = `rotate(${correctedAngle}deg)`;

    const compassDirectionDisplay = document.getElementById(
      "compassDirectionDisplay"
    );
    compassDirectionDisplay.innerText = direction;
  }

  updateInfoPanel(buoyantForce, gravityForce, waveForce) {
    document.getElementById("speedDisplay").innerText = this.velocity
      .length()
      .toFixed(2);
    document.getElementById("accelerationDisplay").innerText = this.acceleration
      .length()
      .toFixed(2);
    document.getElementById("rotationDisplay").innerText =
      this.rotation.y.toFixed(2);
    document.getElementById("buoyantForceDisplay").innerText =
      buoyantForce.toFixed(2);
    document.getElementById("gravityForceDisplay").innerText =
      gravityForce.toFixed(2);
    document.getElementById("waveForceDisplay").innerText =
      waveForce.toFixed(2);
    document.getElementById("momentumDisplay").innerText =
      this.calculateMomentum().toFixed(2);
    document.getElementById("angularSpeedDisplay").innerText =
      this.angularVelocity.length().toFixed(2);

    // عرض الطاقة الحركية على الشاشة
    const kineticEnergy = this.calculateKineticEnergy();
    document.getElementById("kineticEnergyDisplay").innerText =
      kineticEnergy.toFixed(2);

    // حساب العزم الناتج عن الرياح وعرضه على الشاشة
    const windTorque = this.calculateWindTorque();
    document.getElementById("windTorqueDisplay").innerText =
      windTorque.toFixed(2);

    // عرض قوة الدفع على الشاشة
    const thrustForce = this.calculateDragForce() + this.claculateWindForce();
    document.getElementById("thrustForceDisplay").innerText =
      thrustForce.toFixed(2);

    // عرض قوة السحب على الشاشة
    const dragForce = this.calculateDragForce();
    document.getElementById("dragForceDisplay").innerText =
      dragForce.toFixed(2);

    // حساب وعرض كمية الحركة والطاقة الحركية للماء
    const { waterMomentum, waterKineticEnergy } =
      this.calculateWaterMomentumAndKineticEnergy();
    document.getElementById("waterMomentumDisplay").innerText =
      waterMomentum.toFixed(2);
    document.getElementById("waterKineticEnergyDisplay").innerText =
      waterKineticEnergy.toFixed(2);

    document.getElementById("momentumDisplay").innerText =
      waterMomentum.toFixed(2);
    document.getElementById("kineticEnergyDisplay").innerText =
      waterKineticEnergy.toFixed(2) + " (J)";

    // تحديث البوصلة
    this.updateCompass();
    // تحديث عداد السرعة
    this.updateSpeedometer(this.velocity.length());
    // عرض اتجاه البوصلة
    document.getElementById("compassDirectionDisplay").innerText =
      this.getCompassDirection();
  }

  // الحصول على اتجاه الرياح المدخلة من قبل المستخدم
  getWindDirection() {
    return document.getElementById("windDirectionInput").value;
  }

  // تحديث سرعة القارب بناءً على اتجاه الرياح
  adjustSpeedBasedOnWind() {
    const windDirection = this.getWindDirection();
    const boatDirection = this.getCompassDirection();

    let windSpeed = parseFloat(document.getElementById("windSpeedInput").value);
    if (windSpeed <= 0) return;

    const directions = ["N", "E", "S", "W"];
    const windIndex = directions.indexOf(windDirection.charAt(0).toUpperCase());
    const boatIndex = directions.indexOf(boatDirection.charAt(0).toUpperCase());

    if (windIndex === boatIndex) {
      this.velocity.add(
        this.velocity
          .clone()
          .normalize()
          .multiplyScalar(windSpeed / 20)
      );
    } else {
      // الرياح في اتجاه معاكس، اطرح سرعة الرياح
      this.velocity.add(
        this.velocity
          .clone()
          .normalize()
          .multiplyScalar(-windSpeed / 20)
      );
    }
  }

  updateSpeedometer(speed) {
    const speedNumber = document.getElementById("speedNumber");
    speedNumber.innerText = speed.toFixed(2);

    const needle = document.querySelector("#speedometer .needle");
    const maxSpeed = 200; // افتراض أن أقصى سرعة هي 200 م/ث
    const angle = (speed / maxSpeed) * 180; // تحويل السرعة إلى زاوية (180 درجة)
    needle.style.transform = `rotate(${angle - 90}deg)`; // -90 لتبدأ من الأسفل
  }

  update(t, now) {
    const buoyantForce = this.calculateBuoyantForce();
    const gravityForce = this.calculateGravityForce();
    const waveHeight = parseFloat(
      document.getElementById("waveHeightInput").value
    );
    const densityOfWater = 1000;
    const waveForce = densityOfWater * 9.8 * waveHeight;

    let netVerticalForce = buoyantForce - gravityForce - waveForce;

    if (gravityForce > buoyantForce) {
      this.isSinking = true;
      this.velocity.y -= 0.5;
    } else {
      this.isSinking = false;
    }

    if (this.position.y >= this.waterLevel && netVerticalForce > 0) {
      netVerticalForce = 0;
      this.velocity.y = 0;
    }

    if (this.worldGrid) {
      this.worldGrid.children.forEach((child) => {
        if (child !== this && child instanceof Boat) {
          this.handleCollision(child);
        }
      });
    }

    const dragForce = this.calculateDragForce();
    this.applyForce(
      new THREE.Vector3(
        (-dragForce * this.velocity.x) / this.velocity.length(),
        0,
        (-dragForce * this.velocity.z) / this.velocity.length()
      )
    );

    this.applyForce(new THREE.Vector3(0, netVerticalForce, 0));

    this.velocity.add(this.acceleration.clone().multiplyScalar(t));
    this.throttleSpeed = this.throttle;
    if (this.throttle) this.applyThrottleVelocity();

    // إضافة قوة الدفع إلى السرعة
    const thrustForce = this.claculateWindForce();
    this.velocity.add(
      this.velocity
        .clone()
        .normalize()
        .multiplyScalar(thrustForce * t)
    );

    this.updatePhysics(t);
    this.applyAngularFriction(0.02);
    this.updateBob(t);
    this.updateChildren(t, now);
    this.throttleCooldown.cool(t);

    this.updateInfoPanel(buoyantForce, gravityForce, waveForce);

    this.adjustSpeedBasedOnWind();
  }
}

export default Boat;
