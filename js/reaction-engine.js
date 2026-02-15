/* ============================================================
 *  REACTION ENGINE — WebXR Chemistry Lab
 *  Handles chemical database, reaction detection, and results
 * ============================================================ */

// ──────────────────────────────────────────────────────────────
// CHEMICAL DATABASE
// ──────────────────────────────────────────────────────────────
const CHEMICALS = {
  HCl: {
    name: 'Hydrochloric Acid',
    formula: 'HCl',
    type: 'acid',
    color: '#e0ffe0',          // pale green
    hazard: 'corrosive',
    hazardLevel: 3,
    pH: 1,
    description: 'A strong acid commonly used in industry and labs.'
  },
  NaOH: {
    name: 'Sodium Hydroxide',
    formula: 'NaOH',
    type: 'base',
    color: '#f0f0ff',          // nearly clear / blueish tint
    hazard: 'corrosive',
    hazardLevel: 3,
    pH: 14,
    description: 'A strong base (caustic soda) used in soap making.'
  },
  CuSO4: {
    name: 'Copper Sulfate',
    formula: 'CuSO₄',
    type: 'salt',
    color: '#1e90ff',          // blue
    hazard: 'irritant',
    hazardLevel: 2,
    pH: 4,
    description: 'A blue crystalline salt of copper.'
  },
  Zn: {
    name: 'Zinc',
    formula: 'Zn',
    type: 'metal',
    color: '#c0c0c0',          // silver / grey
    hazard: 'low',
    hazardLevel: 1,
    pH: null,
    description: 'A reactive metal commonly used in galvanisation.'
  },
  AgNO3: {
    name: 'Silver Nitrate',
    formula: 'AgNO₃',
    type: 'salt',
    color: '#f5f5f5',          // clear / white
    hazard: 'corrosive',
    hazardLevel: 2,
    pH: 5,
    description: 'A silver salt used in photography and analysis.'
  },
  H2O: {
    name: 'Water',
    formula: 'H₂O',
    type: 'solvent',
    color: '#cceeff',          // light blue
    hazard: 'none',
    hazardLevel: 0,
    pH: 7,
    description: 'Universal solvent, essential for life.'
  },
  Phenolphthalein: {
    name: 'Phenolphthalein',
    formula: 'C₂₀H₁₄O₄',
    type: 'indicator',
    color: '#ffffff',          // colourless in acid
    hazard: 'low',
    hazardLevel: 1,
    pH: null,
    description: 'Indicator that turns pink in basic solutions.'
  }
};

