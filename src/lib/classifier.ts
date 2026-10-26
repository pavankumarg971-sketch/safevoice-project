// In-browser Client AI Classifier Fallback
// Provides continuous, zero-failure threat classification even if the Python ML service is offline.

export interface ThreatPrediction {
  label: "EMERGENCY" | "THREAT" | "HARASSMENT" | "ASSAULT" | "DISTRESS" | "NORMAL";
  confidence: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: "FastAPI Backend" | "Local AI Engine";
}

const EMERGENCY_WORDS = [
  "help",
  "emergency",
  "police",
  "save",
  "danger",
  "ambulance",
  "911",
  "die",
  "dying",
  "choking",
  "weapon",
  "gun",
  "knife",
  "robber",
  "kidnap",
  "kidnapping",
];

const THREAT_WORDS = [
  "threat",
  "threaten",
  "threatening",
  "kill",
  "attack",
  "hurt",
  "stop",
  "leave me",
  "get away",
  "dont touch",
  "don't touch",
  "scream",
  "beat",
];

const HARASSMENT_WORDS = [
  "stalk",
  "stalker",
  "stalking",
  "follow",
  "following",
  "harass",
  "harassing",
  "harassment",
  "creep",
  "creepy",
  "inappropriate",
  "texting",
  "pictures",
  "photos",
  "camera",
  "watching",
  "recorded",
];

const ASSAULT_WORDS = [
  "assault",
  "assaulted",
  "grab",
  "grabbed",
  "hit",
  "punched",
  "battered",
  "violent",
  "violence",
  "forced",
  "break in",
  "knife",
  "gun",
  "weapon",
  "stab",
  "stabbed",
  "choke",
  "choking",
];

const DISTRESS_WORDS = [
  "scared",
  "afraid",
  "terrified",
  "fear",
  "unsafe",
  "lost",
  "dark",
  "suspicious",
  "crying",
  "stranded",
  "alone",
  "racing",
];

export function classifyThreat(text: string): ThreatPrediction {
  const clean = text.toLowerCase().trim();
  const tokens = clean.match(/\b[a-z0-9]+\b/g) || [];

  if (tokens.length === 0) {
    return {
      label: "NORMAL",
      confidence: 0.95,
      risk_level: "LOW",
      source: "Local AI Engine",
    };
  }

  let emergencyScore = 0;
  let threatScore = 0;
  let harassmentScore = 0;
  let assaultScore = 0;
  let distressScore = 0;

  for (const t of tokens) {
    if (EMERGENCY_WORDS.includes(t)) emergencyScore += 3.5;
    if (THREAT_WORDS.includes(t)) threatScore += 3.0;
    if (HARASSMENT_WORDS.includes(t)) harassmentScore += 2.8;
    if (ASSAULT_WORDS.includes(t)) assaultScore += 3.2;
    if (DISTRESS_WORDS.includes(t)) distressScore += 2.5;
  }

  // Multi-word exact phrase matches
  if (/help me|save me|call (the )?police|call 911|in danger/.test(clean)) {
    emergencyScore += 5.0;
  }
  if (/kill me|going to hurt|leave me alone|get away|stop following/.test(clean)) {
    threatScore += 4.5;
  }
  if (/stalking me|watching me|won't stop|following me/.test(clean)) {
    harassmentScore += 4.0;
  }
  if (/grabbed my|hit me|punched me|broke into/.test(clean)) {
    assaultScore += 4.5;
  }
  if (/so scared|feel unsafe|lost in the|terrified/.test(clean)) {
    distressScore += 4.0;
  }

  const scores = [
    { label: "EMERGENCY" as const, score: emergencyScore, risk: "CRITICAL" as const },
    { label: "ASSAULT" as const, score: assaultScore, risk: "HIGH" as const },
    { label: "THREAT" as const, score: threatScore, risk: "HIGH" as const },
    { label: "DISTRESS" as const, score: distressScore, risk: "HIGH" as const },
    { label: "HARASSMENT" as const, score: harassmentScore, risk: "MEDIUM" as const },
  ];

  scores.sort((a, b) => b.score - a.score);
  const highest = scores[0];

  if (highest.score > 0) {
    const rawConf = 0.7 + Math.min(0.29, highest.score * 0.05);
    return {
      label: highest.label,
      confidence: parseFloat(rawConf.toFixed(2)),
      risk_level: highest.risk,
      source: "Local AI Engine",
    };
  }

  return {
    label: "NORMAL",
    confidence: 0.94,
    risk_level: "LOW",
    source: "Local AI Engine",
  };
}
