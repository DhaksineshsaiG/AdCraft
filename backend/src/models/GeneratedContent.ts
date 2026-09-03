import type { IProductDocument } from './Product';

export enum ContentType {
  MARKETING_COPY = 'marketing_copy',
  HEADLINE = 'headline',
  TAGLINE = 'tagline',
  CALL_TO_ACTION = 'call_to_action',
  PRODUCT_DESCRIPTION = 'product_description',
  PROMOTIONAL_TEXT = 'promotional_text',
  IMAGE_PROMPT = 'image_prompt',
}

export enum ContentStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REJECTED = 'rejected',
  APPROVED = 'approved',
}

export enum ContentLanguage {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
  PT = 'pt',
  AR = 'ar',
  ZH = 'zh',
  JA = 'ja',
  HI = 'hi',
  TA = 'ta',
}

export enum AIModel {
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_TURBO = 'gpt-4-turbo',
  DALLE_3 = 'dall-e-3',
  DALLE_2 = 'dall-e-2',
}

export interface IPromptConfig {
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  model: AIModel;
}

export interface IGenerationMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  generationDurationMs: number;
  estimatedCostUsd: number;
  retryCount: number;
}

export interface IContentVariant {
  variantIndex: number;
  index?: number;
  text: string;
  isSelected: boolean;
  userFeedback?: string;
}

export interface IUsageContext {
  posterIds: string[];
  useCount: number;
}

export interface IGeneratedContent {
  _id: string;
  id: string;
  contentType: ContentType;
  status: ContentStatus;
  language: ContentLanguage;
  productName: string;
  productDescription?: string;
  productPrice?: number;
  productCurrency?: string;
  contextKeywords?: string[];
  promptConfig: IPromptConfig;
  variants: IContentVariant[];
  selectedVariantIndex?: number;
  selectedText: string | null;
  rawOutput?: string;
  errorMessage?: string;
  failedAt?: Date;
  metrics?: IGenerationMetrics;
  product: string | IProductDocument;
  store: string;
  owner: string;
  usage: IUsageContext;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IGeneratedContentDocument = IGeneratedContent;
