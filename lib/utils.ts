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

export function getRandomSentences(count: number = 5): string[] {
  const shuffled = [...sentences].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
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
