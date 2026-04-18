export const sentences = [
  "The quick brown fox jumps over the lazy dog.",
  "A journey of a thousand miles begins with a single step.",
  "To be or not to be, that is the question.",
  "All that glitters is not gold.",
  "Experience is the teacher of all things.",
  "Actions speak louder than words in most situations.",
  "The pen is mightier than the sword.",
  "Rome was not built in a day.",
  "Every cloud has a silver lining.",
  "When in Rome, do as the Romans do.",
  "The early bird catches the worm.",
  "Birds of a feather flock together.",
  "A picture is worth a thousand words.",
  "It takes two to make a thing go right.",
  "Honesty is the best policy for a happy life.",
  "What goes around comes around.",
  "Practice makes perfect when you are typing.",
  "Time flies when you are having fun."
];

export function introduceAbnormalities(sentence: string, count: number = 3): string {
  let modifiedSentence = sentence;
  let changesApplied = 0;
  let attempts = 0;
  const maxAttempts = 50;

  // Potential distortions
  const distortions = [
    // Spelling: Swap vowels
    (s: string) => s.replace(/[aeiou]/i, (m) => ({ 'a': 'e', 'e': 'i', 'i': 'o', 'o': 'u', 'u': 'a', 'A': 'E', 'E': 'I', 'I': 'O', 'O': 'U', 'U': 'A' }[m] || m)),
    // Spelling: Double a consonant
    (s: string) => s.replace(/([bcdfghjklmnpqrstvwxyz])/i, "$1$1"),
    // Spelling: Remove a letter
    (s: string) => s.length > 3 ? s.slice(0, Math.floor(s.length / 2)) + s.slice(Math.floor(s.length / 2) + 1) : s,
    // Spelling: Specific replacements
    (s: string) => s.toLowerCase() === "begin" ? "bigin" : (s.toLowerCase() === "rome" ? "roma" : s),
    // Punctuation: Swap period for semicolon
    (s: string) => s.replace(".", ";"),
    // Punctuation: Swap comma for colon
    (s: string) => s.replace(",", ":"),
    // Punctuation: Add random mark
    (s: string) => s.endsWith("!") || s.endsWith("?") || s.endsWith(".") ? s : s + "!",
    // Spelling: Swap adjacent letters
    (s: string) => {
      if (s.length < 2) return s;
      const arr = s.split("");
      const idx = Math.floor(Math.random() * (arr.length - 1));
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.join("");
    }
  ];

  while (changesApplied < count && attempts < maxAttempts) {
    const words = modifiedSentence.split(" ");
    const randomWordIdx = Math.floor(Math.random() * words.length);
    const randomDistortionIdx = Math.floor(Math.random() * distortions.length);
    
    const originalWord = words[randomWordIdx];
    const distortedWord = distortions[randomDistortionIdx](originalWord);
    
    if (originalWord !== distortedWord) {
      words[randomWordIdx] = distortedWord;
      modifiedSentence = words.join(" ");
      changesApplied++;
    }
    attempts++;
  }

  return modifiedSentence;
}

export function getRandomSentences(count: number = 5): string[] {
  const shuffled = [...sentences].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(s => introduceAbnormalities(s, 3));
}

export function calculateEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateAccuracy(target: string, typed: string): number {
  const distance = calculateEditDistance(target, typed);
  const maxLength = Math.max(target.length, typed.length);
  const accuracy = ((maxLength - distance) / maxLength) * 100;
  return accuracy < 0 ? 0 : accuracy;
}
