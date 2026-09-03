export type MarketingCategory =
  | 'Footwear'
  | 'Fragrance'
  | 'Electronics'
  | 'Jewelry'
  | 'Coffee'
  | 'Fashion'
  | 'Furniture'
  | 'Sports'
  | 'General';

export interface ProductClassificationInput {
  title?: string;
  category?: string;
  description?: string;
  tags?: string[];
}

const CATEGORY_RULES: Array<{
  category: MarketingCategory;
  keywords: string[];
}> = [
  {
    category: 'Footwear',
    keywords: [
      'sneaker',
      'sneakers',
      'running shoe',
      'running shoes',
      'boot',
      'boots',
      'sandal',
      'sandals',
      'shoe',
      'shoes',
      'trainer',
      'trainers',
      'athletic shoe',
      'walking shoe',
    ],
  },
  {
    category: 'Fragrance',
    keywords: ['perfume', 'cologne', 'fragrance', 'eau de parfum', 'eau de toilette', 'scent'],
  },
  {
    category: 'Electronics',
    keywords: [
      'laptop',
      'phone',
      'tablet',
      'monitor',
      'smartphone',
      'headphones',
      'camera',
      'earbuds',
      'earbud',
      'speaker',
      'keyboard',
      'smart watch',
      'watch',
      'bluetooth',
      'wireless',
    ],
  },
  {
    category: 'Jewelry',
    keywords: ['bracelet', 'ring', 'necklace', 'earrings', 'earring', 'pendant', 'bangle'],
  },
  {
    category: 'Coffee',
    keywords: ['coffee', 'tea', 'mug', 'cup', 'espresso', 'latte', 'brew'],
  },
  {
    category: 'Fashion',
    keywords: ['dress', 'shirt', 'jacket', 'jeans', 'coat', 'blazer', 'hoodie', 'skirt'],
  },
  {
    category: 'Furniture',
    keywords: ['chair', 'desk', 'sofa', 'table', 'couch', 'cabinet', 'shelf', 'bed'],
  },
  {
    category: 'Sports',
    keywords: [
      'fitness',
      'training',
      'sport',
      'sports',
      'gym',
      'yoga',
      'basketball',
      'football',
      'running backpack',
      'backpack',
      'water bottle',
      'hydration',
      'workout',
    ],
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesKeyword(text: string, keyword: string): boolean {
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}([^a-z0-9]|$)`, 'i');
  return pattern.test(text);
}

export class CategoryDetector {
  detect(product: ProductClassificationInput): MarketingCategory {
    const searchableText = [
      product.title,
      product.category,
      product.description,
      ...(product.tags ?? []),
    ]
      .filter((value): value is string => Boolean(value?.trim()))
      .join(' ')
      .toLowerCase();

    if (!searchableText) return 'General';

    const match = CATEGORY_RULES.find((rule) =>
      rule.keywords.some((keyword) => includesKeyword(searchableText, keyword))
    );

    return match?.category ?? 'General';
  }
}

export default CategoryDetector;
