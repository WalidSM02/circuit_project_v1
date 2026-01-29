
export interface Project {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  category: string;
  image: string;
  video?: string; // Support for project videos
  specs: string[];
  reference: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
}

export interface CartItem extends Project {
  quantity: number;
}

export enum NavigationTab {
  HOME = 'home',
  BROWSE = 'browse',
  DEALS = 'deals',
  CART = 'cart',
  ACCOUNT = 'account'
}