// ──────────────────────────────────────────────────────────────
// REACTION DATABASE
// Each reaction is keyed by a sorted pair of chemical IDs.
// ──────────────────────────────────────────────────────────────
const REACTIONS = {
  // Acid–Base Neutralization
  'HCl+NaOH': {
    type: 'neutralization',
    equation: 'HCl + NaOH → NaCl + H₂O',
    products: ['NaCl', 'H₂O'],
    resultColor: '#f0f0f0',
    effects: ['color_change', 'temperature_increase', 'bubbles'],
    temperatureChange: 15,
    title: 'Neutralization Reaction',
    explanation: 'An acid reacts with a base to produce a salt and water. ' +
      'The H⁺ ions from HCl combine with OH⁻ ions from NaOH, releasing heat.',
    safetyNote: 'Exothermic – handle with care.'
  },

  // Metal + Acid → Salt + Hydrogen gas
  'HCl+Zn': {
    type: 'single_displacement',
    equation: 'Zn + 2HCl → ZnCl₂ + H₂↑',
    products: ['ZnCl₂', 'H₂'],
    resultColor: '#e8e8e8',
    effects: ['gas_generation', 'bubbles', 'sound'],
    temperatureChange: 10,
    title: 'Metal–Acid Reaction',
    explanation: 'Zinc displaces hydrogen from hydrochloric acid because zinc ' +
      'is more reactive than hydrogen in the reactivity series.',
    safetyNote: 'Hydrogen gas is flammable! Keep away from flames.'
  },

  // Precipitation: Silver Nitrate + HCl
  'AgNO3+HCl': {
    type: 'precipitation',
    equation: 'AgNO₃ + HCl → AgCl↓ + HNO₃',
    products: ['AgCl', 'HNO₃'],
    resultColor: '#ffffff',
    precipitateColor: '#f5f5f5',
    effects: ['precipitate', 'color_change'],
    temperatureChange: 2,
    title: 'Precipitation Reaction',
    explanation: 'Silver ions combine with chloride ions to form insoluble ' +
      'silver chloride, which appears as a white precipitate.',
    safetyNote: 'Silver nitrate stains skin — wear gloves.'
  },

  // Copper displacement
  'CuSO4+Zn': {
    type: 'single_displacement',
    equation: 'Zn + CuSO₄ → ZnSO₄ + Cu',
    products: ['ZnSO₄', 'Cu'],
    resultColor: '#e0e0e0',
    effects: ['color_change', 'temperature_increase'],
    temperatureChange: 8,
    title: 'Displacement Reaction',
    explanation: 'Zinc is more reactive than copper and displaces it from ' +
      'copper sulfate solution. The blue colour fades as copper is deposited.',
    safetyNote: 'Mildly exothermic.'
  },

  // Indicator in base
  'NaOH+Phenolphthalein': {
    type: 'indicator',
    equation: 'Phenolphthalein + NaOH → Pink colour',
    products: [],
    resultColor: '#ff69b4',
    effects: ['color_change'],
    temperatureChange: 0,
    title: 'Indicator Colour Change',
    explanation: 'Phenolphthalein is colourless in acidic / neutral solutions ' +
      'but turns pink in basic solutions (pH > 8.2).',
    safetyNote: 'No significant hazard.'
  },

  // Indicator in acid (stays colourless)
  'HCl+Phenolphthalein': {
    type: 'indicator',
    equation: 'Phenolphthalein + HCl → No colour change',
    products: [],
    resultColor: '#ffffff',
    effects: [],
    temperatureChange: 0,
    title: 'Indicator in Acid',
    explanation: 'Phenolphthalein remains colourless in acidic conditions.',
    safetyNote: 'No significant hazard.'
  },

  // Water dilution of acid
  'H2O+HCl': {
    type: 'dilution',
    equation: 'HCl(aq) + H₂O → dilute HCl',
    products: ['dilute HCl'],
    resultColor: '#e8ffee',
    effects: ['temperature_increase'],
    temperatureChange: 5,
    title: 'Acid Dilution',
    explanation: 'Adding water to acid is exothermic. Always add acid to water, ' +
      'not water to acid, to prevent violent boiling.',
    safetyNote: 'Always add acid to water!'
  },

  // Water + base
  'H2O+NaOH': {
    type: 'dilution',
    equation: 'NaOH + H₂O → dilute NaOH',
    products: ['dilute NaOH'],
    resultColor: '#e8eeff',
    effects: ['temperature_increase'],
    temperatureChange: 8,
    title: 'Base Dilution',
    explanation: 'Dissolving NaOH in water is highly exothermic.',
    safetyNote: 'Generates significant heat — add slowly.'
  },

  // CuSO4 + NaOH → copper hydroxide precipitate
  'CuSO4+NaOH': {
    type: 'precipitation',
    equation: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',
    products: ['Cu(OH)₂', 'Na₂SO₄'],
    resultColor: '#4fc3f7',
    precipitateColor: '#1565c0',
    effects: ['precipitate', 'color_change'],
    temperatureChange: 3,
    title: 'Precipitation Reaction',
    explanation: 'Copper ions react with hydroxide ions to form insoluble ' +
      'copper(II) hydroxide — a blue gelatinous precipitate.',
    safetyNote: 'Copper hydroxide is an irritant.'
  }
};

