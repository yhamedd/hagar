export interface ServiceCatalogItem {
  id: number;
  name: string;
  category: "lashes" | "nails" | "extras";
  price: number | null;
  priceMax: number | null;
  priceLabel: string;
  duration: number;
}
