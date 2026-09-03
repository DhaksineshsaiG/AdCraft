export interface PosterImageData {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface PosterPriceData {
  amount: number;
  currency: string;
  compareAtAmount?: number;
  formatted?: string;
}

export interface PosterPromotionData {
  discountText?: string;
  discountPercent?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export interface PosterBrandData {
  name?: string;
  logo?: PosterImageData;
}

export interface PosterProductData {
  id?: string;
  name: string;
  image?: PosterImageData;
  description?: string;
  category?: string;
  vendor?: string;
  url?: string;
}

export interface PosterData {
  product: PosterProductData;
  headline: string;
  description?: string;
  price?: PosterPriceData;
  cta?: string;
  promotion?: PosterPromotionData;
  brand?: PosterBrandData;
  footer?: string;
  locale?: string;
  metadata?: Record<string, unknown>;
}
