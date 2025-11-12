// Demo trips data
export interface DemoDestination {
  id: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  latitude: number;
  longitude: number;
  place_id?: string;
  rating: number;
  photos: string[];
  visit_duration: number; // minutes
  estimated_cost: number;
  place_types: string[];
}

export interface DemoTrip {
  id: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  start_date: string;
  end_date: string;
  destinations: DemoDestination[];
  total_duration: number; // hours
  total_cost: number;
  language: string;
}

export const demoTrips: DemoTrip[] = [
  {
    id: 'demo-bangkok-3days',
    title: 'เที่ยวกรุงเทพ 3 วัน 2 คืน',
    title_en: '3 Days 2 Nights Bangkok Adventure',
    description: 'ทริปเที่ยวกรุงเทพครบครัน 3 วัน 2 คืน ไปเที่ยวสถานที่สำคัญและช้อปปิ้ง',
    description_en: 'Complete 3 days 2 nights Bangkok trip visiting major attractions and shopping',
    start_date: '2024-01-15',
    end_date: '2024-01-17',
    total_duration: 48, // hours
    total_cost: 15000,
    language: 'th',
    destinations: [
      {
        id: 'wat-pho',
        name: 'วัดโพธิ์',
        name_en: 'Wat Pho',
        description: 'วัดโบราณที่มีพระพุทธไสยาสน์ที่ใหญ่ที่สุดในประเทศไทย',
        description_en: 'Ancient temple with the largest reclining Buddha in Thailand',
        latitude: 13.7464,
        longitude: 100.4945,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z5',
        rating: 4.5,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800',
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 120, // 2 hours
        estimated_cost: 200,
        place_types: ['tourist_attraction', 'temple', 'historical_site']
      },
      {
        id: 'grand-palace',
        name: 'พระบรมมหาราชวัง',
        name_en: 'Grand Palace',
        description: 'พระราชวังเก่าที่สวยงามและเป็นที่ประดิษฐานพระแก้วมรกต',
        description_en: 'Beautiful royal palace and home of the Emerald Buddha',
        latitude: 13.7500,
        longitude: 100.4917,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z6',
        rating: 4.7,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 180, // 3 hours
        estimated_cost: 500,
        place_types: ['tourist_attraction', 'palace', 'historical_site']
      },
      {
        id: 'chatuchak-market',
        name: 'ตลาดนัดจตุจักร',
        name_en: 'Chatuchak Weekend Market',
        description: 'ตลาดนัดที่ใหญ่ที่สุดในโลก มีของขายครบทุกอย่าง',
        description_en: 'World\'s largest weekend market with everything for sale',
        latitude: 13.7998,
        longitude: 100.5491,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z7',
        rating: 4.3,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 240, // 4 hours
        estimated_cost: 1000,
        place_types: ['market', 'shopping', 'local_attraction']
      },
      {
        id: 'mbk-center',
        name: 'MBK Center',
        name_en: 'MBK Center',
        description: 'ศูนย์การค้าขนาดใหญ่ใจกลางกรุงเทพ',
        description_en: 'Large shopping center in the heart of Bangkok',
        latitude: 13.7450,
        longitude: 100.5340,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z8',
        rating: 4.1,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 180, // 3 hours
        estimated_cost: 2000,
        place_types: ['shopping_mall', 'shopping', 'entertainment']
      },
      {
        id: 'floating-market',
        name: 'ตลาดน้ำ',
        name_en: 'Floating Market',
        description: 'ตลาดน้ำแบบดั้งเดิมของไทย',
        description_en: 'Traditional Thai floating market',
        latitude: 13.7563,
        longitude: 100.5018,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z9',
        rating: 4.4,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 120, // 2 hours
        estimated_cost: 300,
        place_types: ['market', 'cultural_attraction', 'local_attraction']
      }
    ]
  },
  {
    id: 'demo-chiangmai-2days',
    title: 'เที่ยวเชียงใหม่ 2 วัน 1 คืน',
    title_en: '2 Days 1 Night Chiang Mai Adventure',
    description: 'ทริปเที่ยวเชียงใหม่สั้นๆ 2 วัน 1 คืน ไปเที่ยววัดและตลาด',
    description_en: 'Short 2 days 1 night Chiang Mai trip visiting temples and markets',
    start_date: '2024-01-20',
    end_date: '2024-01-21',
    total_duration: 24, // hours
    total_cost: 8000,
    language: 'th',
    destinations: [
      {
        id: 'doi-suthep',
        name: 'ดอยสุเทพ',
        name_en: 'Doi Suthep',
        description: 'วัดบนดอยที่สวยงามและเป็นสัญลักษณ์ของเชียงใหม่',
        description_en: 'Beautiful mountain temple and symbol of Chiang Mai',
        latitude: 18.8054,
        longitude: 98.9214,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z10',
        rating: 4.6,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 180, // 3 hours
        estimated_cost: 100,
        place_types: ['tourist_attraction', 'temple', 'mountain']
      },
      {
        id: 'night-bazaar',
        name: 'ตลาดนัดกลางคืน',
        name_en: 'Night Bazaar',
        description: 'ตลาดนัดกลางคืนที่มีของขายและอาหารหลากหลาย',
        description_en: 'Night market with various goods and food',
        latitude: 18.7877,
        longitude: 98.9931,
        place_id: 'ChIJ8V2zZJ0Z4jARy5Z5Z5Z5Z5Z11',
        rating: 4.2,
        photos: [
          'https://images.unsplash.com/photo-1548013146-72479768bada?w=800'
        ],
        visit_duration: 120, // 2 hours
        estimated_cost: 500,
        place_types: ['market', 'shopping', 'food']
      }
    ]
  }
];

// Helper functions
export const getDemoTrip = (id: string): DemoTrip | undefined => {
  return demoTrips.find(trip => trip.id === id);
};

export const getRandomDemoTrip = (): DemoTrip => {
  const randomIndex = Math.floor(Math.random() * demoTrips.length);
  return demoTrips[randomIndex];
};

export const getDemoDestinations = (tripId: string): DemoDestination[] => {
  const trip = getDemoTrip(tripId);
  return trip?.destinations || [];
};
