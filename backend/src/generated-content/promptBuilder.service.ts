import { IProductDocument } from '../models/Product';
import { ContentType, ContentLanguage, AIModel, IPromptConfig } from '../models/GeneratedContent';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum PosterStyle {
  MODERN = 'modern',           // Clean, minimal, contemporary
  BOLD = 'bold',               // High-impact, large typography, strong CTA
  ELEGANT = 'elegant',         // Luxury, refined, premium feel
  PLAYFUL = 'playful',         // Fun, vibrant, informal
  MINIMALIST = 'minimalist',   // Ultra-clean, negative space, no clutter
  VINTAGE = 'vintage',         // Retro aesthetic, classic typography
  PROFESSIONAL = 'professional', // B2B, corporate, trust-focused
}

export enum ContentTone {
  ENTHUSIASTIC = 'enthusiastic',   // High energy, exclamation marks, hype
  PROFESSIONAL = 'professional',   // Authoritative, trustworthy, formal
  FRIENDLY = 'friendly',           // Warm, conversational, approachable
  PLAYFUL = 'playful',             // Fun, informal, light-hearted
  URGENT = 'urgent',               // Scarcity/FOMO-driven, time pressure
  LUXURIOUS = 'luxurious',         // Premium, aspirational, exclusive
  HUMOROUS = 'humorous',           // Wit, wordplay, light-hearted
  INSPIRATIONAL = 'inspirational', // Motivational, empowering, aspirational
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PromptBuildOptions {
  contentType: ContentType;
  style: PosterStyle;
  tone: ContentTone;
  language: ContentLanguage;
  variantCount: number;           // How many variants to ask the model to produce
  customInstructions?: string;    // Optional free-form user override
  discountPercent?: number;       // Used for PROMOTIONAL_TEXT
  callToActionText?: string;      // Override default CTA phrase
}

export interface BuiltPrompt {
  promptConfig: IPromptConfig;
  contextKeywords: string[];
}

// ─── Language Label Map ───────────────────────────────────────────────────────

const LANGUAGE_LABEL: Record<ContentLanguage, string> = {
  [ContentLanguage.EN]: 'English',
  [ContentLanguage.ES]: 'Spanish',
  [ContentLanguage.FR]: 'French',
  [ContentLanguage.DE]: 'German',
  [ContentLanguage.PT]: 'Portuguese',
  [ContentLanguage.AR]: 'Arabic',
  [ContentLanguage.ZH]: 'Chinese (Simplified)',
  [ContentLanguage.JA]: 'Japanese',
  [ContentLanguage.HI]: 'Hindi',
  [ContentLanguage.TA]: 'Tamil',
};

// ─── Model Config per ContentType ─────────────────────────────────────────────
// TEXT-heavy content types → gpt-4o-mini (fast, cheap)
// Nuanced/strategic content → gpt-4o (best quality)
// IMAGE prompts → gpt-4o (prompt engineering quality matters)

function selectModel(contentType: ContentType): AIModel {
  switch (contentType) {
    case ContentType.IMAGE_PROMPT:
    case ContentType.MARKETING_COPY:
      return AIModel.GPT_4O;
    default:
      return AIModel.GPT_4O_MINI;
  }
}

function selectTemperature(tone: ContentTone, contentType: ContentType): number {
  // Image prompts and creative copy benefit from higher variance
  if (contentType === ContentType.IMAGE_PROMPT) return 0.9;
  switch (tone) {
    case ContentTone.HUMOROUS:
    case ContentTone.PLAYFUL:
    case ContentTone.INSPIRATIONAL:
      return 0.85;
    case ContentTone.PROFESSIONAL:
    case ContentTone.LUXURIOUS:
      return 0.6;
    case ContentTone.URGENT:
      return 0.7;
    default:
      return 0.75;
  }
}

function selectMaxTokens(contentType: ContentType): number {
  switch (contentType) {
    case ContentType.MARKETING_COPY: return 600;
    case ContentType.IMAGE_PROMPT:   return 400;
    case ContentType.PRODUCT_DESCRIPTION: return 500;
    case ContentType.PROMOTIONAL_TEXT:    return 300;
    case ContentType.HEADLINE:       return 100;
    case ContentType.TAGLINE:        return 80;
    case ContentType.CALL_TO_ACTION: return 60;
    default:                         return 300;
  }
}

// ─── Product Context Builder ──────────────────────────────────────────────────

function buildProductContext(product: IProductDocument): string {
  const lines: string[] = [];

  lines.push(`Product Name: ${product.name}`);

  if (product.description) {
    const truncated = product.description.slice(0, 600);
    lines.push(`Description: ${truncated}${product.description.length > 600 ? '...' : ''}`);
  }

  if (product.shortDescription) {
    lines.push(`Short Description: ${product.shortDescription}`);
  }

  // Price — format with currency
  const priceStr = product.currency
    ? `${product.currency} ${product.price.toFixed(2)}`
    : product.price.toFixed(2);
  lines.push(`Price: ${priceStr}`);

  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    const saving = ((1 - product.price / product.compareAtPrice) * 100).toFixed(0);
    lines.push(`Original Price: ${product.currency} ${product.compareAtPrice.toFixed(2)} (${saving}% off)`);
  }

