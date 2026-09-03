import {
  PosterSize,
  IPosterDimensions,
} from '../models/Poster';
import { PosterStyle } from '../generated-content/promptBuilder.service';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface TextLayer {
  role: 'headline' | 'tagline' | 'price' | 'cta' | 'description' | 'brand';
  // Normalised position (0â€“1 relative to canvas width/height)
  x: number;
  y: number;
  // Normalised size
  width: number;
  maxHeight: number;
  // Typography
  fontSize: number;         // Base size in px at 1080-wide canvas; scales proportionally
  fontWeight: 'normal' | 'bold' | 'semibold' | 'light';
  fontFamily: string;
  align: 'left' | 'center' | 'right';
  color: string;            // Hex
  opacity: number;          // 0â€“1
  // Cloudinary transformation gravity equivalent
  gravity: 'north' | 'south' | 'center' | 'north_west' | 'north_east' | 'south_west' | 'south_east';
}

export interface ImageLayer {
  role: 'product_image' | 'background' | 'overlay';
  x: number;                // Normalised 0â€“1
  y: number;
  width: number;            // Normalised 0â€“1
  height: number;
  gravity: string;
  // Cloudinary transformation parameters
  crop?: 'fill' | 'fit' | 'pad' | 'scale' | 'thumb';
  effect?: string;          // e.g. 'blur:300', 'brightness:30'
  opacity?: number;         // 0â€“100 (Cloudinary scale)
  borderRadius?: number;    // px
}

export interface LayoutZone {
  // Named zones for text positioning (normalised 0â€“1)
  imageZone: { x: number; y: number; width: number; height: number };
  textZone: { x: number; y: number; width: number; height: number };
  layout: 'image_top' | 'image_left' | 'image_right' | 'image_full' | 'image_bottom';
}

export interface PosterTemplate {
  id: string;
  name: string;
  description: string;
  style: PosterStyle;
  supportedSizes: PosterSize[];
  // Canvas config
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  // Layers (rendered bottom to top)
  imageLayers: ImageLayer[];
  textLayers: TextLayer[];
  // Layout zones (used by imageComposition to place Cloudinary layers)
  layout: LayoutZone;
  // Overlay / border elements
  showBorder: boolean;
  borderColor?: string;
  borderWidthPx: number;
  showPriceBadge: boolean;
  priceBadgeColor: string;
  // Watermark
  showWatermark: boolean;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
}

// â”€â”€â”€ Dimension Map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const POSTER_SIZE_DIMENSIONS: Record<PosterSize, IPosterDimensions> = {
  [PosterSize.SQUARE]:      { width: 1080, height: 1080, unit: 'px' },
  [PosterSize.PORTRAIT]:    { width: 1080, height: 1350, unit: 'px' },
  [PosterSize.LANDSCAPE]:   { width: 1920, height: 1080, unit: 'px' },
  [PosterSize.A4_PORTRAIT]: { width: 2480, height: 3508, unit: 'px' },
  [PosterSize.STORY]:       { width: 1080, height: 1920, unit: 'px' },
  [PosterSize.CUSTOM]:      { width: 1080, height: 1080, unit: 'px' },
};

// â”€â”€â”€ Default Template Catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// These are built-in templates â€” no DB required.
// Custom user templates would be stored in PostgreSQL (future extension).

