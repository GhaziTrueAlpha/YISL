/* ============================================================
 *  LAB COMPONENTS — A-Frame custom components
 *  Grabbable containers, liquid simulation, pouring, equipment
 * ============================================================ */

// ──────────────────────────────────────────────────────────────
// COMPONENT: lab-container
// Represents a beaker / test tube / flask that holds a chemical
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('lab-container', {
  schema: {
    chemicalId: { type: 'string', default: '' },
    volume: { type: 'number', default: 100 },      // mL
    maxVolume: { type: 'number', default: 150 },
    liquidLevel: { type: 'number', default: 0.7 },  // 0-1 fill
    containerType: { type: 'string', default: 'beaker' }, // beaker|testtube|flask|cylinder|dropper
    isPouring: { type: 'boolean', default: false }
  },

  init () {
    this.liquid = this.el.querySelector('.liquid');
    this.label = this.el.querySelector('.container-label');
    this.pourThreshold = 80;  // degrees tilt to pour
    this.pourCooldown = false;

    // Update liquid visual
    this.updateLiquid();

    // Listen for grab / release
    this.el.addEventListener('grab-start', () => this.onGrab());
    this.el.addEventListener('grab-end', () => this.onRelease());
  },

  tick () {
    if (!this.isGrabbed) return;

    // Check tilt angle for pouring
    const rotation = this.el.object3D.rotation;
    const tiltX = THREE.MathUtils.radToDeg(Math.abs(rotation.x));
    const tiltZ = THREE.MathUtils.radToDeg(Math.abs(rotation.z));
    const maxTilt = Math.max(tiltX, tiltZ);

    if (maxTilt > this.pourThreshold && !this.pourCooldown) {
      this.startPouring();
    } else if (maxTilt < this.pourThreshold - 10) {
      this.stopPouring();
    }
  },

  onGrab () {
    this.isGrabbed = true;

    // Show chemical info panel
    const chem = window.CHEMICALS[this.data.chemicalId];
    if (chem) {
      this.el.sceneEl.emit('show-chemical-info', {
        chemical: chem,
        containerId: this.el.id
      });
    }
  },

  onRelease () {
    this.isGrabbed = false;
    this.stopPouring();
  },

  startPouring () {
    if (this.data.liquidLevel <= 0 || this.pourCooldown) return;
    this.data.isPouring = true;
    this.pourCooldown = true;

    // Emit pour particles
    this.el.emit('pour-start', {
      chemicalId: this.data.chemicalId,
      color: window.CHEMICALS[this.data.chemicalId]?.color || '#ccc'
    });

    // Reduce liquid over time
    this.pourInterval = setInterval(() => {
      if (this.data.liquidLevel > 0) {
        this.data.liquidLevel = Math.max(0, this.data.liquidLevel - 0.05);
        this.updateLiquid();
      } else {
        this.stopPouring();
      }
    }, 200);
  },

  stopPouring () {
    this.data.isPouring = false;
    clearInterval(this.pourInterval);
    this.el.emit('pour-stop');

    // Cooldown
    setTimeout(() => { this.pourCooldown = false; }, 500);
  },

  /* ── Receive chemical from another container ── */
  receiveChemical (incomingChemId) {
    const myId = this.data.chemicalId;
    if (!myId || !incomingChemId) return;
    if (myId === incomingChemId) {
      // Same chemical — just increase volume
      this.data.liquidLevel = Math.min(1, this.data.liquidLevel + 0.2);
      this.updateLiquid();
      return;
    }

    // Attempt reaction
    const result = window.reactionEngine.performReaction(myId, incomingChemId);
    if (result.success) {
      this.applyReaction(result.reaction);
      this.el.sceneEl.emit('reaction-occurred', {
        reaction: result.reaction,
        points: result.pointsAwarded,
        score: result.currentScore,
        temperature: result.temperature,
        containerEl: this.el
      });
    } else {
      this.el.sceneEl.emit('no-reaction', {
        chemA: myId,
        chemB: incomingChemId
      });
    }
  },

  /* ── Visual feedback for a reaction ── */
  applyReaction (reaction) {
    // Color change
    if (this.liquid) {
      this.liquid.setAttribute('material', 'color', reaction.resultColor);
      this.liquid.setAttribute('material', 'opacity', 0.85);
    }

    // Effects
    if (reaction.effects.includes('bubbles')) {
      this.el.emit('spawn-bubbles', {
        color: reaction.resultColor,
        duration: 3000
      });
    }
    if (reaction.effects.includes('gas_generation')) {
      this.el.emit('spawn-gas', {
        color: '#eeeeee',
        duration: 4000
      });
    }
    if (reaction.effects.includes('precipitate')) {
      this.el.emit('spawn-precipitate', {
        color: reaction.precipitateColor || '#fff',
        duration: 5000
      });
    }
    if (reaction.effects.includes('temperature_increase')) {
      this.el.emit('heat-glow', { intensity: reaction.temperatureChange / 20 });
    }
    if (reaction.effects.includes('sound')) {
      this.el.sceneEl.emit('play-reaction-sound', { type: reaction.type });
    }
  },

  updateLiquid () {
    if (!this.liquid) return;
    const chem = window.CHEMICALS[this.data.chemicalId];
    if (chem) {
      this.liquid.setAttribute('material', 'color', chem.color);
    }
    // Scale the liquid plane/cylinder to match level
    const s = this.data.liquidLevel;
    this.liquid.setAttribute('scale', `1 ${Math.max(0.01, s)} 1`);
    this.liquid.setAttribute('position', `0 ${(s * 0.5) * 0.15 - 0.07} 0`);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: collision-checker
// Detects when a container overlaps another (for mixing)
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('collision-checker', {
  schema: {
    targetSelector: { type: 'string', default: '.lab-container' }
  },

  init () {
    this.targets = [];
    this.myPos = new THREE.Vector3();
    this.otherPos = new THREE.Vector3();
    this.mixCooldown = false;
  },

  tick () {
    if (this.mixCooldown) return;

    // Lazy-load targets
    if (this.targets.length === 0) {
      this.targets = Array.from(
        this.el.sceneEl.querySelectorAll(this.data.targetSelector)
      ).filter(el => el !== this.el);
    }

    this.el.object3D.getWorldPosition(this.myPos);

    for (const other of this.targets) {
      other.object3D.getWorldPosition(this.otherPos);
      const dist = this.myPos.distanceTo(this.otherPos);

      if (dist < 0.15) { // ~15 cm
        this.triggerMix(other);
        break;
      }
    }
  },

  triggerMix (otherEl) {
    this.mixCooldown = true;
    const myComp = this.el.components['lab-container'];
    const otherComp = otherEl.components['lab-container'];

    if (myComp && otherComp && myComp.data.isPouring) {
      otherComp.receiveChemical(myComp.data.chemicalId);
    } else if (myComp && otherComp && otherComp.data.isPouring) {
      myComp.receiveChemical(otherComp.data.chemicalId);
    }

    setTimeout(() => { this.mixCooldown = false; }, 2000);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: grabbable-object
// Makes any entity grabbable by VR controllers via raycaster
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('grabbable-object', {
  schema: {
    resetPosition: { type: 'vec3', default: { x: 0, y: 0, z: 0 } },
    physics: { type: 'boolean', default: true }
  },

  init () {
    this.isGrabbed = false;
    this.grabber = null;
    this.originalParent = this.el.parentNode;
    this.data.resetPosition = this.el.getAttribute('position') || { x: 0, y: 0, z: 0 };

    // Listen for controller grab events
    this.el.addEventListener('mousedown', (e) => this.onGrabStart(e));
    this.el.addEventListener('mouseup', (e) => this.onGrabEnd(e));
    this.el.addEventListener('click', (e) => this.onClick(e));

    // Hover highlight
    this.el.addEventListener('mouseenter', () => this.onHoverEnter());
    this.el.addEventListener('mouseleave', () => this.onHoverExit());

    // Store original emissive
    this.originalEmissive = null;
  },

  onHoverEnter () {
    const mesh = this.el.getObject3D('mesh');
    if (mesh) {
      mesh.traverse(child => {
        if (child.isMesh && child.material) {
          this.originalEmissive = child.material.emissive
            ? child.material.emissive.clone()
            : new THREE.Color(0x000000);
          child.material.emissive = new THREE.Color(0x333333);
        }
      });
    }
  },

  onHoverExit () {
    if (!this.isGrabbed) {
      const mesh = this.el.getObject3D('mesh');
      if (mesh) {
        mesh.traverse(child => {
          if (child.isMesh && child.material && child.material.emissive) {
            child.material.emissive.copy(this.originalEmissive || new THREE.Color(0x000000));
          }
        });
      }
    }
  },

  onGrabStart (e) {
    if (this.isGrabbed) return;
    this.isGrabbed = true;

    // Attach to controller
    const controller = e.detail?.cursorEl || e.target;
    if (controller && controller.object3D) {
      // Save world transform
      const worldPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(worldPos);

      // Re-parent
      this.grabber = controller;
    }

    this.el.emit('grab-start');
  },

  onGrabEnd () {
    if (!this.isGrabbed) return;
    this.isGrabbed = false;
    this.grabber = null;
    this.el.emit('grab-end');
    this.onHoverExit();
  },

  onClick () {
    this.el.emit('object-clicked');
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: bunsen-burner
// Interactive Bunsen burner with flame control
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('bunsen-burner', {
  schema: {
    isLit: { type: 'boolean', default: false },
    flameHeight: { type: 'number', default: 0.5 },
    temperature: { type: 'number', default: 25 }
  },

  init () {
    this.flame = this.el.querySelector('.flame');
    this.knob = this.el.querySelector('.burner-knob');

    this.el.addEventListener('click', () => this.toggle());
    if (this.knob) {
      this.knob.addEventListener('click', () => this.adjustFlame());
    }
    this.updateFlame();
  },

  toggle () {
    this.data.isLit = !this.data.isLit;
    this.updateFlame();

    if (this.data.isLit) {
      this.el.sceneEl.emit('play-sound', { sound: 'burner-on' });
      this.data.temperature = 300;
    } else {
      this.el.sceneEl.emit('play-sound', { sound: 'burner-off' });
      this.data.temperature = 25;
    }
  },

  adjustFlame () {
    if (!this.data.isLit) return;
    this.data.flameHeight = this.data.flameHeight >= 1.0 ? 0.2 : this.data.flameHeight + 0.2;
    this.data.temperature = 200 + this.data.flameHeight * 500;
    this.updateFlame();
  },

  updateFlame () {
    if (!this.flame) return;
    if (this.data.isLit) {
      this.flame.setAttribute('visible', true);
      this.flame.setAttribute('scale', `0.3 ${this.data.flameHeight} 0.3`);
      this.flame.setAttribute('animation', {
        property: 'scale',
        to: `0.35 ${this.data.flameHeight + 0.05} 0.35`,
        dir: 'alternate',
        loop: true,
        dur: 200,
        easing: 'easeInOutSine'
      });
    } else {
      this.flame.setAttribute('visible', false);
      this.flame.removeAttribute('animation');
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: weighing-scale
// Shows mass when an object is placed on it
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('weighing-scale', {
  schema: {
    currentMass: { type: 'number', default: 0 }
  },

  init () {
    this.display = this.el.querySelector('.scale-display');
    this.updateDisplay();
  },

  tick () {
    // Check for objects above the scale plate
    const plate = this.el.querySelector('.scale-plate');
    if (!plate) return;

    const platePos = new THREE.Vector3();
    plate.object3D.getWorldPosition(platePos);

    const containers = this.el.sceneEl.querySelectorAll('[lab-container]');
    let totalMass = 0;

    containers.forEach(c => {
      const cPos = new THREE.Vector3();
      c.object3D.getWorldPosition(cPos);
      if (cPos.distanceTo(platePos) < 0.2) {
        const comp = c.components['lab-container'];
        if (comp) {
          totalMass += comp.data.volume * comp.data.liquidLevel * 1.0; // rough g/mL
        }
      }
    });

    if (Math.abs(totalMass - this.data.currentMass) > 0.5) {
      this.data.currentMass = Math.round(totalMass * 10) / 10;
      this.updateDisplay();
    }
  },

  updateDisplay () {
    if (this.display) {
      this.display.setAttribute('text', `value: ${this.data.currentMass} g; color: #0f0; align: center`);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: thermometer
// Reads temperature from the reaction engine
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('thermometer-tool', {
  init () {
    this.display = this.el.querySelector('.thermo-display');
    this.mercury = this.el.querySelector('.mercury');
  },

  tick () {
    const temp = window.reactionEngine.temperature;
    if (this.display) {
      this.display.setAttribute('text', `value: ${temp}°C; color: #f00; align: center; width: 0.4`);
    }
    if (this.mercury) {
      const h = Math.min(1, Math.max(0.05, (temp - 0) / 300));
      this.mercury.setAttribute('scale', `1 ${h} 1`);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: ph-meter
// Simulates pH measurement
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('ph-meter', {
  init () {
    this.display = this.el.querySelector('.ph-display');
    this.currentPH = 7;
  },

  tick () {
    // Check proximity to containers
    const myPos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(myPos);

    const containers = this.el.sceneEl.querySelectorAll('[lab-container]');
    let closestDist = Infinity;
    let closestChem = null;

    containers.forEach(c => {
      const cPos = new THREE.Vector3();
      c.object3D.getWorldPosition(cPos);
      const d = myPos.distanceTo(cPos);
      if (d < 0.2 && d < closestDist) {
        closestDist = d;
        const comp = c.components['lab-container'];
        if (comp) closestChem = comp.data.chemicalId;
      }
    });

    if (closestChem) {
      const chem = window.CHEMICALS[closestChem];
      if (chem && chem.pH !== null) {
        this.currentPH = chem.pH;
      }
    }

    if (this.display) {
      let color = '#0f0';
      if (this.currentPH < 4) color = '#f00';
      else if (this.currentPH > 10) color = '#00f';
      this.display.setAttribute('text', `value: pH ${this.currentPH}; color: ${color}; align: center; width: 0.4`);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: lab-sink
// Running water faucet
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('lab-sink', {
  schema: {
    isRunning: { type: 'boolean', default: false }
  },

  init () {
    this.waterStream = this.el.querySelector('.water-stream');
    this.handle = this.el.querySelector('.faucet-handle');

    if (this.handle) {
      this.handle.addEventListener('click', () => this.toggle());
    }
    this.updateWater();
  },

  toggle () {
    this.data.isRunning = !this.data.isRunning;
    this.updateWater();
  },

  updateWater () {
    if (this.waterStream) {
      this.waterStream.setAttribute('visible', this.data.isRunning);
      if (this.data.isRunning) {
        this.waterStream.setAttribute('animation', {
          property: 'material.opacity',
          from: 0.5,
          to: 0.7,
          dir: 'alternate',
          loop: true,
          dur: 300
        });
      } else {
        this.waterStream.removeAttribute('animation');
      }
    }
  }
});
