/** Pin after uploading a batch to Cloudinary — see `.cursor/design/cloudinary-assets.md` */
export const SPYFALL_CLOUD_VERSION = '';

const CLOUD_NAME = 'dpkqjlk3g';

export interface SpyfallLocation {
  id: string;
  name: string;
  roles: readonly [string, string, string, string, string, string, string];
  artKey: string;
}

/** Spyfall 1 — 26 location decks (excludes promo / non-standard decks) */
export const SPYFALL_LOCATIONS: readonly SpyfallLocation[] = [
  {
    id: 'airplane',
    name: 'Airplane',
    artKey: 'airplane',
    roles: [
      'First Class Passenger',
      'Air Marshall',
      'Mechanic',
      'Air Hostess',
      'Co-Pilot',
      'Captain',
      'Economy Class Passenger',
    ],
  },
  {
    id: 'bank',
    name: 'Bank',
    artKey: 'bank',
    roles: [
      'Armored Car Driver',
      'Manager',
      'Consultant',
      'Robber',
      'Security Guard',
      'Teller',
      'Customer',
    ],
  },
  {
    id: 'beach',
    name: 'Beach',
    artKey: 'beach',
    roles: [
      'Beach Waitress',
      'Kite Surfer',
      'Lifeguard',
      'Thief',
      'Beach Photographer',
      'Ice Cream Truck Driver',
      'Beach Goer',
    ],
  },
  {
    id: 'cathedral',
    name: 'Cathedral',
    artKey: 'cathedral',
    roles: ['Priest', 'Beggar', 'Sinner', 'Tourist', 'Sponsor', 'Chorister', 'Parishioner'],
  },
  {
    id: 'circus-tent',
    name: 'Circus Tent',
    artKey: 'circus-tent',
    roles: ['Acrobat', 'Animal Trainer', 'Magician', 'Fire Eater', 'Clown', 'Juggler', 'Visitor'],
  },
  {
    id: 'corporate-party',
    name: 'Corporate Party',
    artKey: 'corporate-party',
    roles: [
      'Entertainer',
      'Manager',
      'Unwanted Guest',
      'Owner',
      'Secretary',
      'Delivery Boy',
      'Accountant',
    ],
  },
  {
    id: 'crusader-army',
    name: 'Crusader Army',
    artKey: 'crusader-army',
    roles: ['Monk', 'Imprisoned Saracen', 'Servant', 'Bishop', 'Squire', 'Archer', 'Knight'],
  },
  {
    id: 'casino',
    name: 'Casino',
    artKey: 'casino',
    roles: [
      'Bartender',
      'Head Security Guard',
      'Bouncer',
      'Manager',
      'Hustler',
      'Dealer',
      'Gambler',
    ],
  },
  {
    id: 'day-spa',
    name: 'Day Spa',
    artKey: 'day-spa',
    roles: [
      'Stylist',
      'Masseuse',
      'Manicurist',
      'Makeup Artist',
      'Dermatologist',
      'Beautician',
      'Customer',
    ],
  },
  {
    id: 'embassy',
    name: 'Embassy',
    artKey: 'embassy',
    roles: [
      'Security Guard',
      'Secretary',
      'Ambassador',
      'Tourist',
      'Refugee',
      'Diplomat',
      'Government Official',
    ],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    artKey: 'hospital',
    roles: ['Nurse', 'Doctor', 'Anesthesiologist', 'Intern', 'Therapist', 'Surgeon', 'Patient'],
  },
  {
    id: 'hotel',
    name: 'Hotel',
    artKey: 'hotel',
    roles: [
      'Doorman',
      'Security Guard',
      'Manager',
      'Housekeeper',
      'Bartender',
      'Bellman',
      'Customer',
    ],
  },
  {
    id: 'military-base',
    name: 'Military Base',
    artKey: 'military-base',
    roles: ['Deserter', 'Colonel', 'Medic', 'Sniper', 'Officer', 'Tank Engineer', 'Soldier'],
  },
  {
    id: 'movie-studio',
    name: 'Movie Studio',
    artKey: 'movie-studio',
    roles: [
      'Stunt Man',
      'Sound Engineer',
      'Camera Man',
      'Director',
      'Costume Artist',
      'Producer',
      'Actor',
    ],
  },
  {
    id: 'ocean-liner',
    name: 'Ocean Liner',
    artKey: 'ocean-liner',
    roles: ['Cook', 'Captain', 'Bartender', 'Musician', 'Waiter', 'Mechanic', 'Rich Passenger'],
  },
  {
    id: 'passenger-train',
    name: 'Passenger Train',
    artKey: 'passenger-train',
    roles: [
      'Mechanic',
      'Border Patrol',
      'Train Attendant',
      'Restaurant Chef',
      'Train Driver',
      'Stroker',
      'Passenger',
    ],
  },
  {
    id: 'pirate-ship',
    name: 'Pirate Ship',
    artKey: 'pirate-ship',
    roles: [
      'Cook',
      'Slave',
      'Cannoneer',
      'Tied Up Prisoner',
      'Cabin Boy',
      'Brave Captain',
      'Sailor',
    ],
  },
  {
    id: 'polar-station',
    name: 'Polar Station',
    artKey: 'polar-station',
    roles: [
      'Medic',
      'Expedition Leader',
      'Biologist',
      'Radioman',
      'Hydrologist',
      'Meteorologist',
      'Geologist',
    ],
  },
  {
    id: 'police-station',
    name: 'Police Station',
    artKey: 'police-station',
    roles: [
      'Detective',
      'Lawyer',
      'Journalist',
      'Criminalist',
      'Archivist',
      'Criminal',
      'Patrol Officer',
    ],
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    artKey: 'restaurant',
    roles: ['Musician', 'Bouncer', 'Hostess', 'Head Chef', 'Food Critic', 'Waiter', 'Customer'],
  },
  {
    id: 'school',
    name: 'School',
    artKey: 'school',
    roles: [
      'Gym Teacher',
      'Principal',
      'Security Guard',
      'Janitor',
      'Cafeteria Lady',
      'Maintainence Man',
      'Student',
    ],
  },
  {
    id: 'service-station',
    name: 'Service Station',
    artKey: 'service-station',
    roles: [
      'Manager',
      'Tire Specialist',
      'Biker',
      'Car Owner',
      'Car Wash Operator',
      'Electrician',
      'Auto Mechanic',
    ],
  },
  {
    id: 'space-station',
    name: 'Space Station',
    artKey: 'space-station',
    roles: ['Engineer', 'Alien', 'Pilot', 'Commander', 'Scientist', 'Doctor', 'Space Tourist'],
  },
  {
    id: 'submarine',
    name: 'Submarine',
    artKey: 'submarine',
    roles: [
      'Cook',
      'Commander',
      'Sonar Technician',
      'Electronics Technician',
      'Radioman',
      'Navigator',
      'Sailor',
    ],
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    artKey: 'supermarket',
    roles: [
      'Cashier',
      'Butcher',
      'Janitor',
      'Security Guard',
      'Food Sample Demonstrator',
      'Shelf Stocker',
      'Customer',
    ],
  },
  {
    id: 'university',
    name: 'University',
    artKey: 'university',
    roles: [
      'Graduate Student',
      'Professor',
      'Dean',
      'Psychologist',
      'Maintenance Man',
      'Janitor',
      'Student',
    ],
  },
] as const;

export function getSpyfallLocationById(id: string): SpyfallLocation | undefined {
  return SPYFALL_LOCATIONS.find((loc) => loc.id === id);
}

export function pickSpyfallLocation(usedIds: readonly string[]): SpyfallLocation {
  const available = SPYFALL_LOCATIONS.filter((loc) => !usedIds.includes(loc.id));
  const pool = available.length > 0 ? available : [...SPYFALL_LOCATIONS];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function spyfallLocationImagePath(artKey: string): string {
  const version = SPYFALL_CLOUD_VERSION || 'vPLACEHOLDER';
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto/f_auto/${version}/${artKey}_PLACEHOLDER`;
}

export function spyfallLocationChoices(): { id: string; name: string }[] {
  return SPYFALL_LOCATIONS.map((loc) => ({ id: loc.id, name: loc.name }));
}