// ──────────────────────────────────────────────────────────────
// GUIDED MODE EXPERIMENTS
// ──────────────────────────────────────────────────────────────
const GUIDED_EXPERIMENTS = [
  {
    id: 'neutralization',
    title: 'Perform a Neutralization Reaction',
    objective: 'Mix an acid with a base to produce salt and water.',
    steps: [
      'Pick up the beaker containing HCl (green liquid).',
      'Pick up the beaker containing NaOH (clear/blue liquid).',
      'Pour NaOH into the HCl beaker.',
      'Observe the colour change and temperature rise.',
      'Read the reaction explanation panel.'
    ],
    requiredReaction: 'HCl+NaOH',
    points: 100
  },
  {
    id: 'displacement',
    title: 'Create a Displacement Reaction',
    objective: 'Add zinc metal to hydrochloric acid and observe gas evolution.',
    steps: [
      'Pick up the test tube containing Zinc pieces.',
      'Pick up the beaker with HCl.',
      'Drop the Zinc into the HCl.',
      'Observe the bubbles of hydrogen gas.',
      'Read the explanation panel.'
    ],
    requiredReaction: 'HCl+Zn',
    points: 150
  },
  {
    id: 'precipitation',
    title: 'Create a Precipitation Reaction',
    objective: 'Mix silver nitrate with hydrochloric acid to form a precipitate.',
    steps: [
      'Pick up the flask with AgNO₃ (clear liquid).',
      'Pick up the beaker with HCl.',
      'Pour AgNO₃ into the HCl container.',
      'Observe the white precipitate forming.',
      'Read the explanation panel.'
    ],
    requiredReaction: 'AgNO3+HCl',
    points: 150
  },
  {
    id: 'indicator_test',
    title: 'Test a Base with an Indicator',
    objective: 'Use phenolphthalein to detect a basic solution.',
    steps: [
      'Pick up the dropper with Phenolphthalein.',
      'Pick up the beaker with NaOH.',
      'Add Phenolphthalein to NaOH.',
      'Observe the pink colour change.',
      'Read the explanation panel.'
    ],
    requiredReaction: 'NaOH+Phenolphthalein',
    points: 100
  },
  {
    id: 'copper_displacement',
    title: 'Displace Copper from Solution',
    objective: 'Add zinc to copper sulfate and observe copper depositing.',
    steps: [
      'Pick up the test tube with Zinc.',
      'Pick up the beaker with CuSO₄ (blue liquid).',
      'Add Zinc to the CuSO₄ solution.',
      'Watch the blue colour fade as copper forms.',
      'Read the explanation.'
    ],
    requiredReaction: 'CuSO4+Zn',
    points: 150
  }
];

// ──────────────────────────────────────────────────────────────
// REACTION ENGINE CLASS
// ──────────────────────────────────────────────────────────────
class ReactionEngine {
  constructor () {
    this.reactionLog = [];
    this.score = 0;
    this.mode = 'free';        // 'free' | 'guided'
    this.currentExperiment = 0;
    this.completedExperiments = new Set();
    this.temperature = 25;     // ambient °C
  }

  /* ── look up a reaction by two chemical IDs ── */
  getReactionKey (chemA, chemB) {
    return [chemA, chemB].sort().join('+');
  }

  findReaction (chemA, chemB) {
    const key = this.getReactionKey(chemA, chemB);
    return REACTIONS[key] || null;
  }

  /* ── execute a reaction ── */
  performReaction (chemA, chemB) {
    const reaction = this.findReaction(chemA, chemB);
    if (!reaction) {
      return {
        success: false,
        message: 'No reaction occurs between these chemicals.',
        chemA,
        chemB
      };
    }

    // Temperature
    this.temperature += reaction.temperatureChange;

    // Log
    const entry = {
      time: new Date().toLocaleTimeString(),
      chemA,
      chemB,
      reaction: reaction.title,
      equation: reaction.equation
    };
    this.reactionLog.push(entry);

    // Score (free mode always awards half; guided awards full if matches)
    let pointsAwarded = 25;
    if (this.mode === 'guided') {
      const exp = GUIDED_EXPERIMENTS[this.currentExperiment];
      if (exp) {
        const key = this.getReactionKey(chemA, chemB);
        if (key === exp.requiredReaction) {
          pointsAwarded = exp.points;
          this.completedExperiments.add(exp.id);
        }
      }
    }
    this.score += pointsAwarded;

    return {
      success: true,
      reaction,
      pointsAwarded,
      currentScore: this.score,
      temperature: this.temperature
    };
  }

  /* ── guided mode helpers ── */
  getCurrentExperiment () {
    return GUIDED_EXPERIMENTS[this.currentExperiment] || null;
  }

  advanceExperiment () {
    if (this.currentExperiment < GUIDED_EXPERIMENTS.length - 1) {
      this.currentExperiment++;
      return this.getCurrentExperiment();
    }
    return null; // all done
  }

  isAllComplete () {
    return this.completedExperiments.size >= GUIDED_EXPERIMENTS.length;
  }

  /* ── reset ── */
  resetLab () {
    this.temperature = 25;
    // Keep score and log
  }

  resetAll () {
    this.reactionLog = [];
    this.score = 0;
    this.temperature = 25;
    this.currentExperiment = 0;
    this.completedExperiments.clear();
  }

  /* ── mode ── */
  setMode (mode) {
    this.mode = mode;
    if (mode === 'guided') {
      this.currentExperiment = 0;
    }
  }
}

// Singleton
window.CHEMICALS = CHEMICALS;
window.REACTIONS = REACTIONS;
window.GUIDED_EXPERIMENTS = GUIDED_EXPERIMENTS;
window.reactionEngine = new ReactionEngine();
