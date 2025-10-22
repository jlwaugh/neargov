export interface EvaluationCriterion {
  pass: boolean;
  reason: string;
}

export interface Alignment {
  score: "high" | "medium" | "low";
  reason: string;
}

export interface Evaluation {
  complete: EvaluationCriterion;
  legible: EvaluationCriterion;
  consistent: EvaluationCriterion;
  genuine: EvaluationCriterion;
  compliant: EvaluationCriterion;
  justified: EvaluationCriterion;
  alignment: Alignment;
  overallPass: boolean;
  summary: string;
}
