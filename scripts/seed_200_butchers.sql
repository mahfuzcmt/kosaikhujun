-- Script to generate 200 dummy butchers with realistic Bangladesh data

-- Bengali names array
DO $$
DECLARE
    first_names TEXT[] := ARRAY['মোঃ', 'আব্দুল', 'মোহাম্মদ', 'শেখ', 'হাজী', 'আল', 'রহিম', 'করিম', 'জামাল', 'রাজা', 'সোহেল', 'মামুন', 'রাকিব', 'সাইফুল', 'নাসির', 'জাহিদ', 'ফারুক', 'ইমরান', 'তানভীর', 'আরিফ'];
    last_names TEXT[] := ARRAY['উদ্দিন', 'হোসেন', 'আলী', 'মিয়া', 'খান', 'সরকার', 'তালুকদার', 'রহমান', 'ইসলাম', 'আহমেদ', 'শিকদার', 'মল্লিক', 'প্রামাণিক', 'মণ্ডল', 'সিকদার', 'চৌধুরী', 'বিশ্বাস', 'দাস', 'পাল', 'ঘোষ'];
    cow_price_types TEXT[] := ARRAY['PER_ANIMAL', 'PER_KG', 'PERCENTAGE'];
    goat_price_types TEXT[] := ARRAY['PER_ANIMAL', 'PER_KG', 'PERCENTAGE'];

    user_id UUID;
    butcher_id UUID;
    full_name TEXT;
    phone TEXT;
    whatsapp TEXT;
    cow_price INTEGER;
    goat_price INTEGER;
    cow_capacity INTEGER;
    goat_capacity INTEGER;
    cow_price_type TEXT;
    goat_price_type TEXT;
    unlock_limit INTEGER;
    thana_count INTEGER;
    thana_id INTEGER;
    i INTEGER;
BEGIN
    FOR i IN 1..200 LOOP
        -- Generate random name
        full_name := first_names[1 + floor(random() * array_length(first_names, 1))] || ' ' ||
                     last_names[1 + floor(random() * array_length(last_names, 1))];

        -- Generate phone number (01XXXXXXXXX)
        phone := '01' || (7 + floor(random() * 3))::TEXT || lpad((floor(random() * 100000000))::TEXT, 8, '0');

        -- WhatsApp number (same as phone or slightly different)
        IF random() > 0.3 THEN
            whatsapp := phone;
        ELSE
            whatsapp := '01' || (7 + floor(random() * 3))::TEXT || lpad((floor(random() * 100000000))::TEXT, 8, '0');
        END IF;

        -- Generate prices based on type
        cow_price_type := cow_price_types[1 + floor(random() * 3)];
        goat_price_type := goat_price_types[1 + floor(random() * 3)];

        IF cow_price_type = 'PER_ANIMAL' THEN
            cow_price := 3000 + floor(random() * 5000); -- 3000-8000 per animal
        ELSIF cow_price_type = 'PER_KG' THEN
            cow_price := 20 + floor(random() * 30); -- 20-50 per kg
        ELSE
            cow_price := 3 + floor(random() * 5); -- 3-8%
        END IF;

        IF goat_price_type = 'PER_ANIMAL' THEN
            goat_price := 500 + floor(random() * 1500); -- 500-2000 per animal
        ELSIF goat_price_type = 'PER_KG' THEN
            goat_price := 15 + floor(random() * 25); -- 15-40 per kg
        ELSE
            goat_price := 5 + floor(random() * 7); -- 5-12%
        END IF;

        -- Capacities
        cow_capacity := 3 + floor(random() * 15); -- 3-17 cows per day
        goat_capacity := 5 + floor(random() * 25); -- 5-30 goats per day

        -- Unlock limit (some butchers have limits, some don't)
        IF random() > 0.5 THEN
            unlock_limit := 20 + floor(random() * 80); -- 20-100 unlocks
        ELSE
            unlock_limit := NULL;
        END IF;

        -- Create user
        user_id := gen_random_uuid();
        INSERT INTO users (id, phone, name, user_type, is_active, is_verified, created_at, updated_at)
        VALUES (user_id, phone, full_name, 'BUTCHER', true, true, now(), now());

        -- Create butcher
        butcher_id := gen_random_uuid();
        INSERT INTO butchers (id, user_id, whatsapp, cow_price, cow_price_type, goat_price, goat_price_type,
                             cow_capacity, goat_capacity, status, unlock_limit, created_at, updated_at, approved_at)
        VALUES (butcher_id, user_id, whatsapp, cow_price, cow_price_type, goat_price, goat_price_type,
               cow_capacity, goat_capacity, 'APPROVED', unlock_limit, now(), now(), now());

        -- Assign 1-4 random thanas
        thana_count := 1 + floor(random() * 4);
        FOR j IN 1..thana_count LOOP
            thana_id := 1 + floor(random() * 545); -- Assuming 545 thanas
            BEGIN
                INSERT INTO butcher_thanas (butcher_id, thana_id)
                VALUES (butcher_id, thana_id)
                ON CONFLICT DO NOTHING;
            EXCEPTION WHEN foreign_key_violation THEN
                -- Thana doesn't exist, skip
                NULL;
            END;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully created 200 dummy butchers';
END $$;
