import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const rawDbUrl = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !rawDbUrl) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or DATABASE_URL in root .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cs = rawDbUrl.replace(/[?&]sslmode=[^&]*/g, '');
const client = new pg.Client({
  connectionString: cs,
  ssl: { rejectUnauthorized: false },
});

const PHOTO_IDS = [
  '1517336714731-489689fd1ca8', '1496181133206-80ce9b88a853', '1505740420928-5e560c06d30e', '1523275335684-37898b6baf30',
  '1542291026-7eec264c27ff',    '1491553895911-0055eca6402d', '1526170375885-4d8ecf77b99f', '1516035069371-29a1b244cc32',
  '1485965120184-e220f721d03e', '1532298229144-0ec0c57515c7', '1544947950-fa07a98d237f',    '1512820790803-83ca734da794',
  '1495446815901-a7297e633e8d', '1555041469-a586c61ea9bc',    '1586023492125-27b2c045efd7', '1503602642458-232111445657',
  '1510915361894-db8b60106cb1', '1593642632559-0c6d3fc62b89', '1592899677977-9c10ca588bbd', '1511707171634-5f897ff02aa9',
  '1546868871-7041f2a55e12',    '1434056886845-dac89ffe9b56', '1576435728678-68d0fbf94e91', '1606813907291-d86efa9b94db',
  '1588872657578-7efd1f1555ed', '1556905055-8f358a7a47b2',    '1551028719-00167b16eac5',    '1434389677669-e08b4cac3105',
  '1517836357463-d25dfeac3438', '1507473885765-e6ed057f782c', '1524758631624-e2822e304c36', '1518455027359-f3f8164ba6bd',
  '1583394838336-acd977736f90', '1484704849700-f032a568e944', '1546435770-a3e426bf472b',    '1608043152269-423dbba4e7e1',
  '1600185365483-26d7a4cc7519', '1560343090-f0409e92791a',    '1553062407-98eeb64c6a62',    '1547949003-9792a18a2601',
  '1520045892732-304bc3ac5d8e', '1558618666-fcd25c85cd64',    '1593359677879-a4bb92f829d1', '1550009158-9ebf69173e03',
  '1599058917212-d750089bc07e', '1585771724684-38269d6639fd', '1567016376408-0226e4d0c1ea', '1609081219090-a6d81d3085bf',
  '1622560480605-d83c853bc5c3', '1581235720704-06d3acfcb36f', '1544244015-0df4b3ffc6b0',    '1585386959984-a4155224a1ad',
  '1611186871348-b1ce696e52c9', '1572569511254-d8f925fe2cbb', '1574944985070-8f3ebc6b79d2', '1589003077984-894e133dabab',
  '1556228453-efd6c1ff04f6',    '1622260614153-03223fb72052', '1520975954732-35dd22299614', '1511379938547-c1f69419868d',
];

const seedAssetsDir = path.resolve(__dirname, '../../assets/seed');

const BOTS = [
  { id: '00000000-0000-4000-8000-000000000011', name: 'Priya Nair', phone: '+919000000011', locale: 'hi', currency: 'INR', campus: 'IIT Bombay', hue: 280, bio: 'final year ee · clearing out hostel room before placement move', rating_sum: 49, rating_count: 10, deals_done: 12 },
  { id: '00000000-0000-4000-8000-000000000012', name: 'Aarav Mehta', phone: '+919000000012', locale: 'hi', currency: 'INR', campus: 'BITS Pilani', hue: 82, bio: 'cs dual degree · audio gear and textbooks', rating_sum: 39, rating_count: 8, deals_done: 9 },
  { id: '00000000-0000-4000-8000-000000000013', name: 'Sara Kim', phone: '+6590000013', locale: 'en', currency: 'SGD', campus: 'NUS Singapore', hue: 210, bio: 'design & computing @ utown · minimalist desk setups', rating_sum: 29, rating_count: 6, deals_done: 7 },
  { id: '00000000-0000-4000-8000-000000000014', name: 'Diego Ramírez', phone: '+15109000014', locale: 'es', currency: 'USD', campus: 'UC Berkeley', hue: 24, bio: 'eecs grad student · bikes, cameras & studio gear', rating_sum: 44, rating_count: 9, deals_done: 11 },
  { id: '00000000-0000-4000-8000-000000000015', name: 'Ananya Iyer', phone: '+919000000015', locale: 'ta', currency: 'INR', campus: 'Anna University', hue: 330, bio: 'mech junior · books, badminton & hostel essentials', rating_sum: 34, rating_count: 7, deals_done: 8 },
  { id: '00000000-0000-4000-8000-000000000016', name: 'Rohan Kulkarni', phone: '+919000000016', locale: 'mr', currency: 'INR', campus: 'COEP Pune', hue: 145, bio: 'robotics club lead · cycles, keyboards & hardware', rating_sum: 24, rating_count: 5, deals_done: 6 },
  { id: '00000000-0000-4000-8000-000000000017', name: 'Emma Clarke', phone: '+447700900017', locale: 'en', currency: 'GBP', campus: 'UCL London', hue: 190, bio: 'architecture year 3 · jackets, cameras & art books', rating_sum: 19, rating_count: 4, deals_done: 5 },
  { id: '00000000-0000-4000-8000-000000000018', name: 'Kabir Shah', phone: '+919000000018', locale: 'en', currency: 'INR', campus: 'Delhi University', hue: 48, bio: 'econ hons · guitars, sneakers & fest passes', rating_sum: 38, rating_count: 8, deals_done: 10 },
];

