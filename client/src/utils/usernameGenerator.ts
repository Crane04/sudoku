// src/utils/usernameGenerator.ts

// First word - adjectives/adverbs/nouns that set a tone
const FIRST_WORDS = [
  // Nature themed
  "fire",
  "water",
  "earth",
  "wind",
  "storm",
  "frost",
  "moss",
  "clay",
  "stone",
  "river",
  "mountain",
  "forest",
  "ocean",
  "desert",
  "crystal",
  "thunder",
  "mist",

  // Tech/gaming themed
  "arcade",
  "pixel",
  "byte",
  "quantum",
  "neon",
  "cyber",
  "digital",
  "circuit",
  "vector",
  "binary",
  "console",
  "retro",
  "glitch",
  "sprite",
  "voxel",
  "synth",

  // Action themed
  "swift",
  "stealth",
  "shadow",
  "blade",
  "storm",
  "flash",
  "phantom",
  "rogue",
  "fury",
  "valor",
  "chaos",
  "spirit",
  "phantom",
  "shade",
  "ghost",
  "ember",

  // Abstract/fun
  "cosmic",
  "chaos",
  "magic",
  "ancient",
  "mystic",
  "eternal",
  "solar",
  "lunar",
  "stellar",
  "atomic",
  "chaos",
  "zen",
  "karma",
  "mystic",
  "mythic",
  "epic",

  // Colors/Elements
  "crimson",
  "azure",
  "amber",
  "jade",
  "ivory",
  "ebony",
  "golden",
  "silver",
  "bronze",
  "steel",
  "iron",
  "copper",
  "ruby",
  "emerald",
  "sapphire",
  "onyx",

  // Quirky
  "rainbow",
  "bubble",
  "sparkle",
  "waffle",
  "pancake",
  "noodle",
  "sushi",
  "cookie",
  "muffin",
  "pickle",
  "mustard",
  "ketchup",
  "pizza",
  "taco",
];

// Second word - nouns that create interesting combinations
const SECOND_WORDS = [
  // Animals/Creatures
  "bug",
  "fox",
  "wolf",
  "hawk",
  "eagle",
  "raven",
  "owl",
  "phoenix",
  "dragon",
  "serpent",
  "panther",
  "tiger",
  "lion",
  "shark",
  "whale",
  "dolphin",
  "koala",
  "panda",
  "rabbit",
  "squirrel",
  "hedgehog",
  "octopus",
  "crab",
  "lobster",

  // Objects/Items
  "blade",
  "shield",
  "hammer",
  "arrow",
  "spear",
  "sword",
  "dagger",
  "bow",
  "axe",
  "staff",
  "wand",
  "crystal",
  "orb",
  "cube",
  "sphere",
  "prism",

  // Natural elements
  "wave",
  "wind",
  "flame",
  "spark",
  "thunder",
  "lightning",
  "storm",
  "rain",
  "snow",
  "ice",
  "glacier",
  "volcano",
  "earthquake",
  "tornado",
  "hurricane",

  // Tech/gaming
  "pixel",
  "sprite",
  "bit",
  "byte",
  "core",
  "chip",
  "circuit",
  "module",
  "matrix",
  "grid",
  "network",
  "server",
  "database",
  "protocol",
  "kernel",

  // Abstract concepts
  "dream",
  "nightmare",
  "vision",
  "echo",
  "whisper",
  "song",
  "story",
  "myth",
  "legend",
  "fable",
  "riddle",
  "puzzle",
  "mystery",
  "secret",
  "destiny",

  // Action/Effects
  "shot",
  "blast",
  "burst",
  "flash",
  "strike",
  "crash",
  "bang",
  "boom",
  "pop",
  "snap",
  "crack",
  "smash",
  "dash",
  "rush",
  "surge",
  "wave",

  // Food/Drinks (quirky)
  "sushi",
  "taco",
  "pizza",
  "burger",
  "noodle",
  "ramen",
  "curry",
  "toast",
  "bacon",
  "egg",
  "cheese",
  "milk",
  "honey",
  "syrup",
  "jam",
  "butter",

  // Gaming references
  "coin",
  "life",
  "level",
  "score",
  "bonus",
  "power",
  "skill",
  "quest",
  "achievement",
  "victory",
  "defeat",
  "challenge",
  "reward",
  "prize",
];