const DEFAULT_TEMPLATES: PosterTemplate[] = [

  // â”€â”€ Modern â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_modern_clean',
    name: 'Modern Clean',
    description: 'Clean white background with product image on top and bold headline below.',
    style: PosterStyle.MODERN,
    supportedSizes: [PosterSize.SQUARE, PosterSize.PORTRAIT, PosterSize.STORY],
    backgroundColor: '#FFFFFF',
    accentColor: '#1A1A2E',
    textColor: '#1A1A2E',
    showBorder: false,
    borderColor: undefined,
    borderWidthPx: 0,
    showPriceBadge: true,
    priceBadgeColor: '#1A1A2E',
    showWatermark: false,
    layout: {
      imageZone:  { x: 0,    y: 0,    width: 1,    height: 0.55 },
      textZone:   { x: 0.05, y: 0.57, width: 0.90, height: 0.40 },
      layout: 'image_top',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0, y: 0, width: 1, height: 0.55,
        gravity: 'north',
        crop: 'fill',
      },
    ],
    textLayers: [
      { role: 'headline',    x: 0.05, y: 0.58, width: 0.90, maxHeight: 0.12, fontSize: 48, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'center', color: '#1A1A2E', opacity: 1, gravity: 'north' },
      { role: 'description', x: 0.05, y: 0.72, width: 0.90, maxHeight: 0.10, fontSize: 24, fontWeight: 'normal',   fontFamily: 'sans-serif', align: 'center', color: '#555555', opacity: 1, gravity: 'north' },
      { role: 'price',       x: 0.05, y: 0.85, width: 0.45, maxHeight: 0.08, fontSize: 36, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left',   color: '#1A1A2E', opacity: 1, gravity: 'south_west' },
      { role: 'cta',         x: 0.50, y: 0.85, width: 0.45, maxHeight: 0.08, fontSize: 28, fontWeight: 'semibold', fontFamily: 'sans-serif', align: 'right',  color: '#FFFFFF', opacity: 1, gravity: 'south_east' },
    ],
  },

  // â”€â”€ Bold â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_bold_impact',
    name: 'Bold Impact',
    description: 'Dark background, large headline, product image on the right.',
    style: PosterStyle.BOLD,
    supportedSizes: [PosterSize.SQUARE, PosterSize.LANDSCAPE, PosterSize.PORTRAIT],
    backgroundColor: '#0D0D0D',
    accentColor: '#FF4444',
    textColor: '#FFFFFF',
    showBorder: true,
    borderColor: '#FF4444',
    borderWidthPx: 6,
    showPriceBadge: true,
    priceBadgeColor: '#FF4444',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.5,  y: 0,    width: 0.50, height: 1    },
      textZone:  { x: 0.04, y: 0.05, width: 0.44, height: 0.90 },
      layout: 'image_right',
    },
    imageLayers: [
      {
        role: 'background',
        x: 0, y: 0, width: 1, height: 1,
        gravity: 'center',
        crop: 'fill',
        effect: 'blur:600',
        opacity: 20,
      },
      {
        role: 'product_image',
        x: 0.5, y: 0, width: 0.5, height: 1,
        gravity: 'east',
        crop: 'fill',
      },
    ],
    textLayers: [
      { role: 'tagline',     x: 0.04, y: 0.06, width: 0.44, maxHeight: 0.06, fontSize: 20, fontWeight: 'semibold', fontFamily: 'sans-serif', align: 'left', color: '#FF4444', opacity: 1, gravity: 'north_west' },
      { role: 'headline',    x: 0.04, y: 0.14, width: 0.44, maxHeight: 0.22, fontSize: 56, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#FFFFFF', opacity: 1, gravity: 'north_west' },
      { role: 'description', x: 0.04, y: 0.40, width: 0.44, maxHeight: 0.12, fontSize: 22, fontWeight: 'normal',   fontFamily: 'sans-serif', align: 'left', color: '#CCCCCC', opacity: 1, gravity: 'north_west' },
      { role: 'price',       x: 0.04, y: 0.82, width: 0.25, maxHeight: 0.10, fontSize: 42, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#FF4444', opacity: 1, gravity: 'south_west' },
      { role: 'cta',         x: 0.04, y: 0.92, width: 0.44, maxHeight: 0.06, fontSize: 26, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#FFFFFF', opacity: 1, gravity: 'south_west' },
    ],
  },

  // â”€â”€ Elegant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_elegant_luxury',
    name: 'Elegant Luxury',
    description: 'Cream background, serif-inspired typography, centred product image.',
    style: PosterStyle.ELEGANT,
    supportedSizes: [PosterSize.PORTRAIT, PosterSize.A4_PORTRAIT, PosterSize.SQUARE],
    backgroundColor: '#F8F4EF',
    accentColor: '#B8860B',
    textColor: '#2C2C2C',
    showBorder: true,
    borderColor: '#B8860B',
    borderWidthPx: 3,
    showPriceBadge: false,
    priceBadgeColor: '#B8860B',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.1,  y: 0.08, width: 0.80, height: 0.50 },
      textZone:  { x: 0.07, y: 0.62, width: 0.86, height: 0.34 },
      layout: 'image_top',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0.1, y: 0.08, width: 0.8, height: 0.50,
        gravity: 'center',
        crop: 'fit',
        borderRadius: 4,
      },
    ],
    textLayers: [
      { role: 'tagline',     x: 0.07, y: 0.62, width: 0.86, maxHeight: 0.06, fontSize: 18, fontWeight: 'light',    fontFamily: 'serif', align: 'center', color: '#B8860B', opacity: 1, gravity: 'north' },
      { role: 'headline',    x: 0.07, y: 0.70, width: 0.86, maxHeight: 0.12, fontSize: 40, fontWeight: 'bold',     fontFamily: 'serif', align: 'center', color: '#2C2C2C', opacity: 1, gravity: 'north' },
      { role: 'description', x: 0.07, y: 0.84, width: 0.86, maxHeight: 0.08, fontSize: 20, fontWeight: 'light',    fontFamily: 'serif', align: 'center', color: '#555555', opacity: 1, gravity: 'north' },
      { role: 'price',       x: 0.07, y: 0.93, width: 0.40, maxHeight: 0.05, fontSize: 28, fontWeight: 'semibold', fontFamily: 'serif', align: 'left',   color: '#B8860B', opacity: 1, gravity: 'south_west' },
      { role: 'cta',         x: 0.53, y: 0.93, width: 0.40, maxHeight: 0.05, fontSize: 22, fontWeight: 'light',    fontFamily: 'serif', align: 'right',  color: '#2C2C2C', opacity: 1, gravity: 'south_east' },
    ],
  },

  // â”€â”€ Playful â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_playful_vibrant',
    name: 'Playful Vibrant',
    description: 'Colourful gradient background, rounded elements, fun layout.',
    style: PosterStyle.PLAYFUL,
    supportedSizes: [PosterSize.SQUARE, PosterSize.STORY, PosterSize.PORTRAIT],
    backgroundColor: '#FFE66D',
    accentColor: '#FF6B6B',
    textColor: '#2D3436',
    showBorder: false,
    borderColor: undefined,
    borderWidthPx: 0,
    showPriceBadge: true,
    priceBadgeColor: '#FF6B6B',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.10, y: 0.05, width: 0.80, height: 0.50 },
      textZone:  { x: 0.05, y: 0.57, width: 0.90, height: 0.40 },
      layout: 'image_top',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0.10, y: 0.05, width: 0.80, height: 0.50,
        gravity: 'center',
        crop: 'fit',
        borderRadius: 24,
      },
    ],
    textLayers: [
      { role: 'headline',    x: 0.05, y: 0.58, width: 0.90, maxHeight: 0.14, fontSize: 52, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'center', color: '#2D3436', opacity: 1, gravity: 'north' },
      { role: 'tagline',     x: 0.05, y: 0.74, width: 0.90, maxHeight: 0.08, fontSize: 24, fontWeight: 'normal',   fontFamily: 'sans-serif', align: 'center', color: '#636E72', opacity: 1, gravity: 'north' },
      { role: 'price',       x: 0.05, y: 0.84, width: 0.40, maxHeight: 0.08, fontSize: 38, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left',   color: '#FF6B6B', opacity: 1, gravity: 'south_west' },
      { role: 'cta',         x: 0.55, y: 0.84, width: 0.40, maxHeight: 0.08, fontSize: 26, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'right',  color: '#2D3436', opacity: 1, gravity: 'south_east' },
    ],
  },

  // â”€â”€ Minimalist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_minimalist_clean',
    name: 'Minimalist Clean',
    description: 'All-white canvas, product image centred, single bold headline.',
    style: PosterStyle.MINIMALIST,
    supportedSizes: [PosterSize.SQUARE, PosterSize.PORTRAIT, PosterSize.LANDSCAPE],
    backgroundColor: '#FAFAFA',
    accentColor: '#000000',
    textColor: '#000000',
    showBorder: false,
    borderColor: undefined,
    borderWidthPx: 0,
    showPriceBadge: false,
    priceBadgeColor: '#000000',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.20, y: 0.10, width: 0.60, height: 0.55 },
      textZone:  { x: 0.05, y: 0.68, width: 0.90, height: 0.28 },
      layout: 'image_top',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0.20, y: 0.10, width: 0.60, height: 0.55,
        gravity: 'center',
        crop: 'fit',
      },
    ],
    textLayers: [
      { role: 'headline',    x: 0.05, y: 0.69, width: 0.90, maxHeight: 0.10, fontSize: 44, fontWeight: 'bold',   fontFamily: 'sans-serif', align: 'center', color: '#000000', opacity: 1, gravity: 'north' },
      { role: 'price',       x: 0.05, y: 0.80, width: 0.40, maxHeight: 0.07, fontSize: 30, fontWeight: 'normal', fontFamily: 'sans-serif', align: 'left',   color: '#333333', opacity: 1, gravity: 'south_west' },
      { role: 'cta',         x: 0.55, y: 0.80, width: 0.40, maxHeight: 0.07, fontSize: 22, fontWeight: 'light',  fontFamily: 'sans-serif', align: 'right',  color: '#000000', opacity: 1, gravity: 'south_east' },
    ],
  },

  // â”€â”€ Vintage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_vintage_retro',
    name: 'Vintage Retro',
    description: 'Warm parchment tones, ornamental border, classic typography.',
    style: PosterStyle.VINTAGE,
    supportedSizes: [PosterSize.PORTRAIT, PosterSize.SQUARE, PosterSize.A4_PORTRAIT],
    backgroundColor: '#F5E6C8',
    accentColor: '#8B4513',
    textColor: '#3E2005',
    showBorder: true,
    borderColor: '#8B4513',
    borderWidthPx: 8,
    showPriceBadge: false,
    priceBadgeColor: '#8B4513',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.12, y: 0.10, width: 0.76, height: 0.45 },
      textZone:  { x: 0.07, y: 0.58, width: 0.86, height: 0.36 },
      layout: 'image_top',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0.12, y: 0.10, width: 0.76, height: 0.45,
        gravity: 'center',
        crop: 'fit',
        effect: 'sepia:40',
      },
    ],
    textLayers: [
      { role: 'tagline',     x: 0.07, y: 0.58, width: 0.86, maxHeight: 0.06, fontSize: 18, fontWeight: 'normal',   fontFamily: 'serif', align: 'center', color: '#8B4513', opacity: 1, gravity: 'north' },
      { role: 'headline',    x: 0.07, y: 0.66, width: 0.86, maxHeight: 0.14, fontSize: 42, fontWeight: 'bold',     fontFamily: 'serif', align: 'center', color: '#3E2005', opacity: 1, gravity: 'north' },
      { role: 'description', x: 0.07, y: 0.82, width: 0.86, maxHeight: 0.08, fontSize: 20, fontWeight: 'light',    fontFamily: 'serif', align: 'center', color: '#5C3317', opacity: 1, gravity: 'north' },
      { role: 'price',       x: 0.07, y: 0.91, width: 0.40, maxHeight: 0.06, fontSize: 28, fontWeight: 'semibold', fontFamily: 'serif', align: 'left',   color: '#8B4513', opacity: 1, gravity: 'south_west' },
    ],
  },

  // â”€â”€ Professional â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  {
    id: 'tpl_professional_corporate',
    name: 'Professional Corporate',
    description: 'Navy header band, white body, trust-focused layout.',
    style: PosterStyle.PROFESSIONAL,
    supportedSizes: [PosterSize.LANDSCAPE, PosterSize.SQUARE, PosterSize.PORTRAIT, PosterSize.A4_PORTRAIT],
    backgroundColor: '#FFFFFF',
    accentColor: '#1B3A6B',
    textColor: '#1B3A6B',
    showBorder: false,
    borderColor: undefined,
    borderWidthPx: 0,
    showPriceBadge: true,
    priceBadgeColor: '#1B3A6B',
    showWatermark: false,
    layout: {
      imageZone: { x: 0.55, y: 0.10, width: 0.40, height: 0.80 },
      textZone:  { x: 0.04, y: 0.05, width: 0.48, height: 0.90 },
      layout: 'image_right',
    },
    imageLayers: [
      {
        role: 'product_image',
        x: 0.55, y: 0.10, width: 0.40, height: 0.80,
        gravity: 'east',
        crop: 'fit',
      },
    ],
    textLayers: [
      { role: 'brand',       x: 0.04, y: 0.05, width: 0.48, maxHeight: 0.06, fontSize: 16, fontWeight: 'semibold', fontFamily: 'sans-serif', align: 'left', color: '#1B3A6B', opacity: 0.6, gravity: 'north_west' },
      { role: 'headline',    x: 0.04, y: 0.14, width: 0.48, maxHeight: 0.20, fontSize: 48, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#1B3A6B', opacity: 1,   gravity: 'north_west' },
      { role: 'description', x: 0.04, y: 0.38, width: 0.48, maxHeight: 0.18, fontSize: 22, fontWeight: 'normal',   fontFamily: 'sans-serif', align: 'left', color: '#444444', opacity: 1,   gravity: 'north_west' },
      { role: 'price',       x: 0.04, y: 0.78, width: 0.25, maxHeight: 0.08, fontSize: 36, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#1B3A6B', opacity: 1,   gravity: 'south_west' },
      { role: 'cta',         x: 0.04, y: 0.88, width: 0.48, maxHeight: 0.07, fontSize: 24, fontWeight: 'bold',     fontFamily: 'sans-serif', align: 'left', color: '#FFFFFF', opacity: 1,   gravity: 'south_west' },
    ],
  },
];

