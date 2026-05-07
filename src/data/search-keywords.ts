import { services } from "./services";

export interface SearchSuggestion {
  serviceId: string;
  category: string;
  emoji: string;
  matchedKeyword: string;
}

// Source 1: Hardcoded keyword map for Nepali/colloquial terms
const hardcodedKeywordMap: Record<
  string,
  { serviceId: string; category: string; emoji: string; keywords: string[] }
> = {
  plumbing: {
    serviceId: "plumbing",
    category: "Plumbing",
    emoji: "🔧",
    keywords: [
      "plumb",
      "pipe",
      "leak",
      "water",
      "tap",
      "nali",
      "dhara",
      "bathroom",
      "toilet",
      "shower",
      "pump",
      "tank",
    ],
  },
  cleaning: {
    serviceId: "cleaning",
    category: "Cleaning",
    emoji: "🧹",
    keywords: [
      "clean",
      "sweep",
      "mop",
      "dust",
      "sanitize",
      "sanitization",
      "office clean",
      "sofa",
      "carpet",
    ],
  },
  electrical: {
    serviceId: "electrical",
    category: "Electrical",
    emoji: "⚡",
    keywords: [
      "electric",
      "wire",
      "light",
      "switch",
      "bulb",
      "meter",
      "fan",
      "socket",
      "current",
      "short circuit",
    ],
  },
  moving: {
    serviceId: "moving",
    category: "Moving",
    emoji: "📦",
    keywords: [
      "mov",
      "shift",
      "saman",
      "furniture",
      "transport",
      "load",
      "unload",
      "packing",
      "pack",
    ],
  },
  tutoring: {
    serviceId: "tutoring",
    category: "Tutoring",
    emoji: "📚",
    keywords: [
      "tutor",
      "math",
      "science",
      "english",
      "homework",
      "exam",
      "notes",
      "teacher",
      "padhaune",
      "padh",
    ],
  },
  cooking: {
    serviceId: "cooking",
    category: "Cooking",
    emoji: "🍳",
    keywords: [
      "cook",
      "food",
      "khana",
      "catering",
      "chef",
      "meal",
      "party",
      "tarkari",
      "bhojan",
    ],
  },
  painting: {
    serviceId: "painting",
    category: "Painting",
    emoji: "🎨",
    keywords: [
      "paint",
      "rang",
      "wall",
      "colour",
      "color",
      "interior",
      "exterior",
      "brush",
      "coat",
    ],
  },
  gardening: {
    serviceId: "gardening",
    category: "Gardening",
    emoji: "🌱",
    keywords: [
      "garden",
      "lawn",
      "grass",
      "plant",
      "tree",
      "flower",
      "pot",
      "pruning",
      "bagicha",
    ],
  },
  "tech-help": {
    serviceId: "tech-help",
    category: "Tech Help",
    emoji: "💻",
    keywords: [
      "tech",
      "computer",
      "laptop",
      "wifi",
      "wi-fi",
      "printer",
      "software",
      "virus",
      "repair",
      "install",
      "it",
    ],
  },
  driver: {
    serviceId: "driver",
    category: "Driver",
    emoji: "🚗",
    keywords: [
      "drive",
      "car",
      "gaadi",
      "airport",
      "outstation",
      "city",
      "chauffeur",
      "ride",
      "taxi",
    ],
  },
  caretaking: {
    serviceId: "caretaking",
    category: "Caretaking",
    emoji: "👨‍⚕️",
    keywords: [
      "care",
      "elderly",
      "buwa",
      "aama",
      "property",
      "house sit",
      "herchah",
      "nurse",
      "guard",
    ],
  },
  "pet-care": {
    serviceId: "pet-care",
    category: "Pet Care",
    emoji: "🐕",
    keywords: [
      "pet",
      "dog",
      "cat",
      "animal",
      "grooming",
      "walk",
      "janavar",
      "pet sit",
      "puppy",
      "kitten",
    ],
  },
};

