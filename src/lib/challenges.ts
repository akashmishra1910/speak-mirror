export interface Challenge {
  id: string;
  type: "technical" | "casual";
  prompt: string;
  word_of_the_day: string;
  definition: string;
  tips: string[];
  suggestedDuration: number; // in seconds
}

export const dailyChallenges: Challenge[] = [
  {
    id: "rest-api",
    type: "technical",
    prompt: "Explain what a 'REST API' is to a 10-year-old using a analogy.",
    word_of_the_day: "Endpoints",
    definition: "Specific URLs that representing channels of communication where an API receives requests.",
    tips: [
      "Use the restaurant and waiter analogy: you are the customer, the kitchen is the database, and the waiter is the API.",
      "Avoid jargon like JSON, serialization, or HTTP methods.",
      "Focus on explaining inputs (ordering food) and outputs (getting your meal)."
    ],
    suggestedDuration: 30
  },
  {
    id: "sync-async",
    type: "technical",
    prompt: "Explain the difference between synchronous and asynchronous code execution.",
    word_of_the_day: "Concurrency",
    definition: "The ability of different parts of a program to execute out-of-order without affecting the final outcome.",
    tips: [
      "Use an everyday task analogy: doing laundry synchronously (waiting by the machine) vs asynchronously (cooking while it runs).",
      "Explain the concept of blocking vs non-blocking behavior.",
      "Highlight how asynchronous code improves application performance."
    ],
    suggestedDuration: 30
  },
  {
    id: "db-indexing",
    type: "technical",
    prompt: "How does a database index work? Use a book analogy.",
    word_of_the_day: "Optimization",
    definition: "Making a design, system, or decision as effective or functional as possible.",
    tips: [
      "Explain how flipping through every page (table scan) is slower than checking the index at the back of the book.",
      "Mention that indexes make reads faster but can slow down writes.",
      "Keep it simple: do not explain B-Trees or hashing algorithms."
    ],
    suggestedDuration: 30
  },
  {
    id: "internet-flow",
    type: "technical",
    prompt: "What happens when you type 'google.com' in your browser and press Enter?",
    word_of_the_day: "Resolution",
    definition: "The process of translating a human-readable domain name (like google.com) into an IP address.",
    tips: [
      "Describe the DNS as the phone book of the internet.",
      "Keep the explanation sequential: Request -> DNS Lookup -> Server response -> Rendering.",
      "Focus on the request-response cycle in simple terms."
    ],
    suggestedDuration: 45
  },
  {
    id: "docker-containers",
    type: "technical",
    prompt: "Explain Docker containers like physical cargo shipping containers.",
    word_of_the_day: "Isolation",
    definition: "Separating a program or process from its environment to prevent conflicts.",
    tips: [
      "Highlight how shipping containers standardise how goods travel, regardless of whether they contain toys or cars.",
      "Contrast containers with heavy Virtual Machines (shipping container vs building an entire ship for each box).",
      "Mention 'works on my machine' resolution."
    ],
    suggestedDuration: 30
  },
  {
    id: "git-version-control",
    type: "technical",
    prompt: "Why do software developers use Git? Explain it using a video game save system.",
    word_of_the_day: "Repository",
    definition: "A central location where data, code, or history is stored and managed.",
    tips: [
      "Use the concept of checkpoints and branching paths in a game.",
      "Explain how multiple people can edit the same codebase without overwriting each other's files.",
      "Define 'merge conflict' as two players trying to claim the same item."
    ],
    suggestedDuration: 30
  },
  {
    id: "imposter-syndrome",
    type: "casual",
    prompt: "Describe 'imposter syndrome' and share one strategy to manage it.",
    word_of_the_day: "Cognizant",
    definition: "Being aware, mindful, or having knowledge of something.",
    tips: [
      "Define it as the internal experience of feeling like a fraud despite success.",
      "Use a supportive, encouraging tone.",
      "Offer actionable strategies, like keeping a brag-document or talking to mentors."
    ],
    suggestedDuration: 30
  },
  {
    id: "stress-management",
    type: "casual",
    prompt: "How do you handle stressful situations under pressure? Give a specific example.",
    word_of_the_day: "Resilience",
    definition: "The capacity to recover quickly from difficulties; toughness.",
    tips: [
      "Use the STAR method: Situation, Task, Action, Response.",
      "Emphasize the mental pause or breathing technique you use before taking action.",
      "Focus on lessons learned from the pressure scenario."
    ],
    suggestedDuration: 45
  },
  {
    id: "hobby-passion",
    type: "casual",
    prompt: "Explain your favorite hobby and why it brings you joy to someone who has never tried it.",
    word_of_the_day: "Elated",
    definition: "Ecstatically happy, proud, or in high spirits.",
    tips: [
      "Describe the physical/mental feeling of engaging in your hobby.",
      "Use sensory language (sights, sounds, feelings).",
      "Invite the listener to understand the low-friction entry point to starting."
    ],
    suggestedDuration: 30
  },
  {
    id: "sleep-cognitive",
    type: "casual",
    prompt: "Why is sleep critical for brain performance? Explain it like washing a car.",
    word_of_the_day: "Rejuvenation",
    definition: "The action of making someone or something look or feel better, younger, or more vital.",
    tips: [
      "Explain the glymphatic system using a night-shift cleaning crew analogy.",
      "Describe what happens to memory consolidation when sleep is cut short.",
      "Keep pacing slow and deliberate to emphasize relaxation."
    ],
    suggestedDuration: 30
  }
];

export function getRandomChallenge(excludeId?: string): Challenge {
  const filtered = excludeId ? dailyChallenges.filter(c => c.id !== excludeId) : dailyChallenges;
  const index = Math.floor(Math.random() * filtered.length);
  return filtered[index];
}
