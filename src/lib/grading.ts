export type ModuleScore = {
  module: string;
  weight: number; // 0..1
  score: number; // 0..100
};

export const DEFAULT_MODULES: Omit<ModuleScore, "score">[] = [
  { module: "Python", weight: 0.2 },
  { module: "Data Analyst", weight: 0.2 },
  { module: "Statistics", weight: 0.1 },
  { module: "Machine Learning", weight: 0.1 },
  { module: "Communication & Analytical Thinking", weight: 0.1 },
  { module: "Final Project", weight: 0.3 },
];

export function computeTotal(modules: ModuleScore[]): number {
  const weightSum = modules.reduce((s, m) => s + m.weight, 0) || 1;
  const total = modules.reduce((s, m) => s + m.score * m.weight, 0) / weightSum;
  return Math.round(total * 100) / 100;
}

export function computeGrade(total: number): string {
  if (total >= 86) return "Excellent";
  if (total >= 75) return "Good";
  if (total >= 65) return "Fair";
  return "Poor";
}
