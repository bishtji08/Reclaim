const pool = require('../src/config/database');

async function seed() {
  console.log('Seeding initial categories, locations, and campus data...');

  // 1. Categories
  await pool.query(`
    INSERT INTO public.categories (name, description, icon) VALUES
      ('Electronics', 'Phones, laptops, chargers, headphones, calculators', 'laptop'),
      ('Clothing', 'Jackets, hoodies, caps, scarves, lab coats', 'shirt'),
      ('Accessories', 'Bags, backpacks, wallets, keychains, watches', 'watch'),
      ('Documents', 'Student IDs, library cards, notebooks, certificates', 'file-text'),
      ('Books & Stationery', 'Textbooks, scientific calculators, pencil cases', 'book'),
      ('Others', 'Water bottles, umbrellas, miscellaneous belongings', 'box')
    ON CONFLICT (name) DO NOTHING;
  `);

  // 2. Subcategories
  await pool.query(`
    INSERT INTO public.subcategories (category_id, name, description)
    SELECT c.id, s.name, s.description
    FROM public.categories c
    CROSS JOIN (VALUES
      ('Electronics', 'Smartphones & Mobiles', 'Mobile phones, iPhones, Android devices'),
      ('Electronics', 'Laptops & MacBooks', 'Portable computers, laptops, notebooks'),
      ('Electronics', 'Tablets & iPads', 'Tablets, iPads, e-readers'),
      ('Electronics', 'Headphones & Earbuds', 'AirPods, bluetooth headphones, earphones'),
      ('Electronics', 'Chargers & Power Adapters', 'Phone chargers, laptop adapters, power cords'),
      ('Electronics', 'Power Banks & Batteries', 'Portable power banks, battery packs'),
      ('Electronics', 'Smartwatches & Fitness Bands', 'Apple watch, smart bands, digital watches'),
      ('Electronics', 'USB Drives & Hard Disks', 'Flash drives, external hard drives, SSDs'),
      ('Electronics', 'Electronic Calculators', 'Scientific & standard calculators'),
      ('Clothing', 'Jackets & Coats', 'Winter jackets, coats, windcheaters'),
      ('Clothing', 'Hoodies & Sweatshirts', 'College hoodies, sweaters, jumpers'),
      ('Clothing', 'Shirts & T-Shirts', 'T-shirts, collared shirts, tops'),
      ('Clothing', 'Caps & Beanies', 'Baseball caps, woolen beanies, sun hats'),
      ('Clothing', 'Scarves, Shawls & Gloves', 'Neck scarves, mufflers, winter gloves'),
      ('Clothing', 'Lab Coats & Aprons', 'Chemistry/medical lab coats, workshop aprons'),
      ('Clothing', 'Shoes & Sneakers', 'Sports shoes, boots, footwear'),
      ('Accessories', 'Wallets & Purses', 'Leather wallets, coin purses, cardholders'),
      ('Accessories', 'Backpacks & Rucksacks', 'College backpacks, laptop bags, daypacks'),
      ('Accessories', 'Handbags & Totes', 'Shoulder bags, totes, clutches'),
      ('Accessories', 'Eyeglasses & Sunglasses', 'Prescription glasses, sunglasses, frames with case'),
      ('Accessories', 'Watches', 'Analog and designer wristwatches'),
      ('Accessories', 'Keychains & Keys', 'Room keys, vehicle keys, lanyards'),
      ('Accessories', 'Jewelry', 'Rings, bracelets, necklaces, earrings'),
      ('Accessories', 'Belts & Straps', 'Leather belts, bag straps'),
      ('Documents', 'Student & Faculty ID Cards', 'Official University identity cards'),
      ('Documents', 'Government IDs & Driving Licenses', 'Aadhaar, PAN card, driver licenses'),
      ('Documents', 'Debit & Credit Cards', 'Bank ATM cards, credit cards, transit passes'),
      ('Documents', 'Passports & Visas', 'National passports, travel documents'),
      ('Documents', 'Certificates & Document Folders', 'Degree folders, project reports, certificates'),
      ('Books & Stationery', 'Academic Textbooks', 'Engineering, medical, science textbooks'),
      ('Books & Stationery', 'Notebooks & Registers', 'Lecture notebooks, assignment registers'),
      ('Books & Stationery', 'Scientific & Graphing Calculators', 'Casio, TI scientific calculators'),
      ('Books & Stationery', 'Pencil Cases & Pouches', 'Stationery kits, pen pouches'),
      ('Books & Stationery', 'Drawing & Architecture Kits', 'Drafters, sheet holders, scale rulers'),
      ('Books & Stationery', 'Novels & General Books', 'Library novels, non-fiction, magazines'),
      ('Others', 'Water Bottles & Flasks', 'Insulated bottles, sippers, thermoses'),
      ('Others', 'Umbrellas', 'Folding umbrellas, rain gear'),
      ('Others', 'Sports & Gym Equipment', 'Badminton rackets, footballs, gym gear'),
      ('Others', 'Musical Instruments & Cases', 'Guitars, flutes, instrument bags'),
      ('Others', 'Medical Items & Glasses Cases', 'Inhalers, medicine pouches, spectacle cases'),
      ('Others', 'Miscellaneous Belongings', 'Items not listed in standard categories')
    ) AS s(cat_name, name, description)
    WHERE c.name = s.cat_name
    ON CONFLICT (category_id, name) DO NOTHING;
  `);

  // 3. Locations with PostGIS Coordinates (GEU Dehradun Campus)
  await pool.query(`
    INSERT INTO public.locations (name, building, floor, room, coordinates, is_active) VALUES
      ('Central Library - Main Desk', 'Library', 'Ground', 'Reception', ST_GeomFromText('POINT(77.9948 30.2691)', 4326), true),
      ('Student Center Cafeteria', 'Student Center', '1st Floor', 'Food Court', ST_GeomFromText('POINT(77.9952 30.2682)', 4326), true),
      ('Science Complex Lab 3', 'Science Block', '2nd Floor', 'Lab 302', ST_GeomFromText('POINT(77.9939 30.2698)', 4326), true),
      ('Engineering Hallway A', 'Engineering Block', '1st Floor', 'Near A101', ST_GeomFromText('POINT(77.9941 30.2679)', 4326), true),
      ('Campus Sports Complex', 'Sports Building', 'Ground', 'Lobby', ST_GeomFromText('POINT(77.9959 30.2673)', 4326), true)
    ON CONFLICT DO NOTHING;

    -- Ensure coordinates are set on existing rows
    UPDATE public.locations SET coordinates = ST_GeomFromText('POINT(77.9948 30.2691)', 4326) WHERE name LIKE '%Library%' AND coordinates IS NULL;
    UPDATE public.locations SET coordinates = ST_GeomFromText('POINT(77.9952 30.2682)', 4326) WHERE name LIKE '%Cafeteria%' AND coordinates IS NULL;
    UPDATE public.locations SET coordinates = ST_GeomFromText('POINT(77.9939 30.2698)', 4326) WHERE name LIKE '%Science%' AND coordinates IS NULL;
    UPDATE public.locations SET coordinates = ST_GeomFromText('POINT(77.9941 30.2679)', 4326) WHERE name LIKE '%Engineering%' AND coordinates IS NULL;
    UPDATE public.locations SET coordinates = ST_GeomFromText('POINT(77.9959 30.2673)', 4326) WHERE name LIKE '%Sports%' AND coordinates IS NULL;
  `);

  // 4. Sample Items for Matching and Recovery
  const userResult = await pool.query('SELECT id, role FROM public.users ORDER BY created_at ASC LIMIT 3');
  if (userResult.rows.length >= 2) {
    const adminOrFinder = userResult.rows.find((u) => u.role === 'finder') || userResult.rows[0];
    const regularUser = userResult.rows.find((u) => u.role === 'user') || userResult.rows[1];

    const catElectronics = (await pool.query("SELECT id FROM categories WHERE name = 'Electronics'")).rows[0]?.id;
    const catAccessories = (await pool.query("SELECT id FROM categories WHERE name = 'Accessories'")).rows[0]?.id;
    const locCafeteria = (await pool.query("SELECT id FROM locations WHERE name LIKE '%Cafeteria%'")).rows[0]?.id;
    const locLibrary = (await pool.query("SELECT id FROM locations WHERE name LIKE '%Library%'")).rows[0]?.id;

    if (catAccessories && locCafeteria) {
      // Found item matching Lily's lost black leather purse
      await pool.query(`
        INSERT INTO public.items (
          title, description, type, status, category_id, reported_by, location_id,
          specific_location, color, brand, coordinates, is_urgent
        ) VALUES (
          'Found Black Leather Purse',
          'Found a black leather purse left on table 14 near the juice counter at cafeteria.',
          'found', 'reported', $1, $2, $3,
          'Table 14 near juice bar', 'black', 'Leather', ST_GeomFromText('POINT(77.9952 30.2682)', 4326), false
        )
        ON CONFLICT DO NOTHING;
      `, [catAccessories, adminOrFinder.id, locCafeteria]);
    }

    if (catElectronics && locLibrary) {
      // Lost TI-84 Scientific Calculator
      const calcResult = await pool.query(`
        INSERT INTO public.items (
          title, description, type, status, category_id, reported_by, location_id,
          specific_location, color, brand, model, coordinates, is_urgent
        ) VALUES (
          'Texas Instruments TI-84 Calculator',
          'Lost my graphic calculator during study session in quiet reading area. Has blue sticker on the back.',
          'lost', 'reported', $1, $2, $3,
          '2nd floor quiet study desk 42', 'black', 'Texas Instruments', 'TI-84 Plus', ST_GeomFromText('POINT(77.9948 30.2691)', 4326), true
        )
        RETURNING id;
      `, [catElectronics, regularUser.id, locLibrary]);

      const lostCalcId = calcResult.rows[0]?.id;

      // Matching Found Calculator
      if (lostCalcId) {
        await pool.query(`
          INSERT INTO public.items (
            title, description, type, status, category_id, reported_by, location_id,
            specific_location, color, brand, coordinates, is_urgent
          ) VALUES (
            'Found TI-84 Graphic Calculator',
            'Found a black Texas Instruments calculator left on quiet desk in library.',
            'found', 'reported', $1, $2, $3,
            'Library 2nd Floor desk', 'black', 'Texas Instruments', ST_GeomFromText('POINT(77.9948 30.2691)', 4326), false
          )
          ON CONFLICT DO NOTHING;
        `, [catElectronics, adminOrFinder.id, locLibrary]);
      }
    }
  }

  console.log('Seed completed successfully with realistic campus data!');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
