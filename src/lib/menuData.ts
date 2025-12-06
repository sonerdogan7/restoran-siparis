import { Category } from '@/types';

export const menuData: Category[] = [
  {
    id: 'drinks',
    name: 'İçecekler',
    type: 'drink',
    subCategories: [
      {
        id: 'wines',
        name: 'Şaraplar',
        items: [
          { id: 'wine-1', name: 'Kırmızı Şarap (Kadeh)', price: 120, category: 'drinks', subCategory: 'wines', destination: 'bar' },
          { id: 'wine-2', name: 'Beyaz Şarap (Kadeh)', price: 110, category: 'drinks', subCategory: 'wines', destination: 'bar' },
          { id: 'wine-3', name: 'Rose Şarap (Kadeh)', price: 115, category: 'drinks', subCategory: 'wines', destination: 'bar' },
          { id: 'wine-4', name: 'Kırmızı Şarap (Şişe)', price: 450, category: 'drinks', subCategory: 'wines', destination: 'bar' },
          { id: 'wine-5', name: 'Beyaz Şarap (Şişe)', price: 420, category: 'drinks', subCategory: 'wines', destination: 'bar' },
        ],
      },
      {
        id: 'beers',
        name: 'Biralar',
        items: [
          { id: 'beer-1', name: 'Efes Pilsen', price: 80, category: 'drinks', subCategory: 'beers', destination: 'bar' },
          { id: 'beer-2', name: 'Tuborg Gold', price: 85, category: 'drinks', subCategory: 'beers', destination: 'bar' },
          { id: 'beer-3', name: 'Corona', price: 120, category: 'drinks', subCategory: 'beers', destination: 'bar' },
          { id: 'beer-4', name: 'Heineken', price: 110, category: 'drinks', subCategory: 'beers', destination: 'bar' },
        ],
      },
      {
        id: 'cocktails',
        name: 'Kokteyller',
        items: [
          { id: 'cocktail-1', name: 'Mojito', price: 180, category: 'drinks', subCategory: 'cocktails', destination: 'bar' },
          { id: 'cocktail-2', name: 'Margarita', price: 190, category: 'drinks', subCategory: 'cocktails', destination: 'bar' },
          { id: 'cocktail-3', name: 'Cosmopolitan', price: 185, category: 'drinks', subCategory: 'cocktails', destination: 'bar' },
          { id: 'cocktail-4', name: 'Long Island', price: 220, category: 'drinks', subCategory: 'cocktails', destination: 'bar' },
        ],
      },
      {
        id: 'soft-drinks',
        name: 'Alkolsüz İçecekler',
        items: [
          { id: 'soft-1', name: 'Coca Cola', price: 40, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
          { id: 'soft-2', name: 'Fanta', price: 40, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
          { id: 'soft-3', name: 'Sprite', price: 40, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
          { id: 'soft-4', name: 'Ayran', price: 25, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
          { id: 'soft-5', name: 'Soda', price: 20, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
          { id: 'soft-6', name: 'Maden Suyu', price: 25, category: 'drinks', subCategory: 'soft-drinks', destination: 'bar' },
        ],
      },
      {
        id: 'hot-drinks',
        name: 'Sıcak İçecekler',
        items: [
          { id: 'hot-1', name: 'Türk Kahvesi', price: 50, category: 'drinks', subCategory: 'hot-drinks', destination: 'bar' },
          { id: 'hot-2', name: 'Espresso', price: 55, category: 'drinks', subCategory: 'hot-drinks', destination: 'bar' },
          { id: 'hot-3', name: 'Americano', price: 60, category: 'drinks', subCategory: 'hot-drinks', destination: 'bar' },
          { id: 'hot-4', name: 'Latte', price: 70, category: 'drinks', subCategory: 'hot-drinks', destination: 'bar' },
          { id: 'hot-5', name: 'Çay', price: 20, category: 'drinks', subCategory: 'hot-drinks', destination: 'bar' },
        ],
      },
    ],
  },
  {
    id: 'food',
    name: 'Yiyecekler',
    type: 'food',
    subCategories: [
      {
        id: 'starters',
        name: 'Başlangıçlar',
        items: [
          { id: 'starter-1', name: 'Mercimek Çorbası', price: 65, category: 'food', subCategory: 'starters', destination: 'kitchen' },
          { id: 'starter-2', name: 'Ezogelin Çorbası', price: 65, category: 'food', subCategory: 'starters', destination: 'kitchen' },
          { id: 'starter-3', name: 'Humus', price: 75, category: 'food', subCategory: 'starters', destination: 'kitchen' },
          { id: 'starter-4', name: 'Sigara Böreği (6 adet)', price: 90, category: 'food', subCategory: 'starters', destination: 'kitchen' },
          { id: 'starter-5', name: 'Patlıcan Salatası', price: 80, category: 'food', subCategory: 'starters', destination: 'kitchen' },
        ],
      },
      {
        id: 'salads',
        name: 'Salatalar',
        items: [
          { id: 'salad-1', name: 'Mevsim Salata', price: 70, category: 'food', subCategory: 'salads', destination: 'kitchen' },
          { id: 'salad-2', name: 'Çoban Salata', price: 65, category: 'food', subCategory: 'salads', destination: 'kitchen' },
          { id: 'salad-3', name: 'Sezar Salata', price: 120, category: 'food', subCategory: 'salads', destination: 'kitchen' },
          { id: 'salad-4', name: 'Ton Balıklı Salata', price: 140, category: 'food', subCategory: 'salads', destination: 'kitchen' },
        ],
      },
      {
        id: 'main-courses',
        name: 'Ana Yemekler',
        items: [
          { id: 'main-1', name: 'Izgara Köfte', price: 180, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-2', name: 'Tavuk Şiş', price: 160, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-3', name: 'Adana Kebap', price: 200, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-4', name: 'Urfa Kebap', price: 195, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-5', name: 'Kuzu Pirzola', price: 280, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-6', name: 'Biftek', price: 320, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-7', name: 'Levrek Izgara', price: 240, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
          { id: 'main-8', name: 'Somon Izgara', price: 260, category: 'food', subCategory: 'main-courses', destination: 'kitchen' },
        ],
      },
      {
        id: 'pizzas',
        name: 'Pizzalar',
        items: [
          { id: 'pizza-1', name: 'Margarita Pizza', price: 140, category: 'food', subCategory: 'pizzas', destination: 'kitchen' },
          { id: 'pizza-2', name: 'Karışık Pizza', price: 170, category: 'food', subCategory: 'pizzas', destination: 'kitchen' },
          { id: 'pizza-3', name: 'Sucuklu Pizza', price: 160, category: 'food', subCategory: 'pizzas', destination: 'kitchen' },
          { id: 'pizza-4', name: 'Ton Balıklı Pizza', price: 175, category: 'food', subCategory: 'pizzas', destination: 'kitchen' },
        ],
      },
      {
        id: 'desserts',
        name: 'Tatlılar',
        items: [
          { id: 'dessert-1', name: 'Künefe', price: 120, category: 'food', subCategory: 'desserts', destination: 'kitchen' },
          { id: 'dessert-2', name: 'Sütlaç', price: 70, category: 'food', subCategory: 'desserts', destination: 'kitchen' },
          { id: 'dessert-3', name: 'Profiterol', price: 90, category: 'food', subCategory: 'desserts', destination: 'kitchen' },
          { id: 'dessert-4', name: 'Cheesecake', price: 100, category: 'food', subCategory: 'desserts', destination: 'kitchen' },
          { id: 'dessert-5', name: 'Tiramisu', price: 110, category: 'food', subCategory: 'desserts', destination: 'kitchen' },
        ],
      },
    ],
  },
];

export const getAllItems = () => {
  const items: any[] = [];
  menuData.forEach(category => {
    category.subCategories.forEach(sub => {
      items.push(...sub.items);
    });
  });
  return items;
};
