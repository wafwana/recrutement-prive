export type AiProvider = "openai" | "gemini";

export type DataPrivacyClassification =
  | "REAL_CV"
  | "CANDIDATE_DATA"
  | "CONFIDENTIAL_ENTERPRISE"
  | "PUBLIC_OFFER"
  | "MOCK_DATA";

export type AiAnalysisContext = {
  classification: DataPrivacyClassification;
  isMockData?: boolean;
  containsPii?: boolean;
  isPseudonymized?: boolean;
  isConfidentialEnterprise?: boolean;
};

export type AiStructuredRequest<T = unknown> = {
  systemPrompt?: string;
  userPrompt: string;
  fileInput?: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  };
  jsonSchemaName: string;
  jsonSchema: Record<string, unknown>;
  context: AiAnalysisContext;
  modelOverride?: string;
};

export type AiAnalysisResponse<T> = {
  providerUsed: AiProvider;
  data: T | null;
  blockedReason?: string;
};
