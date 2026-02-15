/* ============================================================
 *  LOCOMOTION SYSTEM — Smooth movement, teleport, snap turn
 *  Designed for Meta Quest 3s controllers
 * ============================================================ */

// ──────────────────────────────────────────────────────────────
// COMPONENT: thumbstick-locomotion
// Smooth movement using left thumbstick, snap turn on right
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('thumbstick-locomotion', {
  schema: {
    speed: { type: 'number', default: 1.5 },       // m/s
    turnSpeed: { type: 'number', default: 45 },     // degrees per snap
    fly: { type: 'boolean', default: false },
    hand: { type: 'string', default: 'left' }       // which controller moves
  },

  init () {
    this.moveX = 0;
    this.moveY = 0;
    this.direction = new THREE.Vector3();
    this.rotation = new THREE.Euler();

    // Bind to thumbstick
    this.el.addEventListener('thumbstickmoved', (e) => {
      this.moveX = e.detail.x;
      this.moveY = e.detail.y;
    });
  },

  tick (t, dt) {
    if (Math.abs(this.moveX) < 0.1 && Math.abs(this.moveY) < 0.1) return;

    const dtSec = dt / 1000;
    const rig = this.el.sceneEl.querySelector('#camera-rig') || this.el.sceneEl.querySelector('[camera]').parentNode;
    if (!rig) return;

    if (this.data.hand === 'left') {
      // Movement
      const camera = this.el.sceneEl.camera;
      if (!camera) return;

      // Get camera forward direction
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);

      if (!this.data.fly) {
        cameraDir.y = 0;
        cameraDir.normalize();
      }

      // Strafe direction
      const strafeDir = new THREE.Vector3();
      strafeDir.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();

      // Combine
      this.direction.set(0, 0, 0);
      this.direction.addScaledVector(cameraDir, -this.moveY * this.data.speed * dtSec);
      this.direction.addScaledVector(strafeDir, this.moveX * this.data.speed * dtSec);

      // Apply to rig
      const pos = rig.getAttribute('position');
      rig.setAttribute('position', {
        x: pos.x + this.direction.x,
        y: pos.y + this.direction.y,
        z: pos.z + this.direction.z
      });
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: snap-turn
// Snap turn on right thumbstick horizontal axis
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('snap-turn', {
  schema: {
    turnAngle: { type: 'number', default: 45 },
    hand: { type: 'string', default: 'right' }
  },

  init () {
    this.canTurn = true;

    this.el.addEventListener('thumbstickmoved', (e) => {
      if (!this.canTurn) return;

      if (e.detail.x > 0.7) {
        this.turn(-this.data.turnAngle);
        this.canTurn = false;
      } else if (e.detail.x < -0.7) {
        this.turn(this.data.turnAngle);
        this.canTurn = false;
      }
    });

    this.el.addEventListener('thumbstickmoved', (e) => {
      if (Math.abs(e.detail.x) < 0.3) {
        this.canTurn = true;
      }
    });
  },

  turn (angle) {
    const rig = this.el.sceneEl.querySelector('#camera-rig');
    if (!rig) return;

    const rot = rig.getAttribute('rotation');
    rig.setAttribute('rotation', {
      x: rot.x,
      y: rot.y + angle,
      z: rot.z
    });
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: teleport-controls
// Point-and-click teleportation using controller button
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('teleport-locomotion', {
  schema: {
    button: { type: 'string', default: 'abuttondown' }, // A or X button
    maxDistance: { type: 'number', default: 10 },
    curveColor: { type: 'color', default: '#00ffcc' }
  },

  init () {
    this.isAiming = false;
    this.targetPos = new THREE.Vector3();
    this.raycaster = new THREE.Raycaster();
    this.aimLine = null;
    this.targetMarker = null;

    // Create aiming line
    this.createAimVisuals();

    // Bind
    this.el.addEventListener('abuttondown', () => this.startAim());
    this.el.addEventListener('xbuttondown', () => this.startAim());
    this.el.addEventListener('abuttonup', () => this.doTeleport());
    this.el.addEventListener('xbuttonup', () => this.doTeleport());
  },

  createAimVisuals () {
    // Target marker on floor
    this.targetMarker = document.createElement('a-ring');
    this.targetMarker.setAttribute('radius-inner', 0.15);
    this.targetMarker.setAttribute('radius-outer', 0.25);
    this.targetMarker.setAttribute('material', 'color: #00ffcc; opacity: 0.6; transparent: true; shader: flat; side: double');
    this.targetMarker.setAttribute('rotation', '-90 0 0');
    this.targetMarker.setAttribute('visible', false);
    this.targetMarker.setAttribute('animation', {
      property: 'rotation',
      from: '-90 0 0',
      to: '-90 360 0',
      loop: true,
      dur: 3000,
      easing: 'linear'
    });
    this.el.sceneEl.appendChild(this.targetMarker);

    // Aim line
    this.aimLine = document.createElement('a-entity');
    this.aimLine.setAttribute('line', 'start: 0 0 0; end: 0 0 -5; color: #00ffcc; opacity: 0.5');
    this.aimLine.setAttribute('visible', false);
    this.el.appendChild(this.aimLine);
  },

  startAim () {
    this.isAiming = true;
    if (this.aimLine) this.aimLine.setAttribute('visible', true);
    if (this.targetMarker) this.targetMarker.setAttribute('visible', true);
  },

  doTeleport () {
    if (!this.isAiming) return;
    this.isAiming = false;
    if (this.aimLine) this.aimLine.setAttribute('visible', false);
    if (this.targetMarker) this.targetMarker.setAttribute('visible', false);

    // Find floor intersection
    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3(0, 0, -1);
    this.el.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldDirection(controllerDir);
    controllerDir.negate();

    this.raycaster.set(controllerPos, controllerDir);
    this.raycaster.far = this.data.maxDistance;

    const floor = this.el.sceneEl.querySelector('#floor');
    if (!floor || !floor.object3D) return;

    const intersects = this.raycaster.intersectObject(floor.object3D, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const rig = this.el.sceneEl.querySelector('#camera-rig');
      if (rig) {
        rig.setAttribute('position', {
          x: point.x,
          y: 0,
          z: point.z
        });
      }
    }
  },

  tick () {
    if (!this.isAiming) return;

    // Update target marker position
    const controllerPos = new THREE.Vector3();
    const controllerDir = new THREE.Vector3(0, 0, -1);
    this.el.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldDirection(controllerDir);
    controllerDir.negate();

    this.raycaster.set(controllerPos, controllerDir);
    this.raycaster.far = this.data.maxDistance;

    const floor = this.el.sceneEl.querySelector('#floor');
    if (!floor || !floor.object3D) return;

    const intersects = this.raycaster.intersectObject(floor.object3D, true);
    if (intersects.length > 0 && this.targetMarker) {
      const point = intersects[0].point;
      this.targetMarker.setAttribute('position', `${point.x} ${point.y + 0.01} ${point.z}`);

      // Update aim line
      if (this.aimLine) {
        const localEnd = this.el.object3D.worldToLocal(point.clone());
        this.aimLine.setAttribute('line', `start: 0 0 0; end: ${localEnd.x} ${localEnd.y} ${localEnd.z}; color: #00ffcc; opacity: 0.5`);
      }
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: vr-hand-grab
// Grip-button based grabbing for VR controllers
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('vr-hand-grab', {
  schema: {
    hand: { type: 'string', default: 'right' }
  },

  init () {
    this.grabbedEl = null;
    this.grabOffset = new THREE.Vector3();

    this.el.addEventListener('gripdown', () => this.tryGrab());
    this.el.addEventListener('gripup', () => this.release());
    this.el.addEventListener('triggerdown', () => this.tryGrab());
    this.el.addEventListener('triggerup', () => this.release());
  },

  tryGrab () {
    if (this.grabbedEl) return;

    const controllerPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(controllerPos);

    // Find closest grabbable
    const grabbables = this.el.sceneEl.querySelectorAll('[grabbable-object]');
    let closest = null;
    let closestDist = 0.3; // 30cm grab radius

    grabbables.forEach(g => {
      const gPos = new THREE.Vector3();
      g.object3D.getWorldPosition(gPos);
      const d = controllerPos.distanceTo(gPos);
      if (d < closestDist) {
        closestDist = d;
        closest = g;
      }
    });

    if (closest) {
      this.grabbedEl = closest;
      // Save offset
      const objPos = new THREE.Vector3();
      closest.object3D.getWorldPosition(objPos);
      this.grabOffset.subVectors(objPos, controllerPos);

      closest.emit('grab-start');
      closest.setAttribute('data-grabbed', 'true');
    }
  },

  release () {
    if (this.grabbedEl) {
      this.grabbedEl.emit('grab-end');
      this.grabbedEl.removeAttribute('data-grabbed');
      this.grabbedEl = null;
    }
  },

  tick () {
    if (!this.grabbedEl) return;

    const controllerPos = new THREE.Vector3();
    const controllerQuat = new THREE.Quaternion();
    this.el.object3D.getWorldPosition(controllerPos);
    this.el.object3D.getWorldQuaternion(controllerQuat);

    // Move grabbed object to follow controller
    const newPos = controllerPos.clone().add(this.grabOffset);

    // Convert to parent local space
    const parent = this.grabbedEl.parentNode;
    if (parent && parent.object3D) {
      parent.object3D.worldToLocal(newPos);
    }

    this.grabbedEl.setAttribute('position', `${newPos.x} ${newPos.y} ${newPos.z}`);

    // Apply rotation
    const euler = new THREE.Euler().setFromQuaternion(controllerQuat);
    this.grabbedEl.object3D.rotation.copy(euler);
  }
});