// â”€â”€â”€ Template Registry (in-memory, keyed by id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEMPLATE_MAP = new Map<string, PosterTemplate>(
  DEFAULT_TEMPLATES.map((t) => [t.id, t])
);

// â”€â”€â”€ Service Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Get all default templates, optionally filtered by style.
 */
export function getTemplates(style?: PosterStyle): PosterTemplate[] {
  const all = DEFAULT_TEMPLATES;
  if (!style) return all;
  return all.filter((t) => t.style === style);
}

/**
 * Get a single template by ID.
 */
export function getTemplateById(templateId: string): PosterTemplate | null {
  return TEMPLATE_MAP.get(templateId) ?? null;
}

/**
 * Select the best default template for a given style and poster size.
 * Falls back to the first template of the requested style, then to Modern.
 */
export function selectTemplate(style: PosterStyle, size: PosterSize): PosterTemplate {
  // First pass: exact style + size match
  const exactMatch = DEFAULT_TEMPLATES.find(
    (t) => t.style === style && t.supportedSizes.includes(size)
  );
  if (exactMatch) return exactMatch;

  // Second pass: any template with this style
  const styleMatch = DEFAULT_TEMPLATES.find((t) => t.style === style);
  if (styleMatch) return styleMatch;

  // Fallback: modern clean
  return DEFAULT_TEMPLATES[0]!;
}