// Source 2: Extract dynamic keywords from service data (name + description)
function extractDynamicKeywords(): Record<
  string,
  { serviceId: string; category: string; emoji: string; keywords: string[] }
> {
  const result: Record<
    string,
    { serviceId: string; category: string; emoji: string; keywords: string[] }
  > = {};

  for (const service of services) {
    const keywords: string[] = [];

    // Extract words from English name
    keywords.push(...service.nameEn.toLowerCase().split(/\s+/));

    // Extract words from Nepali name
    keywords.push(...service.nameNp.toLowerCase().split(/\s+/));

    // Extract words from English description (filter out common stop words)
    const stopWords = new Set([
      "a",
      "an",
      "the",
      "and",
      "or",
      "for",
      "in",
      "on",
      "at",
      "to",
      "of",
      "with",
      "your",
      "you",
      "our",
      "more",
      "from",
      "near",
      "all",
      "are",
      "is",
      "was",
      "be",
      "have",
      "has",
      "had",
      "do",
      "does",
      "did",
      "will",
      "would",
      "can",
      "could",
      "should",
      "may",
      "might",
      "shall",
      "this",
      "that",
      "these",
      "those",
      "it",
      "its",
      "we",
      "they",
      "their",
      "them",
      "he",
      "she",
      "her",
      "him",
      "his",
      "i",
      "me",
      "my",
      "mine",
    ]);

    const descWords = service.descriptionEn
      .toLowerCase()
      .replace(/[^a-z\s-]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    keywords.push(...descWords);

    // Extract words from Nepali description
    const npDescWords = service.descriptionNp
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    keywords.push(...npDescWords);

    result[service.id] = {
      serviceId: service.id,
      category: service.nameEn,
      emoji: service.emoji,
      keywords: [...new Set(keywords)], // deduplicate
    };
  }

  return result;
}

// Merge both sources at runtime
function getMergedKeywordMap(): Record<
  string,
  { serviceId: string; category: string; emoji: string; keywords: string[] }
> {
  const dynamic = extractDynamicKeywords();
  const merged: Record<
    string,
    { serviceId: string; category: string; emoji: string; keywords: string[] }
  > = {};

  // Start with hardcoded keywords
  for (const [key, value] of Object.entries(hardcodedKeywordMap)) {
    merged[key] = { ...value, keywords: [...value.keywords] };
  }

  // Merge in dynamic keywords (deduplicated)
  for (const [key, value] of Object.entries(dynamic)) {
    if (merged[key]) {
      const existing = new Set(merged[key].keywords);
      for (const kw of value.keywords) {
        if (!existing.has(kw)) {
          merged[key].keywords.push(kw);
        }
      }
    } else {
      merged[key] = { ...value, keywords: [...value.keywords] };
    }
  }

  return merged;
}

export function getSearchSuggestions(query: string): SearchSuggestion[] {
  if (!query || query.trim().length < 2) return [];

  const lowerQuery = query.toLowerCase().trim();
  const suggestions: SearchSuggestion[] = [];
  const seenServices = new Set<string>();
  const mergedMap = getMergedKeywordMap();

  for (const [, data] of Object.entries(mergedMap)) {
    if (seenServices.has(data.serviceId)) continue;

    // Check if query matches any keyword (partial, case-insensitive)
    for (const keyword of data.keywords) {
      if (keyword.includes(lowerQuery) || lowerQuery.includes(keyword)) {
        suggestions.push({
          serviceId: data.serviceId,
          category: data.category,
          emoji: data.emoji,
          matchedKeyword: keyword,
        });
        seenServices.add(data.serviceId);
        break;
      }
    }

    // Also check if query matches the category name
    if (!seenServices.has(data.serviceId)) {
      const lowerCategory = data.category.toLowerCase();
      if (
        lowerCategory.includes(lowerQuery) ||
        lowerQuery.includes(lowerCategory)
      ) {
        suggestions.push({
          serviceId: data.serviceId,
          category: data.category,
          emoji: data.emoji,
          matchedKeyword: data.category,
        });
        seenServices.add(data.serviceId);
      }
    }
  }

  return suggestions;
}
