export const product = {
  name: 'Tropical Punch',
  category: 'Energy drink',
  volume: '355 mL',
  ingredients: ['Alpha-GPC', 'L-Tyrosine', 'L-Theanine', 'B vitamins complex', 'Potassium'],
} as const

export const links = {
  launch: 'https://drinkfocz.com/',
  instagram: 'https://www.instagram.com/drinkfocz/',
} as const

export const worlds = [
  { name: 'Snow', line: 'Find your line.', image: 'snow', width: 360, height: 640, alt: 'FOCZ snowboard campaign in a cloud of snow', url: 'https://www.instagram.com/drinkfocz/reel/DcZgES1pq1f/' },
  { name: 'Water', line: 'Hold your course.', image: 'water', width: 480, height: 640, alt: 'A sailboat with the FOCZ wordmark on its sail', url: 'https://www.instagram.com/drinkfocz/p/DcRs1DYIABh/' },
  { name: 'Terrain', line: 'Stay with it.', image: 'terrain', width: 480, height: 640, alt: 'A chilled FOCZ can being opened in the mountains', url: 'https://www.instagram.com/drinkfocz/p/DbcCDfRDa9Y/' },
] as const

export const faqs = [
  { q: 'Where can I find the full ingredients?', a: 'Read the product label for the full ingredients and consumption guidance.' },
  { q: 'When can I get it?', a: 'Launch updates will be shared through the official signup at drinkfocz.com.' },
  { q: 'How do I enter the free-case draw?', a: 'The official launch site offers five cases on launch day. Complete your signup there to enter. No purchase necessary; check the official site for current giveaway details.' },
] as const
