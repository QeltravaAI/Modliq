const TEMPLATES = require("../data/templates");

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function findTarget(text, template) {
  const lower = text.toLowerCase();

  for (const cand of template.target_candidates) {
    if (lower.includes(cand.toLowerCase())) {
      return cand;
    }
  }

  // Common synonyms
  if (lower.includes("yield")) return template.target_candidates[0];
  if (lower.includes("defect")) return template.target_candidates[0];
  if (lower.includes("churn")) return "Churn";
  if (lower.includes("revenue") || lower.includes("sales"))
    return "Revenue";

  return template.target_candidates[0];
}

function findGoalDirection(text) {
  const lower = text.toLowerCase();

  const minimizeWords = [
    "minimize",
    "reduce",
    "lower",
    "decrease",
    "cut",
    "avoid",
    "prevent",
  ];

  if (minimizeWords.some((w) => lower.includes(w))) {
    return "minimize";
  }

  return "maximize";
}

function findThreshold(text, goalDirection) {
  const lower = text.toLowerCase();

  // maximize -> look for "above / exceed / over / at least / >= / ≥"
  // minimize -> look for "below / under / less than / at most / <= / ≤"
  let pattern;

  if (goalDirection === "maximize") {
    pattern =
      /(above|exceed|over|at least|>=|≥|more than)\s*(\d+(?:\.\d+)?)/;
  } else {
    pattern =
      /(below|under|less than|at most|<=|≤|no more than)\s*(\d+(?:\.\d+)?)/;
  }

  const match = lower.match(pattern);

  if (match) {
    return parseFloat(match[2]);
  }

  // Fallback: any percentage-like number
  const pct = lower.match(/(\d+(?:\.\d+)?)\s*%/);

  return pct ? parseFloat(pct[1]) : null;
}

function findFeatures(text, template) {
  const lower = text.toLowerCase();

  const found = [];

  for (const feat of template.feature_candidates) {
    if (lower.includes(feat.toLowerCase())) {
      found.push(feat);
    }
  }

  // Synonym mapping
  const synonyms = {
    temp: "Temperature",
    temperature: "Temperature",
    pressure: "Pressure",
    humidity: "Humidity",
    speed: "Speed",
  };

  for (const [syn, canonical] of Object.entries(synonyms)) {
    if (
      lower.includes(syn) &&
      template.feature_candidates.includes(canonical) &&
      !found.includes(canonical)
    ) {
      found.push(canonical);
    }
  }

  return found;
}

function findConstraints(text, template) {
  const lower = text.toLowerCase();

  const constraints = {};

  // e.g. "temperature below 90" or "pressure above 400"
  for (const feat of template.feature_candidates) {
    const featLower = feat.toLowerCase();

    const below = new RegExp(
      `${featLower}\\s*(?:below|under|less than|at most|no more than|<=|≤)\\s*(\\d+(?:\\.\\d+)?)`
    ).exec(lower);

    const above = new RegExp(
      `${featLower}\\s*(?:above|exceed|over|at least|more than|>=|≥)\\s*(\\d+(?:\\.\\d+)?)`
    ).exec(lower);

    if (below) {
      constraints[feat] = { ...(constraints[feat] || {}), max: parseFloat(below[1]) };
    }

    if (above) {
      constraints[feat] = { ...(constraints[feat] || {}), min: parseFloat(above[1]) };
    }
  }

  return constraints;
}

function parseIntent(rawText, templateId = "yield_optimizer") {
  const template = TEMPLATES[templateId] || TEMPLATES.yield_optimizer;

  const text = (rawText || "").toString().trim();

  if (!text) {
    return {
      success: false,
      error: "Empty goal text",
    };
  }

  const goalDirection = findGoalDirection(text);
  const target = findTarget(text, template);
  const threshold = findThreshold(text, goalDirection);
  const features = findFeatures(text, template);
  const constraints = findConstraints(text, template);

  return {
    success: true,
    raw_text: text,
    template_id: template.template_id,
    target,
    goal_direction: goalDirection,
    threshold,
    features,
    constraints,
  };
}

module.exports = { parseIntent, TEMPLATES, titleCase };
