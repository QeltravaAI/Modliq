export interface AiInsightResponse {
  success: boolean;
  title: string;
  summary: string;
  keyFindings: string[];
  risks: string[];
  recommendations: string[];
  nextActions: {
    action: string;
    ownerRole?: string;
    priority: "Low" | "Medium" | "High" | "Critical";
  }[];
  disclaimer: string;
}

export interface AiRootCauseResponse {
  success: boolean;
  likelyCauses: {
    cause: string;
    evidence: string;
    confidence: "Low" | "Medium" | "High";
  }[];
  recommendedChecks: string[];
  containmentActions: string[];
  correctiveActions: string[];
  preventiveActions: string[];
}

export interface AiCapaResponse {
  success: boolean;
  problemStatement: string;
  containment: string[];
  rootCauseHypotheses: string[];
  correctiveActions: string[];
  preventiveActions: string[];
  verificationPlan: string[];
  ownerRoles: string[];
}

export interface AiSopResponse {
  success: boolean;
  title: string;
  sections: {
    heading: string;
    content: string;
  }[];
}

export interface AiChatResponse {
  success: boolean;
  answer: string;
  suggestedActions: string[];
  referencedData: string[];
}