// Emoji list - organized by category for themed matching
const EMOJIS = {
  // Animals
  animals: [
    "🦊",
    "🐺",
    "🐉",
    "🦁",
    "🐯",
    "🐸",
    "🦅",
    "🦇",
    "🐙",
    "🦋",
    "🐝",
    "🦄",
  ],

  // Nature
  nature: [
    "🌲",
    "🌊",
    "⛰️",
    "🌋",
    "🌈",
    "⭐",
    "☀️",
    "🌙",
    "⚡",
    "❄️",
    "💨",
    "🔥",
  ],

  // Food
  food: [
    "🍕",
    "🍣",
    "🌮",
    "🍔",
    "🍜",
    "🥨",
    "🍩",
    "🎂",
    "🍦",
    "🍿",
    "🥝",
    "🥑",
  ],

  // Gaming/Tech
  gaming: [
    "🎮",
    "👾",
    "🤖",
    "💻",
    "📱",
    "🎲",
    "🎯",
    "🏆",
    "⚔️",
    "🛡️",
    "🔮",
    "🎪",
  ],

  // Space/Magic
  magic: [
    "✨",
    "🌟",
    "🌌",
    "🚀",
    "🛸",
    "🔮",
    "⚗️",
    "💫",
    "🌠",
    "🧙",
    "🧚",
    "🧛",
  ],

  // Faces/Emotions
  faces: [
    "😎",
    "🤓",
    "😈",
    "👻",
    "💀",
    "🤡",
    "😺",
    "🙈",
    "💪",
    "👀",
    "🧠",
    "❤️",
  ],

  // Music/Arts
  arts: [
    "🎵",
    "🎨",
    "🎭",
    "🎪",
    "🎤",
    "🎸",
    "🥁",
    "📷",
    "🎬",
    "📚",
    "✏️",
    "🎯",
  ],

  // Sports
  sports: [
    "⚽",
    "🏀",
    "🎾",
    "🏈",
    "⚾",
    "🥊",
    "🏹",
    "⛳",
    "🏄",
    "🧗",
    "🚴",
    "🏋️",
  ],

  // Objects
  objects: [
    "💎",
    "🔑",
    "⚙️",
    "🔧",
    "🧩",
    "🎁",
    "📦",
    "💊",
    "🔬",
    "🕰️",
    "🧭",
    "⚖️",
  ],

  // Weather
  weather: [
    "☀️",
    "🌈",
    "⛈️",
    "🌪️",
    "🌊",
    "❄️",
    "🌫️",
    "☁️",
    "🌩️",
    "🍃",
    "💧",
    "🔥",
  ],
};

// Special themed emoji mappings for certain word combinations
const THEMED_EMOJIS: Record<string, string[]> = {
  // Nature words get nature emojis
  fire: EMOJIS.weather,
  water: EMOJIS.weather,
  storm: EMOJIS.weather,
  thunder: EMOJIS.weather,
  frost: EMOJIS.weather,
  mist: EMOJIS.weather,

  // Animals get animal emojis
  fox: EMOJIS.animals,
  wolf: EMOJIS.animals,
  dragon: EMOJIS.animals,
  phoenix: EMOJIS.animals,
  bug: EMOJIS.animals,

  // Food words get food emojis
  pizza: EMOJIS.food,
  taco: EMOJIS.food,
  sushi: EMOJIS.food,
  noodle: EMOJIS.food,

  // Tech words get tech emojis
  pixel: EMOJIS.gaming,
  byte: EMOJIS.gaming,
  quantum: EMOJIS.magic,
  cyber: EMOJIS.gaming,

  // Gaming words get gaming emojis
  coin: EMOJIS.gaming,
  level: EMOJIS.gaming,
  quest: EMOJIS.gaming,
  victory: EMOJIS.gaming,

  // Abstract concepts get magic/space emojis
  dream: EMOJIS.magic,
  nightmare: EMOJIS.faces,
  destiny: EMOJIS.magic,
  myth: EMOJIS.magic,
};

