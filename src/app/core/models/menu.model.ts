export interface Size {
  label: string;
  price: number;
}

export interface Extra {
  label: string;
  price: number;
}

export interface MenuItem {
  id: number;
  name: string;
  desc: string;
  basePrice: number;
  imageUrl?: string;

  hasSpreads?: boolean;
  hasVeggies?: boolean;
  hasSauces?: boolean;
  hasExtras?: boolean;

  hasSizeOption?: boolean;
  sizes?: Size[];

  hasBurgerSize?: boolean;
  burgerSizes?: Size[];
  specialPrice?: boolean;

  defaultVeggies?: string[];
  defaultSauces?: string[];
  fixedVeggies?: string[];
  fixedSauces?: string[];
  fixedExtras?: string[];

  extras?: Extra[];
  burgerExtras?: Extra[];
}

export interface MenuCategory {
  icon: string;
  title: string;
  sub: string;
  order: number;
  items: Record<number, MenuItem> | null;
}

export type MenuData = Record<string, MenuCategory>;

export interface MenuMeta {
  extras: Extra[];
  sauces: string[];
  veggies: string[];
  spreads: string[];
}

export interface CustomSelections {
  size: number | null;
  burgerSize: number | null;
  spreads: string[];
  veggies: string[];
  sauces: string[];
  extras: number[];
  globalExtras: number[];
  burgerExtras: number[];
}
