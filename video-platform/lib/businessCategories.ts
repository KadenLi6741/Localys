// Single source of truth for the business category options shown in the
// create-business onboarding and in Localys Manager → Settings. `type` maps to
// businesses.business_type; `id` maps to businesses.category (matches the
// storefront category ids on the customer Home).
export interface BusinessCategoryOption {
  id: string;
  label: string;
  type: string;
}

export const CATEGORY_OPTIONS: BusinessCategoryOption[] = [
  { id: 'grocery', label: 'Grocery', type: 'retail' },
  { id: 'fast-food', label: 'Fast Food', type: 'food' },
  { id: 'bakery', label: 'Bakery', type: 'food' },
  { id: 'restaurants', label: 'Restaurants', type: 'food' },
  { id: 'flowers', label: 'Flower Shops', type: 'retail' },
  { id: 'services', label: 'Services', type: 'service' },
  { id: 'cafes', label: 'Cafés', type: 'food' },
  { id: 'clothing', label: 'Clothing', type: 'retail' },
  { id: 'toys', label: 'Toy Stores', type: 'retail' },
  { id: 'pet', label: 'Pet', type: 'retail' },
  { id: 'health', label: 'Health', type: 'service' },
];
