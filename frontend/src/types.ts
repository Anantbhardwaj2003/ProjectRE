export interface Property {
  id: string;
  title: string;
  price: string;
  priceRaw: number;
  location: string;
  city: string;
  bhk: number;
  bathrooms: number;
  areaSqFt: number;
  type: 'Apartment' | 'Villa' | 'Independent House';
  status: 'Ready to move' | 'Under Construction';
  imageUrl: string;
  isFeatured: boolean;
  agent: string;
  postedAt: string;
  coordinates?: [number, number]; // [latitude, longitude]
  amenities?: string[];
}
