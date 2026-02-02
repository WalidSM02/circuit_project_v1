
export interface Project {
  id: string;
  name: string;
  brand?: string;
  description: string;
  detailedDescription?: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  category: string;
  image: string;
  thumbnails?: string[];
  video?: string;
  specs: string[];
  detailedSpecs?: Record<string, string>;
  features?: string[];
  applications?: string[];
  packageIncludes?: string[];
  reference: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockLocation?: string;
  stockCount?: number;
  purchasedRecently?: number;
  addedToCartRecently?: number;
  priceAdjustmentType?: 'none' | 'reduced' | 'increased';
  priceAdjustmentAmount?: number;
}

export interface CartItem extends Project {
  quantity: number;
  // Add this block:
  options?: {
    ieee: boolean;
    pptx: boolean;
  };
}
export enum NavigationTab {
  HOME = 'home',
  BROWSE = 'browse',
  DEALS = 'deals',
  CART = 'cart',
  ACCOUNT = 'account',
  PROJECT_DETAILS = 'project_details'
}