const DEMO_USERS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Rajesh Natarajan', phone: '+919000000001', role: 'buy', locale: 'en', currency: 'INR', campus: 'IIT Bombay', hue: 262, bio: 'aerospace soph · looking for lab gear and cycles' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Vikramjeet Singh', phone: '+919000000002', role: 'sell', locale: 'en', currency: 'INR', campus: 'IIT Bombay', hue: 74, bio: 'hostel 4 · graduating senior selling cycle and electronics' },
];

// All 42 listings matched to visually verified photos (dropped 1558618666-fcd25c85cd64 coffee roaster)
const LISTINGS = [
  // Books (4)
  { id: '00000000-0000-4000-8000-000000000201', sellerIdx: 0, title: 'zero to one & startup books bundle (7 books)', description: 'peter thiel zero to one, ego is the enemy, obstacle is the way, lean startup. clean pages, no highlights.', category: 'books', condition: 'like_new', kind: 'sell', price_minor: 85000, photos: ['1512820790803-83ca734da794'], spot: 'central library steps' },
  { id: '00000000-0000-4000-8000-000000000202', sellerIdx: 4, title: 'hc verma & physics reference collection', description: 'hardcover and paperback reference set for first-year engineering physics and mechanics.', category: 'books', condition: 'good', kind: 'sell', price_minor: 45000, photos: ['1495446815901-a7297e633e8d'], spot: 'main reading hall' },
  { id: '00000000-0000-4000-8000-000000000203', sellerIdx: 7, title: 'milk and honey poetry book + moleskine notebook', description: 'original paperback in mint condition plus unused ruled hardcover journal.', category: 'books', condition: 'like_new', kind: 'free', price_minor: 0, photos: ['1544947950-fa07a98d237f'], spot: 'arts faculty cafe' },
  { id: '00000000-0000-4000-8000-000000000204', sellerIdx: 1, title: 'algorithms & competitive coding notes + books', description: 'complete semester reading stack, open to swapping for a novel or calculator.', category: 'books', condition: 'good', kind: 'swap', price_minor: 0, photos: ['1495446815901-a7297e633e8d', '1512820790803-83ca734da794'], spot: 'clock tower lawn' },

  // Electronics (11)
  { id: '00000000-0000-4000-8000-000000000205', sellerIdx: 0, title: 'sony wh-1000xm3 noise cancelling headphones', description: 'industry-leading anc for hostel study sessions. battery lasts 28+ hours, includes carry case.', category: 'electronics', condition: 'like_new', kind: 'sell', price_minor: 890000, photos: ['1546435770-a3e426bf472b', '1505740420928-5e560c06d30e'], spot: 'hostel 10 lounge' },
  { id: '00000000-0000-4000-8000-000000000206', sellerIdx: 1, title: 'jbl flip 5 waterproof bluetooth speaker', description: 'punchy bass, usb-c charging, zero dents. great for room music or society practice.', category: 'electronics', condition: 'like_new', kind: 'sell', price_minor: 380000, photos: ['1608043152269-423dbba4e7e1'], spot: 'student activity center' },
  { id: '00000000-0000-4000-8000-000000000207', sellerIdx: 5, title: 'logitech k380 keyboard + mx master mouse combo', description: 'multi-device bluetooth keyboard and ergonomic mouse. pairs with laptop, ipad, and phone.', category: 'electronics', condition: 'like_new', kind: 'sell', price_minor: 320000, photos: ['1550009158-9ebf69173e03'], spot: 'computer center lobby' },
  { id: '00000000-0000-4000-8000-000000000208', sellerIdx: 0, title: 'ipad pro 12.9 + apple pencil 2nd gen', description: '128gb wifi space grey with magnetic apple pencil. paperlike screen protector installed.', category: 'electronics', condition: 'like_new', kind: 'sell', price_minor: 4200000, photos: ['1544244015-0df4b3ffc6b0'], spot: 'central library foyer' },
  { id: '00000000-0000-4000-8000-000000000209', sellerIdx: 7, title: 'airpods pro (1st gen) with magsafe case & box', description: 'genuine apple airpods pro, active noise cancellation and transparency mode working 100%.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 650000, photos: ['1572569511254-d8f925fe2cbb', '1609081219090-a6d81d3085bf'], spot: 'north campus metro gate' },
  { id: '00000000-0000-4000-8000-000000000210', sellerIdx: 2, title: 'macbook air 13-inch silver (8gb / 256gb ssd)', description: 'lightweight campus laptop, battery cycle count 110, comes with original charger.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 68000, photos: ['1611186871348-b1ce696e52c9', '1496181133206-80ce9b88a853'], spot: 'utown starbucks' },
  { id: '00000000-0000-4000-8000-000000000211', sellerIdx: 3, title: 'sony alpha a7ii mirrorless body + 50mm lens', description: 'full-frame mirrorless camera with canon ef 50mm f/1.4 and 24mm lenses.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 75000, photos: ['1516035069371-29a1b244cc32'], spot: 'sather gate' },
  { id: '00000000-0000-4000-8000-000000000212', sellerIdx: 4, title: 'dell inspiron 14 laptop (i5, 16gb ram, 512gb)', description: 'fast windows laptop for coding and cad labs. clean keyboard and matte display.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 2400000, photos: ['1588872657578-7efd1f1555ed', '1593642632559-0c6d3fc62b89'], spot: 'ceg main canteen' },
  { id: '00000000-0000-4000-8000-000000000213', sellerIdx: 5, title: 'jbl pulse rgb led portable bluetooth speaker', description: '360-degree sound with ambient led light show. battery holds 8 hours.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 290000, photos: ['1589003077984-894e133dabab'], spot: 'boat club steps' },
  { id: '00000000-0000-4000-8000-000000000214', sellerIdx: 1, title: 'apple watch series 5 44mm space grey gps', description: 'oled retina display, sport band, tracks runs and workouts accurately.', category: 'electronics', condition: 'good', kind: 'sell', price_minor: 950000, photos: ['1546868871-7041f2a55e12', '1523275335684-37898b6baf30'], spot: 'gymkhana ground' },
  { id: '00000000-0000-4000-8000-000000000215', sellerIdx: 0, title: 'wired studio monitor headphones (3.5mm)', description: 'comfortable over-ear headphones for editing and lectures. open to swapping for a book or usb hub.', category: 'electronics', condition: 'good', kind: 'swap', price_minor: 0, photos: ['1583394838336-acd977736f90', '1484704849700-f032a568e944'], spot: 'kresit building' },

  // Phones (3)
  { id: '00000000-0000-4000-8000-000000000216', sellerIdx: 0, title: 'iphone 12 64gb with saddle brown leather case', description: 'battery health 86%, face id and truetone working, zero cracks. includes leather case.', category: 'phones', condition: 'good', kind: 'sell', price_minor: 2150000, photos: ['1592899677977-9c10ca588bbd'], spot: 'gulmohar cafe' },
  { id: '00000000-0000-4000-8000-000000000217', sellerIdx: 5, title: 'iphone x 64gb unlocked silver', description: 'clean oled screen, great secondary phone for app testing and daily use.', category: 'phones', condition: 'good', kind: 'sell', price_minor: 1100000, photos: ['1511707171634-5f897ff02aa9'], spot: 'hostel b common room' },
  { id: '00000000-0000-4000-8000-000000000218', sellerIdx: 6, title: 'iphone 11 pro 128gb silver (unlocked)', description: 'triple camera pro system, spotless back glass, comes with fast usb-c cable.', category: 'phones', condition: 'like_new', kind: 'sell', price_minor: 28000, photos: ['1574944985070-8f3ebc6b79d2'], spot: 'bloomsbury theatre' },

  // Rides (3)
  { id: '00000000-0000-4000-8000-000000000219', sellerIdx: 5, title: 'hero sprint matte black road cycle', description: 'lightweight alloy frame, drop bars, smooth shimano gears. fastest way between hostel and dept.', category: 'rides', condition: 'like_new', kind: 'sell', price_minor: 720000, photos: ['1532298229144-0ec0c57515c7'], spot: 'main gate cycle stand' },
  { id: '00000000-0000-4000-8000-000000000220', sellerIdx: 0, title: 'peugeot vintage white single-speed campus bike', description: 'classic steel frame with leather saddle and bullhorn bars. super light and zero maintenance.', category: 'rides', condition: 'good', kind: 'sell', price_minor: 580000, photos: ['1485965120184-e220f721d03e'], spot: 'hostel 12 porch' },
  { id: '00000000-0000-4000-8000-000000000221', sellerIdx: 3, title: 'gravel road bike with disc brakes & tan tyres', description: 'carbon fork, 2x11 drivetrain, hydraulic disc brakes. ready for campus hills.', category: 'rides', condition: 'like_new', kind: 'sell', price_minor: 24000, photos: ['1576435728678-68d0fbf94e91'], spot: 'memorial glade' },

  // Home (6)
  { id: '00000000-0000-4000-8000-000000000222', sellerIdx: 0, title: 'ikea hektar matte grey study & floor lamp', description: 'adjustable metal shade, warm led bulb included. perfect for late-night exam prep.', category: 'home', condition: 'like_new', kind: 'sell', price_minor: 120000, photos: ['1507473885765-e6ed057f782c'], spot: 'hostel 10 gate' },
  { id: '00000000-0000-4000-8000-000000000223', sellerIdx: 4, title: 'solid wood high desk stool', description: 'sturdy birch wood stool with carry handle cutout. fits under any hostel desk.', category: 'home', condition: 'good', kind: 'free', price_minor: 0, photos: ['1503602642458-232111445657'], spot: 'hostel 3warden office' },
  { id: '00000000-0000-4000-8000-000000000224', sellerIdx: 7, title: 'swivel padded study chair + desk mat', description: 'ergonomic grey cushioned chair on smooth casters. moving out of flatshare this week.', category: 'home', condition: 'good', kind: 'sell', price_minor: 260000, photos: ['1518455027359-f3f8164ba6bd'], spot: 'kamla nagar gate' },
  { id: '00000000-0000-4000-8000-000000000225', sellerIdx: 1, title: 'mustard velvet accent chair for common room', description: 'super comfy reading chair with wooden legs. fits easily in an suv or tempo.', category: 'home', condition: 'like_new', kind: 'sell', price_minor: 350000, photos: ['1586023492125-27b2c045efd7'], spot: 'faculty housing block b' },
  { id: '00000000-0000-4000-8000-000000000226', sellerIdx: 5, title: '43-inch full hd smart tv with hdmi', description: 'crisp display for movie nights and ps5 gaming in flatshare. includes remote and stand.', category: 'home', condition: 'good', kind: 'sell', price_minor: 980000, photos: ['1593359677879-a4bb92f829d1'], spot: 'shivajinagar gate' },
  { id: '00000000-0000-4000-8000-000000000227', sellerIdx: 6, title: 'minimalist arch reading floor lamp', description: 'double-headed black metal studio lamp. free to anyone picking up today.', category: 'home', condition: 'good', kind: 'free', price_minor: 0, photos: ['1524758631624-e2822e304c36', '1567016376408-0226e4d0c1ea'], spot: 'gower street quad' },

  // Fashion (6)
  { id: '00000000-0000-4000-8000-000000000228', sellerIdx: 7, title: 'zara black biker jacket, size m', description: 'classic zip moto jacket, worn twice for college fest. zero scuffs.', category: 'fashion', condition: 'like_new', kind: 'sell', price_minor: 180000, photos: ['1551028719-00167b16eac5', '1520975954732-35dd22299614'], spot: 'srcc main gate' },
  { id: '00000000-0000-4000-8000-000000000229', sellerIdx: 4, title: 'nike air max 1 white & orange sneakers (uk 8)', description: 'authentic pair, clean soles, super comfortable daily campus kicks.', category: 'fashion', condition: 'like_new', kind: 'sell', price_minor: 290000, photos: ['1600185365483-26d7a4cc7519'], spot: 'sports complex entrance' },
  { id: '00000000-0000-4000-8000-000000000230', sellerIdx: 1, title: 'braun minimalist black mesh analog watch', description: 'iconic dieter rams bauhaus dial with yellow second hand. new battery installed.', category: 'fashion', condition: 'like_new', kind: 'sell', price_minor: 240000, photos: ['1434056886845-dac89ffe9b56'], spot: 'fd-2 rotunda' },
  { id: '00000000-0000-4000-8000-000000000231', sellerIdx: 0, title: 'full-grain tan leather laptop backpack', description: 'padded 15-inch macbook sleeve inside, brass zippers, ages beautifully.', category: 'fashion', condition: 'good', kind: 'sell', price_minor: 210000, photos: ['1622560480605-d83c853bc5c3'], spot: 'som building lobby' },
  { id: '00000000-0000-4000-8000-000000000232', sellerIdx: 2, title: 'winter knit sweater + beanie + denim bundle', description: 'warm knitwear bundle from exchange semester. open to swapping for a backpack or tote.', category: 'fashion', condition: 'good', kind: 'swap', price_minor: 0, photos: ['1556905055-8f358a7a47b2', '1434389677669-e08b4cac3105'], spot: 'utown residence lobby' },
  { id: '00000000-0000-4000-8000-000000000233', sellerIdx: 6, title: 'teal suede oxford brogues (uk 7)', description: 'handcrafted suede dress shoes for formals and interviews.', category: 'fashion', condition: 'new', kind: 'sell', price_minor: 3500, photos: ['1560343090-f0409e92791a'], spot: 'main quad' },

  // Sports (4)
  { id: '00000000-0000-4000-8000-000000000234', sellerIdx: 5, title: 'nike free rn flyknit running shoes (uk 9)', description: 'ultralight breathable knit uppers, great grip for track and road runs.', category: 'sports', condition: 'like_new', kind: 'sell', price_minor: 220000, photos: ['1542291026-7eec264c27ff', '1491553895911-0055eca6402d'], spot: 'gymkhana track' },
  { id: '00000000-0000-4000-8000-000000000235', sellerIdx: 1, title: 'street skateboard complete (maple deck + abec-9)', description: '7-ply canadian maple deck with alloy trucks and smooth urethane wheels.', category: 'sports', condition: 'good', kind: 'sell', price_minor: 165000, photos: ['1520045892732-304bc3ac5d8e'], spot: 'sac skate area' },
  { id: '00000000-0000-4000-8000-000000000236', sellerIdx: 7, title: 'woods 45l waterproof trekking & camping rucksack', description: 'ideal for himachal and sahyadri college treks. rain cover included.', category: 'sports', condition: 'like_new', kind: 'sell', price_minor: 190000, photos: ['1622260614153-03223fb72052'], spot: 'mountaineering club room' },
  { id: '00000000-0000-4000-8000-000000000237', sellerIdx: 0, title: 'olympic barbell + bumper plates home gym set', description: 'heavy duty steel bar with rubber plates and conditioning battle rope.', category: 'sports', condition: 'good', kind: 'swap', price_minor: 0, photos: ['1517836357463-d25dfeac3438', '1599058917212-d750089bc07e'], spot: 'hostel 8 gym' },

  // Hobbies (3)
  { id: '00000000-0000-4000-8000-000000000238', sellerIdx: 7, title: 'yamaha f310 acoustic guitar + capo & gig bag', description: 'warm dreadnought acoustic tone, low string action, freshly restrung with d-addario 10s.', category: 'hobbies', condition: 'like_new', kind: 'sell', price_minor: 540000, photos: ['1510915361894-db8b60106cb1', '1511379938547-c1f69419868d'], spot: 'music room patio' },
  { id: '00000000-0000-4000-8000-000000000239', sellerIdx: 2, title: 'polaroid onestep 2 i-type instant film camera', description: 'retro analog instant camera with built-in flash and usb charging.', category: 'hobbies', condition: 'like_new', kind: 'sell', price_minor: 9500, photos: ['1526170375885-4d8ecf77b99f'], spot: 'faculty of arts' },
  { id: '00000000-0000-4000-8000-000000000240', sellerIdx: 3, title: 'playstation 5 (ps5) disc edition console', description: 'includes dualsense controller, hdmi 2.1 cable, and power cord. runs whisper quiet.', category: 'hobbies', condition: 'like_new', kind: 'sell', price_minor: 36000, photos: ['1606813907291-d86efa9b94db'], spot: 'sproul plaza' },

  // Tickets (1) & Other (3)
  { id: '00000000-0000-4000-8000-000000000241', sellerIdx: 0, title: 'mood indigo pro-show all-access concert pass', description: 'front-section wrist pass for all 4 nights at open air theatre.', category: 'tickets', condition: 'new', kind: 'sell', price_minor: 60000, photos: ['1511379938547-c1f69419868d'], spot: 'oat entrance gate' },
  { id: '00000000-0000-4000-8000-000000000242', sellerIdx: 4, title: 'vinta waterproof camera & laptop daypack', description: 'modular padded dividers for mirrorless camera plus 15-inch laptop compartment.', category: 'other', condition: 'like_new', kind: 'sell', price_minor: 175000, photos: ['1547949003-9792a18a2601', '1553062407-98eeb64c6a62'], spot: 'alumni avenue' },
  { id: '00000000-0000-4000-8000-000000000243', sellerIdx: 1, title: 'vintage fiat 500 die-cast desk model', description: 'metal scale model with opening doors — great desk decor. free to a fellow car nerd.', category: 'other', condition: 'like_new', kind: 'free', price_minor: 0, photos: ['1581235720704-06d3acfcb36f'], spot: 'auto club workshop' },
  { id: '00000000-0000-4000-8000-000000000244', sellerIdx: 7, title: 'chanel coco noir eau de parfum 100ml (gift box)', description: 'unopened duty-free bottle, swapping for audio gear or smartwatch.', category: 'other', condition: 'new', kind: 'swap', price_minor: 0, photos: ['1585386959984-a4155224a1ad'], spot: 'south campus cafe' },
];

async function ensureAndUploadPhotos() {
  await fs.mkdir(seedAssetsDir, { recursive: true });
  const publicUrls = new Map();

  const concurrency = 15;
  for (let i = 0; i < PHOTO_IDS.length; i += concurrency) {
    const batch = PHOTO_IDS.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (id) => {
        const localFile = path.join(seedAssetsDir, `${id}.jpg`);
        let buf;
        try {
          buf = await fs.readFile(localFile);
        } catch {
          const res = await fetch(`https://images.unsplash.com/photo-${id}?w=800&q=80`);
          if (!res.ok) throw new Error(`Download failed for ${id}: ${res.status}`);
          buf = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(localFile, buf);
        }

        const storagePath = `seed/${id}.jpg`;
        const { error } = await supabase.storage
          .from('mudra-photos')
          .upload(storagePath, buf, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (error && !String(error.message).toLowerCase().includes('already exists')) {
          console.warn(`Upload warning for ${id}:`, error.message);
        }

        const { data } = supabase.storage.from('mudra-photos').getPublicUrl(storagePath);
        publicUrls.set(id, data.publicUrl);
      })
    );
    console.log(`Uploaded ${Math.min(i + concurrency, PHOTO_IDS.length)}/${PHOTO_IDS.length} photos to mudra-photos/seed/...`);
  }

  return publicUrls;
}

async function main() {
  console.log('1. Uploading 60 verified seed photos to Supabase Storage...');
  const urlMap = await ensureAndUploadPhotos();

  await client.connect();
  console.log('2. Connected to Postgres for seeding profiles, listings, and demo deals...');

  await client.query('BEGIN');
  try {
    await client.query(`select set_config('mudra.allow_reset', '1', true)`);

    // Upsert 8 demo bots
    for (const b of BOTS) {
      await client.query(
        `insert into mudra.profiles (
          id, name, phone_e164, pin_hash, primary_role, locale, currency,
          campus, bio, avatar_hue, rating_sum, rating_count, deals_done,
          is_demo_bot, is_demo_account
        ) values (
          $1, $2, $3, extensions.crypt('9876', extensions.gen_salt('bf', 8)),
          'both', $4, $5, $6, $7, $8, $9, $10, $11, true, false
        )
        on conflict (phone_e164) do update set
          name = excluded.name,
          locale = excluded.locale,
          currency = excluded.currency,
          campus = excluded.campus,
          bio = excluded.bio,
          avatar_hue = excluded.avatar_hue,
          rating_sum = excluded.rating_sum,
          rating_count = excluded.rating_count,
          deals_done = excluded.deals_done,
          is_demo_bot = true`,
        [b.id, b.name, b.phone, b.locale, b.currency, b.campus, b.bio, b.hue, b.rating_sum, b.rating_count, b.deals_done]
      );

      // Give each bot plenty of wallet balance
      await client.query(
        `insert into mudra.wallets(profile_id, currency, balance_minor)
         select id, currency, mudra.signup_bonus_for(currency) * 4
           from mudra.profiles where phone_e164 = $1
         on conflict (profile_id, currency) do update
           set balance_minor = greatest(mudra.wallets.balance_minor, excluded.balance_minor)`,
        [b.phone]
      );
    }

    // Fetch actual bot IDs by phone
    const botIds = [];
    for (const b of BOTS) {
      const r = await client.query(`select id, currency, campus from mudra.profiles where phone_e164 = $1`, [b.phone]);
      botIds.push(r.rows[0]);
    }

    // Upsert 2 judge demo accounts (PIN 1234)
    const demoIds = [];
    for (const u of DEMO_USERS) {
      const r = await client.query(
        `insert into mudra.profiles (
          id, name, phone_e164, pin_hash, primary_role, locale, currency,
          campus, bio, avatar_hue, rating_sum, rating_count, deals_done,
          is_demo_bot, is_demo_account, failed_pin_attempts, locked_until
        ) values (
          $1, $2, $3, extensions.crypt('1234', extensions.gen_salt('bf', 8)),
          $4, $5, $6, $7, $8, $9, 24, 5, 5, false, true, 0, null
        )
        on conflict (phone_e164) do update set
          name = excluded.name,
          pin_hash = extensions.crypt('1234', extensions.gen_salt('bf', 8)),
          primary_role = excluded.primary_role,
          locale = excluded.locale,
          currency = excluded.currency,
          campus = excluded.campus,
          bio = excluded.bio,
          avatar_hue = excluded.avatar_hue,
          is_demo_account = true,
          failed_pin_attempts = 0,
          locked_until = null,
          deleted_at = null
        returning id`,
        [u.id, u.name, u.phone, u.role, u.locale, u.currency, u.campus, u.bio, u.hue]
      );
      demoIds.push(r.rows[0].id);
    }

    // Upsert 44 campus listings
    for (let i = 0; i < LISTINGS.length; i++) {
      const item = LISTINGS[i];
      const seller = botIds[item.sellerIdx];
      const photoUrls = item.photos.map((pid) => urlMap.get(pid));
      await client.query(
        `insert into mudra.listings (
          id, seller_id, title, description, category, condition, kind,
          price_minor, currency, photos, meetup_spot, campus, status,
          created_at, updated_at
        ) values (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, 'active',
          now() - ($13::int || ' minutes')::interval,
          now() - ($13::int || ' minutes')::interval
        )
        on conflict (id) do update set
          seller_id = excluded.seller_id,
          title = excluded.title,
          description = excluded.description,
          category = excluded.category,
          condition = excluded.condition,
          kind = excluded.kind,
          price_minor = excluded.price_minor,
          currency = excluded.currency,
          photos = excluded.photos,
          meetup_spot = excluded.meetup_spot,
          campus = excluded.campus,
          status = 'active'`,
        [
          item.id,
          seller.id,
          item.title,
          item.description,
          item.category,
          item.condition,
          item.kind,
          item.price_minor,
          seller.currency,
          photoUrls,
          item.spot,
          seller.campus,
          (i + 1) * 7,
        ]
      );
    }

    // Seed demo deals for Rajesh and Vikramjeet via mudra.seed_demo_for
    for (const dId of demoIds) {
      await client.query(`select mudra.seed_demo_for($1)`, [dId]);
    }

    await client.query('COMMIT');
    console.log(`Seed complete: ${BOTS.length} bots, ${DEMO_USERS.length} judge demo accounts, ${LISTINGS.length} listings + demo deals.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