  if (product.vendor) {
    lines.push(`Brand / Vendor: ${product.vendor}`);
  }

  if (product.categories.length > 0) {
    lines.push(`Categories: ${product.categories.join(', ')}`);
  }

  if (product.tags.length > 0) {
    lines.push(`Tags / Keywords: ${product.tags.slice(0, 10).join(', ')}`);
  }

  // Processing AI summary (if already processed)
  if (product.processingMetadata?.aiSummary) {
    lines.push(`AI Summary: ${product.processingMetadata.aiSummary}`);
  }

  return lines.join('\n');
}

function extractContextKeywords(product: IProductDocument): string[] {
  const keywords = new Set<string>();

  // Product name words (3+ chars, no duplicates)
  product.name.split(/\s+/).forEach((w) => {
    if (w.length >= 3) keywords.add(w.toLowerCase());
  });

  product.tags.slice(0, 10).forEach((t) => keywords.add(t.toLowerCase()));
  product.categories.slice(0, 5).forEach((c) => keywords.add(c.toLowerCase()));

  if (product.vendor) keywords.add(product.vendor.toLowerCase());
  if (product.productType) keywords.add(product.productType.toLowerCase());

  if (product.processingMetadata?.keywords) {
    product.processingMetadata.keywords.forEach((k) => keywords.add(k.toLowerCase()));
  }

  return Array.from(keywords).slice(0, 20);
}

// ─── System Prompt Templates ──────────────────────────────────────────────────

function buildSystemPrompt(
  contentType: ContentType,
  style: PosterStyle,
  tone: ContentTone,
  language: ContentLanguage,
  variantCount: number
): string {
  const langLabel = LANGUAGE_LABEL[language];
  const variantInstruction =
    variantCount > 1
      ? `Generate exactly ${variantCount} distinct variants. Separate each variant with the delimiter: ---VARIANT---`
      : 'Generate a single piece of text.';

  const toneDescriptions: Record<ContentTone, string> = {
    [ContentTone.ENTHUSIASTIC]: 'high-energy, exciting, and enthusiastic — use strong action words and convey genuine excitement about the product',
    [ContentTone.PROFESSIONAL]: 'authoritative, professional, and trustworthy — focus on quality, reliability, and credibility',
    [ContentTone.FRIENDLY]: 'warm, friendly, and conversational — speak directly to the customer like a helpful friend',
    [ContentTone.PLAYFUL]: 'playful, fun, and informal — use upbeat wording and light-hearted language while still highlighting the product',
    [ContentTone.URGENT]: 'urgent and compelling — create a sense of scarcity or time pressure to drive immediate action',
    [ContentTone.LUXURIOUS]: 'premium, luxurious, and aspirational — emphasise exclusivity, craftsmanship, and elevated lifestyle',
    [ContentTone.HUMOROUS]: 'witty, playful, and humorous — use clever wordplay and light-hearted language while still highlighting the product',
    [ContentTone.INSPIRATIONAL]: 'inspirational and empowering — connect the product to a lifestyle or aspiration the customer wants to achieve',
  };

  const styleDescriptions: Record<PosterStyle, string> = {
    [PosterStyle.MODERN]: 'modern and contemporary — clean language, no clichés, forward-thinking',
    [PosterStyle.BOLD]: 'bold and impactful — short punchy phrases, strong verbs, maximum impact per word',
    [PosterStyle.ELEGANT]: 'elegant and refined — sophisticated vocabulary, flowing sentences, premium feel',
    [PosterStyle.PLAYFUL]: 'playful and vibrant — fun phrasing, informal contractions, youthful energy',
    [PosterStyle.MINIMALIST]: 'minimalist — as few words as possible, every word earning its place',
    [PosterStyle.VINTAGE]: 'vintage and classic — evocative of a bygone era, nostalgic phrasing',
    [PosterStyle.PROFESSIONAL]: 'professional and corporate — clear value propositions, benefit-led language',
  };

  const contentTypeInstructions: Record<ContentType, string> = {
    [ContentType.MARKETING_COPY]: `You are an expert marketing copywriter specialising in product poster copy. 
Write compelling marketing copy for a product poster. The copy should include: a strong headline, 
2-3 benefit-driven sentences, and a call to action. Keep it concise — poster copy should be scannable.`,

    [ContentType.HEADLINE]: `You are an expert advertising copywriter specialising in headlines.
Write a short, punchy, attention-grabbing headline for a product poster. 
Maximum 10 words. No punctuation at the end unless it's an exclamation mark. Do not include a CTA.`,

    [ContentType.TAGLINE]: `You are an expert brand strategist specialising in product taglines.
Write a memorable, concise brand tagline for this product. Maximum 8 words.
It should be memorable, benefit-driven, and work without context.`,

    [ContentType.CALL_TO_ACTION]: `You are an expert conversion copywriter.
Write a short, compelling call-to-action phrase for a product poster. 2-6 words only.
Examples of format: "Shop Now", "Get Yours Today", "Claim Your Discount". Be direct and action-oriented.`,

    [ContentType.PRODUCT_DESCRIPTION]: `You are an expert e-commerce copywriter.
Write an enhanced, benefit-focused product description for use on a marketing poster.
2-4 sentences. Focus on what the product does for the customer, not just what it is.`,

    [ContentType.PROMOTIONAL_TEXT]: `You are an expert promotional copywriter.
Write compelling promotional text highlighting the discount or special offer on this product.
Keep it short, urgent, and benefit-focused. Include the discount/offer details prominently.`,

    [ContentType.IMAGE_PROMPT]: `You are an expert AI image generation prompt engineer specialising in product marketing visuals.
Write a detailed DALL-E image generation prompt for a marketing poster featuring this product.
Include: visual style, colour palette, composition, lighting, mood, and product placement.
Do NOT include any text in the image description. Format: one detailed paragraph.`,
  };

  return `${contentTypeInstructions[contentType]}

Tone: ${toneDescriptions[tone]}.
Visual Style: ${styleDescriptions[style]}.
Output Language: ${langLabel}. Write entirely in ${langLabel}.

${variantInstruction}

Rules:
- Do not include any meta-commentary, explanations, or labels like "Variant 1:" in your output.
- Do not use placeholder text like [Product Name] — use the actual product information provided.
- Do not include markdown formatting.
- Output only the requested text content.`;
}