/**
 * Validate a template is suitable for the given poster size.
 */
export function validateTemplate(
  template: PosterTemplate,
  size: PosterSize
): TemplateValidationResult {
  const errors: string[] = [];

  if (!template.supportedSizes.includes(size)) {
    errors.push(
      `Template "${template.name}" does not support size "${size}". ` +
      `Supported: ${template.supportedSizes.join(', ')}.`
    );
  }

  if (template.textLayers.length === 0) {
    errors.push('Template must have at least one text layer.');
  }

  if (template.imageLayers.length === 0) {
    errors.push('Template must have at least one image layer.');
  }

  // Validate normalised coordinates are in bounds
  for (const layer of template.textLayers) {
    if (layer.x < 0 || layer.x > 1 || layer.y < 0 || layer.y > 1) {
      errors.push(`Text layer "${layer.role}" has out-of-bounds position (x:${layer.x}, y:${layer.y}).`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Resolve the canvas dimensions for a poster size.
 */
export function resolveDimensions(
  size: PosterSize,
  customWidth?: number,
  customHeight?: number
): IPosterDimensions {
  if (size === PosterSize.CUSTOM) {
    if (!customWidth || !customHeight) {
      return POSTER_SIZE_DIMENSIONS[PosterSize.SQUARE]; // Safe default
    }
    return { width: customWidth, height: customHeight, unit: 'px' };
  }
  return POSTER_SIZE_DIMENSIONS[size];
}

/**
 * List all available styles (for the frontend style-picker dropdown).
 */
export function getAvailableStyles(): Array<{ style: PosterStyle; templateCount: number; defaultTemplateId: string }> {
  return Object.values(PosterStyle).map((style) => {
    const templates = getTemplates(style);
    return {
      style,
      templateCount: templates.length,
      defaultTemplateId: templates[0]?.id ?? '',
    };
  });
}
