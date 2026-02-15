/* ============================================================
 *  VFX SYSTEM — Particles, bubbles, gas, glow, liquid effects
 * ============================================================ */

// ──────────────────────────────────────────────────────────────
// COMPONENT: bubble-particles
// Spawns rising bubble particles inside a container
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('bubble-particles', {
  schema: {
    color: { type: 'color', default: '#ffffff' },
    count: { type: 'number', default: 20 },
    active: { type: 'boolean', default: false },
    duration: { type: 'number', default: 3000 }
  },

  init () {
    this.bubbles = [];
    this.el.addEventListener('spawn-bubbles', (e) => {
      this.spawn(e.detail.color, e.detail.duration);
    });
  },

  spawn (color, duration) {
    this.data.active = true;
    const count = this.data.count;

    for (let i = 0; i < count; i++) {
      const bubble = document.createElement('a-sphere');
      const size = 0.003 + Math.random() * 0.008;
      const x = (Math.random() - 0.5) * 0.06;
      const z = (Math.random() - 0.5) * 0.06;
      const delay = Math.random() * 1000;

      bubble.setAttribute('radius', size);
      bubble.setAttribute('material', `color: ${color || '#ffffff'}; opacity: 0.6; transparent: true`);
      bubble.setAttribute('position', `${x} 0 ${z}`);
      bubble.setAttribute('animation', {
        property: 'position',
        to: `${x} ${0.15 + Math.random() * 0.1} ${z}`,
        dur: 1500 + Math.random() * 1000,
        delay: delay,
        easing: 'easeOutQuad'
      });
      bubble.setAttribute('animation__fade', {
        property: 'material.opacity',
        to: 0,
        dur: 1500,
        delay: delay + 800,
        easing: 'easeInQuad'
      });

      this.el.appendChild(bubble);
      this.bubbles.push(bubble);
    }

    // Clean up after duration
    setTimeout(() => {
      this.cleanup();
    }, duration || this.data.duration);
  },

  cleanup () {
    this.bubbles.forEach(b => {
      if (b.parentNode) b.parentNode.removeChild(b);
    });
    this.bubbles = [];
    this.data.active = false;
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: gas-particles
// Spawns rising gas / smoke particles
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('gas-particles', {
  schema: {
    color: { type: 'color', default: '#dddddd' },
    active: { type: 'boolean', default: false }
  },

  init () {
    this.particles = [];
    this.el.addEventListener('spawn-gas', (e) => {
      this.spawn(e.detail.color, e.detail.duration);
    });
  },

  spawn (color, duration) {
    this.data.active = true;
    const count = 15;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-sphere');
      const size = 0.01 + Math.random() * 0.02;
      const x = (Math.random() - 0.5) * 0.1;
      const z = (Math.random() - 0.5) * 0.1;
      const delay = Math.random() * 2000;

      p.setAttribute('radius', size);
      p.setAttribute('material', `color: ${color || '#dddddd'}; opacity: 0.3; transparent: true`);
      p.setAttribute('position', `${x} 0.1 ${z}`);
      p.setAttribute('animation', {
        property: 'position',
        to: `${x + (Math.random() - 0.5) * 0.2} ${0.5 + Math.random() * 0.3} ${z + (Math.random() - 0.5) * 0.2}`,
        dur: 2000 + Math.random() * 2000,
        delay: delay,
        easing: 'easeOutQuad'
      });
      p.setAttribute('animation__scale', {
        property: 'scale',
        to: '2 2 2',
        dur: 2500,
        delay: delay,
        easing: 'easeOutQuad'
      });
      p.setAttribute('animation__fade', {
        property: 'material.opacity',
        to: 0,
        dur: 2000,
        delay: delay + 1000,
        easing: 'easeInQuad'
      });

      this.el.appendChild(p);
      this.particles.push(p);
    }

    setTimeout(() => this.cleanup(), duration || 4000);
  },

  cleanup () {
    this.particles.forEach(p => {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
    this.particles = [];
    this.data.active = false;
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: precipitate-effect
// Spawns settling particles at the bottom of a container
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('precipitate-effect', {
  init () {
    this.particles = [];
    this.el.addEventListener('spawn-precipitate', (e) => {
      this.spawn(e.detail.color, e.detail.duration);
    });
  },

  spawn (color, duration) {
    const count = 12;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('a-sphere');
      const size = 0.002 + Math.random() * 0.004;
      const x = (Math.random() - 0.5) * 0.05;
      const z = (Math.random() - 0.5) * 0.05;
      const startY = 0.05 + Math.random() * 0.08;
      const delay = Math.random() * 1500;

      p.setAttribute('radius', size);
      p.setAttribute('material', `color: ${color || '#ffffff'}; opacity: 0.9`);
      p.setAttribute('position', `${x} ${startY} ${z}`);
      p.setAttribute('animation', {
        property: 'position',
        to: `${x} ${-0.05 + Math.random() * 0.02} ${z}`,
        dur: 2000 + Math.random() * 1500,
        delay: delay,
        easing: 'easeInQuad'
      });

      this.el.appendChild(p);
      this.particles.push(p);
    }

    // Keep precipitate visible (don't clean up immediately)
    setTimeout(() => {
      // Fade slightly
      this.particles.forEach(p => {
        p.setAttribute('animation__fade', {
          property: 'material.opacity',
          to: 0.5,
          dur: 2000
        });
      });
    }, duration || 5000);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: heat-glow-effect
// Adds a glowing emissive effect to indicate heat
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('heat-glow', {
  init () {
    this.el.addEventListener('heat-glow', (e) => {
      this.applyGlow(e.detail.intensity);
    });
  },

  applyGlow (intensity) {
    // Create a glow sphere around the container
    const glow = document.createElement('a-sphere');
    glow.setAttribute('radius', 0.08);
    glow.setAttribute('material', `color: #ff4400; opacity: ${intensity * 0.3}; transparent: true; shader: flat`);
    glow.setAttribute('position', '0 0.05 0');
    glow.setAttribute('animation', {
      property: 'material.opacity',
      to: 0,
      dur: 4000,
      easing: 'easeInQuad'
    });
    glow.setAttribute('animation__scale', {
      property: 'scale',
      from: '1 1 1',
      to: '1.5 1.5 1.5',
      dur: 4000,
      easing: 'easeOutQuad'
    });

    this.el.appendChild(glow);

    setTimeout(() => {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
    }, 4500);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: pour-stream
// Visual stream of liquid while pouring
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('pour-stream', {
  init () {
    this.streamEl = null;

    this.el.addEventListener('pour-start', (e) => {
      this.startStream(e.detail.color);
    });
    this.el.addEventListener('pour-stop', () => {
      this.stopStream();
    });
  },

  startStream (color) {
    if (this.streamEl) return;

    this.streamEl = document.createElement('a-cylinder');
    this.streamEl.setAttribute('radius', 0.003);
    this.streamEl.setAttribute('height', 0.15);
    this.streamEl.setAttribute('material', `color: ${color || '#cceeff'}; opacity: 0.7; transparent: true`);
    this.streamEl.setAttribute('position', '0 -0.08 0.03');
    this.streamEl.setAttribute('animation', {
      property: 'material.opacity',
      from: 0.7,
      to: 0.4,
      dir: 'alternate',
      loop: true,
      dur: 200
    });

    this.el.appendChild(this.streamEl);
  },

  stopStream () {
    if (this.streamEl && this.streamEl.parentNode) {
      this.streamEl.parentNode.removeChild(this.streamEl);
    }
    this.streamEl = null;
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: flame-effect
// Animated flame for the Bunsen burner
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('flame-effect', {
  schema: {
    innerColor: { type: 'color', default: '#4488ff' },
    outerColor: { type: 'color', default: '#ff8800' },
    height: { type: 'number', default: 0.08 }
  },

  init () {
    // Outer flame
    const outer = document.createElement('a-cone');
    outer.setAttribute('radius-bottom', 0.015);
    outer.setAttribute('radius-top', 0);
    outer.setAttribute('height', this.data.height);
    outer.setAttribute('material', `color: ${this.data.outerColor}; shader: flat; opacity: 0.8; transparent: true`);
    outer.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '1.1 1.05 1.1',
      dir: 'alternate',
      loop: true,
      dur: 150,
      easing: 'easeInOutSine'
    });
    this.el.appendChild(outer);

    // Inner flame
    const inner = document.createElement('a-cone');
    inner.setAttribute('radius-bottom', 0.008);
    inner.setAttribute('radius-top', 0);
    inner.setAttribute('height', this.data.height * 0.7);
    inner.setAttribute('material', `color: ${this.data.innerColor}; shader: flat; opacity: 0.9; transparent: true`);
    inner.setAttribute('animation', {
      property: 'scale',
      from: '1 1 1',
      to: '0.9 1.08 0.9',
      dir: 'alternate',
      loop: true,
      dur: 120,
      easing: 'easeInOutSine'
    });
    inner.setAttribute('position', '0 0.005 0');
    this.el.appendChild(inner);

    // Point light
    const light = document.createElement('a-entity');
    light.setAttribute('light', 'type: point; color: #ff8844; intensity: 0.3; distance: 0.5');
    light.setAttribute('position', `0 ${this.data.height * 0.5} 0`);
    this.el.appendChild(light);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: sound-manager
// Centralized sound manager for lab sounds
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('sound-manager', {
  init () {
    this.el.sceneEl.addEventListener('play-sound', (e) => {
      // Use Web Audio API for simple beeps/clicks
      this.playTone(e.detail.sound);
    });

    this.el.sceneEl.addEventListener('play-reaction-sound', (e) => {
      this.playReactionSound(e.detail.type);
    });
  },

  playTone (type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'click':
          osc.frequency.value = 800;
          gain.gain.value = 0.1;
          osc.start();
          osc.stop(ctx.currentTime + 0.05);
          break;
        case 'burner-on':
          osc.frequency.value = 200;
          osc.type = 'sawtooth';
          gain.gain.value = 0.05;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.stop(ctx.currentTime + 0.5);
          break;
        case 'burner-off':
          osc.frequency.value = 150;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          break;
        default:
          osc.frequency.value = 440;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio not available
    }
  },

  playReactionSound (type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'neutralization':
          osc.type = 'sine';
          osc.frequency.value = 600;
          gain.gain.value = 0.1;
          osc.start();
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.8);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
          osc.stop(ctx.currentTime + 1.0);
          break;
        case 'single_displacement':
          // Fizzing sound
          const bufferSize = ctx.sampleRate * 1.5;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.05;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseGain = ctx.createGain();
          noise.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noiseGain.gain.value = 0.15;
          noise.start();
          noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
          noise.stop(ctx.currentTime + 1.5);
          break;
        case 'precipitation':
          osc.type = 'triangle';
          osc.frequency.value = 400;
          gain.gain.value = 0.08;
          osc.start();
          osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.5);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.stop(ctx.currentTime + 0.6);
          break;
        default:
          osc.frequency.value = 500;
          gain.gain.value = 0.05;
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio not available
    }
  }
});