// Additional word for variety (optional third part)
const EXTRA_WORDS = [
  "prime",
  "ultra",
  "mega",
  "hyper",
  "super",
  "alpha",
  "beta",
  "gamma",
  "zero",
  "neo",
  "proto",
  "cyber",
  "techno",
  "magic",
  "psychic",
  "cosmic",
];

// All emojis flattened for random selection
const ALL_EMOJIS = Object.values(EMOJIS).flat();

function getEmojiForWord(word: string): string {
  // Check if word has a themed emoji list
  const lowerWord = word.toLowerCase();
  for (const [key, emojiList] of Object.entries(THEMED_EMOJIS)) {
    if (lowerWord.includes(key)) {
      return emojiList[Math.floor(Math.random() * emojiList.length)];
    }
  }

  // Random emoji if no theme match
  return ALL_EMOJIS[Math.floor(Math.random() * ALL_EMOJIS.length)];
}

export function generateUsername(): string {
  const useSpecial = Math.random() < 0.3; // 30% chance for special combo

  let firstWord: string;
  let secondWord: string;
  let username: string;

  if (useSpecial) {
    const specialKeys = Object.keys(SPECIAL_COMBOS);
    firstWord = specialKeys[Math.floor(Math.random() * specialKeys.length)];
    const specialOptions = SPECIAL_COMBOS[firstWord];
    secondWord =
      specialOptions[Math.floor(Math.random() * specialOptions.length)];
    username = `${firstWord}${secondWord}`;
  } else {
    firstWord = FIRST_WORDS[Math.floor(Math.random() * FIRST_WORDS.length)];
    secondWord = SECOND_WORDS[Math.floor(Math.random() * SECOND_WORDS.length)];
    username = `${firstWord}${secondWord}`;
  }

  // 20% chance to add a number suffix
  if (Math.random() < 0.2) {
    const number = Math.floor(Math.random() * 100);
    username = `${username}${number}`;
  }

  // 30% chance for three-part name (but only if we didn't add numbers)
  else if (Math.random() < 0.15) {
    const extraWord =
      EXTRA_WORDS[Math.floor(Math.random() * EXTRA_WORDS.length)];
    username = `${username}${extraWord}`;
  }

  // Add emoji - try to theme it to one of the words
  const emoji =
    Math.random() < 0.7
      ? getEmojiForWord(secondWord) // 70% chance based on second word
      : getEmojiForWord(firstWord); // 30% chance based on first word

  return `${username} ${emoji}`;
}

// Special combos remain the same
const SPECIAL_COMBOS: Record<string, string[]> = {
  fire: ["ant", "fly", "fighter", "ball", "work"],
  water: ["fall", "melon", "gate", "mark", "proof"],
  thunder: ["cat", "bolt", "cloud", "struck"],
  super: ["nova", "man", "star", "charge", "blast"],
  ultra: ["violet", "man", "mega", "instinct"],
};

export function generateUniqueUsername(
  existingUsernames: Set<string> = new Set(),
): string {
  let username = generateUsername();
  let attempts = 0;

  // If username exists, add/change number suffix before emoji
  while (existingUsernames.has(username) && attempts < 10) {
    // Split into base and emoji
    const parts = username.split(" ");
    const base = parts[0];
    const emoji = parts[1] || getEmojiForWord(base);

    if (base.match(/\d+$/)) {
      // Replace existing number
      const newBase = base.replace(
        /\d+$/,
        String(Math.floor(Math.random() * 999) + 1),
      );
      username = `${newBase} ${emoji}`;
    } else {
      // Add number
      username = `${base}${Math.floor(Math.random() * 99) + 1} ${emoji}`;
    }
    attempts++;
  }

  return username;
}

export function getOrCreateUsername(): string {
  const STORAGE_KEY = "sudorace_username";
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    return saved;
  }

  const newUsername = generateUsername();
  localStorage.setItem(STORAGE_KEY, newUsername);
  return newUsername;
}

// Generate multiple at once for preview
export function generateUsernameSamples(count: number = 10): string[] {
  const samples: string[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(generateUsername());
  }
  return samples;
}
