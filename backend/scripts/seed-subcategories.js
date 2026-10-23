const pool = require('../src/config/database');

const subcategories = [
  // Electronics
  ['Electronics', 'Smartphones & Mobiles', 'Mobile phones, iPhones, Android devices'],
  ['Electronics', 'Laptops & MacBooks', 'Portable computers, laptops, notebooks'],
  ['Electronics', 'Tablets & iPads', 'Tablets, iPads, e-readers'],
  ['Electronics', 'Headphones & Earbuds', 'AirPods, bluetooth headphones, earphones'],
  ['Electronics', 'Chargers & Power Adapters', 'Phone chargers, laptop adapters, power cords'],
  ['Electronics', 'Power Banks & Batteries', 'Portable power banks, battery packs'],
  ['Electronics', 'Smartwatches & Fitness Bands', 'Apple watch, smart bands, digital watches'],
  ['Electronics', 'USB Drives & Hard Disks', 'Flash drives, external hard drives, SSDs'],
  ['Electronics', 'Electronic Calculators', 'Scientific & standard calculators'],

  // Clothing
  ['Clothing', 'Jackets & Coats', 'Winter jackets, coats, windcheaters'],
  ['Clothing', 'Hoodies & Sweatshirts', 'College hoodies, sweaters, jumpers'],
  ['Clothing', 'Shirts & T-Shirts', 'T-shirts, collared shirts, tops'],
  ['Clothing', 'Caps & Beanies', 'Baseball caps, woolen beanies, sun hats'],
  ['Clothing', 'Scarves, Shawls & Gloves', 'Neck scarves, mufflers, winter gloves'],
  ['Clothing', 'Lab Coats & Aprons', 'Chemistry/medical lab coats, workshop aprons'],
  ['Clothing', 'Shoes & Sneakers', 'Sports shoes, boots, footwear'],

  // Accessories
  ['Accessories', 'Wallets & Purses', 'Leather wallets, coin purses, cardholders'],
  ['Accessories', 'Backpacks & Rucksacks', 'College backpacks, laptop bags, daypacks'],
  ['Accessories', 'Handbags & Totes', 'Shoulder bags, totes, clutches'],
  ['Accessories', 'Eyeglasses & Sunglasses', 'Prescription glasses, sunglasses, frames with case'],
  ['Accessories', 'Watches', 'Analog and designer wristwatches'],
  ['Accessories', 'Keychains & Keys', 'Room keys, vehicle keys, lanyards'],
  ['Accessories', 'Jewelry', 'Rings, bracelets, necklaces, earrings'],
  ['Accessories', 'Belts & Straps', 'Leather belts, bag straps'],

  // Documents
  ['Documents', 'Student & Faculty ID Cards', 'Official University identity cards'],
  ['Documents', 'Government IDs & Driving Licenses', 'Aadhaar, PAN card, driver licenses'],
  ['Documents', 'Debit & Credit Cards', 'Bank ATM cards, credit cards, transit passes'],
  ['Documents', 'Passports & Visas', 'National passports, travel documents'],
  ['Documents', 'Certificates & Document Folders', 'Degree folders, project reports, certificates'],

  // Books & Stationery
  ['Books & Stationery', 'Academic Textbooks', 'Engineering, medical, science textbooks'],
  ['Books & Stationery', 'Notebooks & Registers', 'Lecture notebooks, assignment registers'],
  ['Books & Stationery', 'Scientific & Graphing Calculators', 'Casio, TI scientific calculators'],
  ['Books & Stationery', 'Pencil Cases & Pouches', 'Stationery kits, pen pouches'],
  ['Books & Stationery', 'Drawing & Architecture Kits', 'Drafters, sheet holders, scale rulers'],
  ['Books & Stationery', 'Novels & General Books', 'Library novels, non-fiction, magazines'],

  // Others
  ['Others', 'Water Bottles & Flasks', 'Insulated bottles, sippers, thermoses'],
  ['Others', 'Umbrellas', 'Folding umbrellas, rain gear'],
  ['Others', 'Sports & Gym Equipment', 'Badminton rackets, footballs, gym gear'],
  ['Others', 'Musical Instruments & Cases', 'Guitars, flutes, instrument bags'],
  ['Others', 'Medical Items & Glasses Cases', 'Inhalers, medicine pouches, spectacle cases'],
  ['Others', 'Miscellaneous Belongings', 'Items not listed in standard categories']
];

async function run() {
  try {
    for (const [catName, subName, desc] of subcategories) {
      await pool.query(
        `INSERT INTO public.subcategories (category_id, name, description)
         SELECT id, $1, $2
         FROM public.categories
         WHERE name = $3
         ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description`,
        [subName, desc, catName]
      );
    }
    console.log('Successfully inserted/updated all subcategories!');
  } catch (err) {
    console.error('Error seeding subcategories:', err);
  } finally {
    pool.end();
  }
}

run();
