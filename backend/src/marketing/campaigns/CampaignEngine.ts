export type CampaignName =
  | 'Default'
  | 'Luxury'
  | 'Summer'
  | 'Winter'
  | 'Festival'
  | 'Black Friday'
  | 'New Arrival'
  | 'Clearance'
  | 'Minimal'
  | 'Premium';

export interface CampaignDefinition {
  name: CampaignName;
  verbs: string[];
  adjectives: string[];
  benefits: string[];
  cta: string[];
  emotions: string[];
  templateGroups: string[];
  keywords: string[];
}

const CAMPAIGNS: Record<CampaignName, CampaignDefinition> = {
  Default: {
    name: 'Default',
    verbs: ['discover', 'choose', 'explore', 'upgrade'],
    adjectives: ['reliable', 'fresh', 'everyday', 'smart'],
    benefits: ['everyday confidence', 'better routines', 'lasting value'],
    cta: ['Explore Collection', 'Shop Now', 'Discover More'],
    emotions: ['confident', 'ready', 'satisfied'],
    templateGroups: ['Benefit', 'Action', 'Feature-first'],
    keywords: ['everyday', 'collection', 'trusted'],
  },
  Luxury: {
    name: 'Luxury',
    verbs: ['indulge', 'elevate', 'refine', 'experience'],
    adjectives: ['luxury', 'refined', 'exclusive', 'signature'],
    benefits: ['premium presence', 'elevated style', 'lasting impression'],
    cta: ['Experience Luxury', 'Discover The Signature', 'Indulge Today'],
    emotions: ['sophisticated', 'alluring', 'polished'],
    templateGroups: ['Luxury', 'Premium', 'Storytelling'],
    keywords: ['luxury', 'signature', 'premium'],
  },
  Summer: {
    name: 'Summer',
    verbs: ['refresh', 'brighten', 'explore', 'move'],
    adjectives: ['sun-ready', 'light', 'fresh', 'vibrant'],
    benefits: ['seasonal ease', 'fresh energy', 'warm-weather confidence'],
    cta: ['Shop Summer Picks', 'Refresh For Summer', 'Explore The Season'],
    emotions: ['bright', 'free', 'energized'],
    templateGroups: ['Emotion', 'Lifestyle', 'Action'],
    keywords: ['summer', 'fresh', 'seasonal'],
  },
  Winter: {
    name: 'Winter',
    verbs: ['warm', 'comfort', 'layer', 'settle'],
    adjectives: ['cozy', 'warm', 'seasonal', 'comforting'],
    benefits: ['cold-weather comfort', 'cozy routines', 'winter-ready value'],
    cta: ['Shop Winter Essentials', 'Warm The Season', 'Choose Cozy'],
    emotions: ['cozy', 'calm', 'restored'],
    templateGroups: ['Benefit', 'Lifestyle', 'Minimal'],
    keywords: ['winter', 'warm', 'cozy'],
  },
  Festival: {
    name: 'Festival',
    verbs: ['celebrate', 'gift', 'shine', 'share'],
    adjectives: ['festive', 'radiant', 'joyful', 'gift-ready'],
    benefits: ['celebration-ready style', 'memorable gifting', 'festive energy'],
    cta: ['Shop Festival Picks', 'Celebrate Now', 'Gift The Moment'],
    emotions: ['joyful', 'radiant', 'connected'],
    templateGroups: ['Emotion', 'Luxury', 'Collection'],
    keywords: ['festival', 'celebrate', 'gift'],
  },
  'Black Friday': {
    name: 'Black Friday',
    verbs: ['save', 'claim', 'grab', 'upgrade'],
    adjectives: ['limited', 'bold', 'deal-ready', 'exclusive'],
    benefits: ['limited-time value', 'big upgrade energy', 'smart savings'],
    cta: ['Shop Black Friday', 'Claim The Deal', 'Upgrade Today'],
    emotions: ['urgent', 'excited', 'smart'],
    templateGroups: ['Urgency', 'Action', 'Performance'],
    keywords: ['black friday', 'deal', 'limited'],
  },
  'New Arrival': {
    name: 'New Arrival',
    verbs: ['meet', 'discover', 'launch', 'introduce'],
    adjectives: ['new', 'fresh', 'latest', 'just-landed'],
    benefits: ['first-look confidence', 'fresh style', 'new-season value'],
    cta: ['Shop New Arrivals', 'See What Is New', 'Explore The Drop'],
    emotions: ['curious', 'inspired', 'ready'],
    templateGroups: ['Question', 'Action', 'Collection'],
    keywords: ['new', 'arrival', 'latest'],
  },
  Clearance: {
    name: 'Clearance',
    verbs: ['save', 'clear', 'claim', 'shop'],
    adjectives: ['last-chance', 'value-packed', 'limited', 'smart'],
    benefits: ['clearance value', 'smart savings', 'last-chance finds'],
    cta: ['Shop Clearance', 'Claim The Savings', 'Find Final Picks'],
    emotions: ['smart', 'decisive', 'excited'],
    templateGroups: ['Urgency', 'Action', 'Collection'],
    keywords: ['clearance', 'savings', 'final'],
  },
  Minimal: {
    name: 'Minimal',
    verbs: ['simplify', 'refine', 'clear', 'balance'],
    adjectives: ['minimal', 'clean', 'quiet', 'essential'],
    benefits: ['cleaner routines', 'quiet confidence', 'essential value'],
    cta: ['Shop Simply', 'Explore Essentials', 'Choose Clean Design'],
    emotions: ['calm', 'clear', 'settled'],
    templateGroups: ['Minimal', 'Feature-first', 'Benefit'],
    keywords: ['minimal', 'clean', 'essential'],
  },
  Premium: {
    name: 'Premium',
    verbs: ['elevate', 'upgrade', 'craft', 'refine'],
    adjectives: ['premium', 'crafted', 'advanced', 'polished'],
    benefits: ['premium quality', 'better detail', 'lasting confidence'],
    cta: ['Choose Premium', 'Upgrade The Experience', 'Explore Premium Picks'],
    emotions: ['confident', 'assured', 'elevated'],
    templateGroups: ['Premium', 'Luxury', 'Benefit'],
    keywords: ['premium', 'crafted', 'quality'],
  },
};

export class CampaignEngine {
  getCampaign(campaign: CampaignName = 'Default'): CampaignDefinition {
    return CAMPAIGNS[campaign] ?? CAMPAIGNS.Default;
  }

  listCampaigns(): CampaignName[] {
    return Object.keys(CAMPAIGNS) as CampaignName[];
  }
}

export default CampaignEngine;