// ─── User Prompt Templates ────────────────────────────────────────────────────

function buildUserPrompt(
  product: IProductDocument,
  contentType: ContentType,
  options: PromptBuildOptions
): string {
  const productContext = buildProductContext(product);

  const basePrompt = `Here is the product information:\n\n${productContext}`;

  // Content-type specific additions
  const additions: string[] = [];

  if (contentType === ContentType.PROMOTIONAL_TEXT && options.discountPercent) {
    additions.push(`Discount to highlight: ${options.discountPercent}% OFF`);
  }

  if (contentType === ContentType.CALL_TO_ACTION && options.callToActionText) {
    additions.push(`Suggested CTA direction: "${options.callToActionText}"`);
  }

  if (options.customInstructions) {
    additions.push(`Additional instructions: ${options.customInstructions}`);
  }

  const additionBlock = additions.length > 0
    ? `\n\n${additions.join('\n')}`
    : '';

  return `${basePrompt}${additionBlock}\n\nPlease generate the ${contentType.replace(/_/g, ' ')} now.`;
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export function buildPrompt(
  product: IProductDocument,
  options: PromptBuildOptions
): BuiltPrompt {
  const {
    contentType,
    style,
    tone,
    language,
    variantCount,
  } = options;

  const clampedVariants = Math.max(1, Math.min(variantCount, 5));

  const systemPrompt = buildSystemPrompt(contentType, style, tone, language, clampedVariants);
  const userPrompt = buildUserPrompt(product, contentType, options);

  const promptConfig: IPromptConfig = {
    systemPrompt,
    userPrompt,
    temperature: selectTemperature(tone, contentType),
    maxTokens: selectMaxTokens(contentType),
    frequencyPenalty: 0.3,   // Mild penalty to reduce repetitive phrasing across variants
    presencePenalty: 0.2,    // Mild penalty to encourage topical diversity
    model: selectModel(contentType),
  };

  return {
    promptConfig,
    contextKeywords: extractContextKeywords(product),
  };
}

/**
 * Parse a multi-variant response from the model.
 * The system prompt instructs the model to separate variants with ---VARIANT---
 * so this splits on that delimiter. Falls back to the full text as one variant.
 */
export function parseVariants(rawTexts: string[], expectedCount: number): string[] {
  // If multiple API completions were requested (n > 1), each rawText is one variant
  if (rawTexts.length > 1) {
    return rawTexts.slice(0, expectedCount).map((t) => t.trim()).filter(Boolean);
  }

  // Single completion with ---VARIANT--- delimiters
  const singleText = rawTexts[0] ?? '';
  const parts = singleText
    .split(/---\s*VARIANT(?:\s*\d+)?\s*---/i)
    .map((p) => cleanVariantText(p))
    .filter(Boolean);

  // If parsing produced the right number, return them
  if (parts.length >= 1) {
    return parts.slice(0, expectedCount);
  }

  return [cleanVariantText(singleText)];
}

function cleanVariantText(text: string): string {
  return text
    .replace(/^\s*(?:variant\s*\d+[:.)-]?|---\s*variant(?:\s*\d+)?\s*---)\s*/i, '')
    .trim();
}
