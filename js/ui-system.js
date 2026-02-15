/* ============================================================
 *  UI SYSTEM — VR-friendly floating panels, HUD, mode controls
 * ============================================================ */

// ──────────────────────────────────────────────────────────────
// COMPONENT: vr-panel
// Generic floating VR panel that can follow the camera
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('vr-panel', {
  schema: {
    title: { type: 'string', default: 'Panel' },
    width: { type: 'number', default: 0.8 },
    height: { type: 'number', default: 0.5 },
    followCamera: { type: 'boolean', default: false },
    visible: { type: 'boolean', default: true },
    bgColor: { type: 'color', default: '#1a1a2e' },
    textColor: { type: 'color', default: '#ffffff' }
  },

  init () {
    if (!this.data.visible) {
      this.el.setAttribute('visible', false);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: reaction-info-panel
// Shows reaction details when a reaction occurs
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('reaction-info-panel', {
  init () {
    this.titleText = this.el.querySelector('.panel-title');
    this.equationText = this.el.querySelector('.panel-equation');
    this.explanationText = this.el.querySelector('.panel-explanation');
    this.typeText = this.el.querySelector('.panel-type');
    this.safetyText = this.el.querySelector('.panel-safety');

    this.el.setAttribute('visible', false);
    this.hideTimeout = null;

    // Listen for reactions
    this.el.sceneEl.addEventListener('reaction-occurred', (e) => {
      this.showReaction(e.detail);
    });

    this.el.sceneEl.addEventListener('no-reaction', () => {
      this.showNoReaction();
    });
  },

  showReaction (detail) {
    const r = detail.reaction;
    this.el.setAttribute('visible', true);

    if (this.titleText) {
      this.titleText.setAttribute('text', `value: ${r.title}; color: #00ffcc; align: center; width: 1.4; wrapCount: 30`);
    }
    if (this.equationText) {
      this.equationText.setAttribute('text', `value: ${r.equation}; color: #ffff00; align: center; width: 1.4; wrapCount: 40`);
    }
    if (this.explanationText) {
      this.explanationText.setAttribute('text', `value: ${r.explanation}; color: #ffffff; align: center; width: 1.4; wrapCount: 50`);
    }
    if (this.typeText) {
      this.typeText.setAttribute('text', `value: Type: ${r.type.replace('_', ' ')}; color: #aaaaff; align: center; width: 1.4`);
    }
    if (this.safetyText) {
      this.safetyText.setAttribute('text', `value: ⚠ ${r.safetyNote}; color: #ff6644; align: center; width: 1.4; wrapCount: 40`);
    }

    // Auto-hide after 12 seconds
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.el.setAttribute('visible', false);
    }, 12000);
  },

  showNoReaction () {
    this.el.setAttribute('visible', true);

    if (this.titleText) {
      this.titleText.setAttribute('text', `value: No Reaction; color: #ff8800; align: center; width: 1.4`);
    }
    if (this.equationText) {
      this.equationText.setAttribute('text', `value: These chemicals do not react.; color: #cccccc; align: center; width: 1.4`);
    }
    if (this.explanationText) {
      this.explanationText.setAttribute('text', `value: Try a different combination!; color: #ffffff; align: center; width: 1.4`);
    }
    if (this.typeText) this.typeText.setAttribute('text', 'value: ');
    if (this.safetyText) this.safetyText.setAttribute('text', 'value: ');

    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.el.setAttribute('visible', false);
    }, 5000);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: chemical-info-panel
// Shows chemical details when a container is picked up
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('chemical-info-panel', {
  init () {
    this.nameText = this.el.querySelector('.chem-name');
    this.formulaText = this.el.querySelector('.chem-formula');
    this.typeText = this.el.querySelector('.chem-type');
    this.descText = this.el.querySelector('.chem-desc');
    this.hazardText = this.el.querySelector('.chem-hazard');

    this.el.setAttribute('visible', false);

    this.el.sceneEl.addEventListener('show-chemical-info', (e) => {
      this.show(e.detail.chemical);
    });
  },

  show (chem) {
    this.el.setAttribute('visible', true);

    if (this.nameText) {
      this.nameText.setAttribute('text', `value: ${chem.name}; color: #00ffcc; align: center; width: 1.2; wrapCount: 30`);
    }
    if (this.formulaText) {
      this.formulaText.setAttribute('text', `value: Formula: ${chem.formula}; color: #ffff00; align: center; width: 1.2`);
    }
    if (this.typeText) {
      this.typeText.setAttribute('text', `value: Type: ${chem.type}; color: #aaaaff; align: center; width: 1.2`);
    }
    if (this.descText) {
      this.descText.setAttribute('text', `value: ${chem.description}; color: #ffffff; align: center; width: 1.2; wrapCount: 45`);
    }
    if (this.hazardText) {
      const stars = '⚠'.repeat(chem.hazardLevel);
      this.hazardText.setAttribute('text', `value: Hazard: ${stars} ${chem.hazard}; color: #ff4444; align: center; width: 1.2`);
    }

    // Auto-hide
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this.el.setAttribute('visible', false);
    }, 8000);
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: score-panel
// Displays score and reaction log
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('score-panel', {
  init () {
    this.scoreText = this.el.querySelector('.score-value');
    this.tempText = this.el.querySelector('.temp-value');
    this.modeText = this.el.querySelector('.mode-value');
    this.logText = this.el.querySelector('.log-value');

    this.el.sceneEl.addEventListener('reaction-occurred', () => this.updatePanel());
    this.updatePanel();
  },

  tick () {
    // Update every second (throttle)
    if (!this._lastUpdate || Date.now() - this._lastUpdate > 1000) {
      this._lastUpdate = Date.now();
      this.updatePanel();
    }
  },

  updatePanel () {
    const eng = window.reactionEngine;

    if (this.scoreText) {
      this.scoreText.setAttribute('text', `value: Score: ${eng.score}; color: #00ff88; align: center; width: 1.0`);
    }
    if (this.tempText) {
      this.tempText.setAttribute('text', `value: Temp: ${eng.temperature}°C; color: #ff8844; align: center; width: 1.0`);
    }
    if (this.modeText) {
      const modeLabel = eng.mode === 'guided' ? 'Guided Mode' : 'Free Experiment';
      this.modeText.setAttribute('text', `value: ${modeLabel}; color: #44aaff; align: center; width: 1.0`);
    }
    if (this.logText) {
      const lastReactions = eng.reactionLog.slice(-3).map(l =>
        `${l.time}: ${l.equation}`
      ).join('\n');
      this.logText.setAttribute('text', `value: ${lastReactions || 'No reactions yet.'}; color: #cccccc; align: center; width: 1.0; wrapCount: 50`);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: guided-panel
// Shows guided mode instructions
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('guided-panel', {
  init () {
    this.titleText = this.el.querySelector('.guided-title');
    this.objectiveText = this.el.querySelector('.guided-objective');
    this.stepsText = this.el.querySelector('.guided-steps');
    this.progressText = this.el.querySelector('.guided-progress');

    this.el.sceneEl.addEventListener('reaction-occurred', (e) => {
      this.checkCompletion(e.detail);
    });

    this.el.sceneEl.addEventListener('mode-changed', (e) => {
      if (e.detail.mode === 'guided') {
        this.el.setAttribute('visible', true);
        this.updateExperiment();
      } else {
        this.el.setAttribute('visible', false);
      }
    });

    // Initial state
    this.el.setAttribute('visible', false);
    this.updateExperiment();
  },

  updateExperiment () {
    const eng = window.reactionEngine;
    const exp = eng.getCurrentExperiment();
    if (!exp) {
      if (this.titleText) this.titleText.setAttribute('text', 'value: All Experiments Complete! 🎉; color: #00ff88; align: center; width: 1.4; wrapCount: 30');
      if (this.objectiveText) this.objectiveText.setAttribute('text', `value: Final Score: ${eng.score}; color: #ffff00; align: center; width: 1.4`);
      if (this.stepsText) this.stepsText.setAttribute('text', 'value: ');
      return;
    }

    if (this.titleText) {
      this.titleText.setAttribute('text', `value: ${exp.title}; color: #00ffcc; align: center; width: 1.4; wrapCount: 30`);
    }
    if (this.objectiveText) {
      this.objectiveText.setAttribute('text', `value: ${exp.objective}; color: #ffffff; align: center; width: 1.4; wrapCount: 45`);
    }
    if (this.stepsText) {
      const steps = exp.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
      this.stepsText.setAttribute('text', `value: ${steps}; color: #aaccff; align: left; width: 1.4; wrapCount: 55`);
    }
    if (this.progressText) {
      this.progressText.setAttribute('text', `value: Experiment ${eng.currentExperiment + 1} of ${window.GUIDED_EXPERIMENTS.length}; color: #888888; align: center; width: 1.4`);
    }
  },

  checkCompletion (detail) {
    const eng = window.reactionEngine;
    if (eng.mode !== 'guided') return;

    const exp = eng.getCurrentExperiment();
    if (!exp) return;

    const rKey = eng.getReactionKey(
      detail.reaction.equation.includes('+') ? '' : '',
      ''
    );

    // If last reaction matched, advance
    if (eng.completedExperiments.has(exp.id)) {
      setTimeout(() => {
        eng.advanceExperiment();
        this.updateExperiment();
      }, 3000);
    }
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: mode-switch-button
// Toggles between free and guided mode
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('mode-switch-button', {
  init () {
    this.el.addEventListener('click', () => {
      const eng = window.reactionEngine;
      const newMode = eng.mode === 'free' ? 'guided' : 'free';
      eng.setMode(newMode);
      this.el.sceneEl.emit('mode-changed', { mode: newMode });

      // Update button label
      const label = this.el.querySelector('.btn-label');
      if (label) {
        label.setAttribute('text', `value: ${newMode === 'free' ? '🔬 Free Mode' : '📖 Guided Mode'}; color: #ffffff; align: center; width: 0.6`);
      }

      this.el.sceneEl.emit('play-sound', { sound: 'click' });
    });

    // Hover
    this.el.addEventListener('mouseenter', () => {
      this.el.setAttribute('material', 'color', '#2a6aff');
    });
    this.el.addEventListener('mouseleave', () => {
      this.el.setAttribute('material', 'color', '#1a3a7a');
    });
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: reset-button
// Resets the entire lab to original state
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('reset-button', {
  init () {
    this.el.addEventListener('click', () => {
      this.resetLab();
      this.el.sceneEl.emit('play-sound', { sound: 'click' });
    });

    this.el.addEventListener('mouseenter', () => {
      this.el.setAttribute('material', 'color', '#ff4444');
    });
    this.el.addEventListener('mouseleave', () => {
      this.el.setAttribute('material', 'color', '#882222');
    });
  },

  resetLab () {
    window.reactionEngine.resetAll();

    // Reset all containers to original positions and chemicals
    const containers = this.el.sceneEl.querySelectorAll('[lab-container]');
    containers.forEach(c => {
      const comp = c.components['lab-container'];
      const origChem = c.getAttribute('data-original-chemical');
      const origPos = c.getAttribute('data-original-position');
      if (comp && origChem) {
        comp.data.chemicalId = origChem;
        comp.data.liquidLevel = 0.7;
        comp.updateLiquid();
      }
      if (origPos) {
        c.setAttribute('position', origPos);
      }
    });

    // Hide panels
    const infoPanel = this.el.sceneEl.querySelector('#reaction-info-panel');
    if (infoPanel) infoPanel.setAttribute('visible', false);

    this.el.sceneEl.emit('lab-reset');
    this.el.sceneEl.emit('mode-changed', { mode: window.reactionEngine.mode });
  }
});

// ──────────────────────────────────────────────────────────────
// COMPONENT: lab-manual-panel
// Scrollable lab manual with key information
// ──────────────────────────────────────────────────────────────
AFRAME.registerComponent('lab-manual', {
  schema: {
    page: { type: 'number', default: 0 }
  },

  init () {
    this.pages = [
      {
        title: 'Lab Safety Rules',
        content: '1. Always wear safety goggles\n2. Handle acids and bases with care\n3. Never taste chemicals\n4. Report spills immediately\n5. Know the location of the fire extinguisher\n6. Wash hands after handling chemicals'
      },
      {
        title: 'Reaction Types',
        content: '• Neutralization: Acid + Base → Salt + Water\n• Displacement: Metal replaces ion in solution\n• Precipitation: Two solutions form insoluble solid\n• Indicator: Changes colour based on pH'
      },
      {
        title: 'Chemical Hazards',
        content: '⚠⚠⚠ HCl - Strong Acid - Corrosive\n⚠⚠⚠ NaOH - Strong Base - Corrosive\n⚠⚠ AgNO₃ - Stains skin\n⚠⚠ CuSO₄ - Irritant\n⚠ Zn - Low hazard\n✓ H₂O - Safe'
      },
      {
        title: 'Equipment Guide',
        content: '• Grab equipment with controller trigger\n• Tilt containers to pour liquids\n• Click Bunsen burner to toggle flame\n• Turn knob to adjust flame height\n• Place items on scale to weigh\n• Use pH meter near liquids'
      },
      {
        title: 'Controls',
        content: '• Trigger: Grab / Click\n• Grip: Grab objects\n• Thumbstick: Move around\n• A/X Button: Teleport\n• B/Y Button: Snap turn\n• Menu: Reset view'
      }
    ];

    this.titleEl = this.el.querySelector('.manual-title');
    this.contentEl = this.el.querySelector('.manual-content');
    this.pageEl = this.el.querySelector('.manual-page');

    const prevBtn = this.el.querySelector('.manual-prev');
    const nextBtn = this.el.querySelector('.manual-next');

    if (prevBtn) prevBtn.addEventListener('click', () => this.prevPage());
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextPage());

    this.updatePage();
  },

  prevPage () {
    this.data.page = Math.max(0, this.data.page - 1);
    this.updatePage();
  },

  nextPage () {
    this.data.page = Math.min(this.pages.length - 1, this.data.page + 1);
    this.updatePage();
  },

  updatePage () {
    const p = this.pages[this.data.page];
    if (this.titleEl) {
      this.titleEl.setAttribute('text', `value: ${p.title}; color: #00ffcc; align: center; width: 1.2; wrapCount: 30`);
    }
    if (this.contentEl) {
      this.contentEl.setAttribute('text', `value: ${p.content}; color: #ffffff; align: left; width: 1.2; wrapCount: 50`);
    }
    if (this.pageEl) {
      this.pageEl.setAttribute('text', `value: Page ${this.data.page + 1} / ${this.pages.length}; color: #888888; align: center; width: 1.2`);
    }
  }
});
