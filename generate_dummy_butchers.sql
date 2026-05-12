-- Generate 200 dummy butchers with users
-- This script creates realistic Bengali butcher profiles

DO $$
DECLARE
    first_names TEXT[] := ARRAY[
        'আব্দুল', 'মোহাম্মদ', 'রহিম', 'করিম', 'জামাল', 'হাসান', 'হোসেন', 'আলী', 'আকবর', 'জাহিদ',
        'রফিক', 'শফিক', 'তোফাজ্জল', 'মোস্তফা', 'সেলিম', 'জাকির', 'নাসির', 'বাশার', 'আনোয়ার', 'মাসুদ',
        'রাশেদ', 'কামাল', 'জামিল', 'ফারুক', 'আশরাফ', 'ইকবাল', 'শাহজাহান', 'নূরুল', 'মনির', 'হানিফ',
        'ইব্রাহিম', 'ইসমাইল', 'ইউসুফ', 'আইয়ুব', 'দাউদ', 'সুলেমান', 'হারুন', 'মুসা', 'ঈসা', 'জাকারিয়া',
        'ফজলুল', 'শামসুল', 'আমিনুল', 'কামরুল', 'সাইফুল', 'শহীদুল', 'আতাউর', 'মতিউর', 'নজরুল', 'রবিউল'
    ];
    last_names TEXT[] := ARRAY[
        'হক', 'ইসলাম', 'আহমেদ', 'খান', 'চৌধুরী', 'মিয়া', 'শেখ', 'মল্লিক', 'সরকার', 'তালুকদার',
        'রহমান', 'করিম', 'উদ্দিন', 'আলম', 'হাসান', 'হোসেন', 'সিকদার', 'মজুমদার', 'ভূঁইয়া', 'পাটোয়ারী',
        'আকন্দ', 'মাহমুদ', 'রশীদ', 'আজিজ', 'হামিদ', 'সামাদ', 'গাজী', 'মোল্লা', 'প্রামাণিক', 'বিশ্বাস'
    ];
    titles TEXT[] := ARRAY['কসাই', 'মাস্টার কসাই', 'সিনিয়র কসাই', 'এক্সপার্ট কসাই', 'প্রফেশনাল কসাই'];

    i INT;
    user_id UUID;
    butcher_id UUID;
    full_name TEXT;
    phone_num TEXT;
    whatsapp_num TEXT;
    cow_price INT;
    goat_price INT;
    cow_cap INT;
    goat_cap INT;
    rating NUMERIC(2,1);
    reviews INT;
    unlock_lim INT;
    price_type TEXT;
    thana_count INT;
    thana_id INT;
    avatar_url TEXT;
BEGIN
    FOR i IN 1..200 LOOP
        -- Generate random name
        full_name := first_names[1 + floor(random() * array_length(first_names, 1))::int] || ' ' ||
                     last_names[1 + floor(random() * array_length(last_names, 1))::int];

        -- Generate phone (01XXXXXXXXX format)
        phone_num := '01' || (3 + floor(random() * 6)::int)::text || lpad(floor(random() * 100000000)::text, 8, '0');
        whatsapp_num := phone_num;

        -- Random prices
        cow_price := 1500 + floor(random() * 2500)::int; -- 1500-4000
        goat_price := 300 + floor(random() * 700)::int;  -- 300-1000

        -- Random capacities
        cow_cap := 3 + floor(random() * 12)::int;   -- 3-15
        goat_cap := 5 + floor(random() * 20)::int;  -- 5-25

        -- Random rating (3.0-5.0)
        rating := 3.0 + (random() * 2.0)::numeric(2,1);
        reviews := floor(random() * 50)::int;

        -- Random unlock limit (5-100)
        unlock_lim := 5 + floor(random() * 95)::int;

        -- Random price type
        price_type := (ARRAY['PER_ANIMAL', 'PER_KG', 'PERCENTAGE'])[1 + floor(random() * 3)::int];

        -- Avatar URL using UI Avatars service
        avatar_url := 'https://ui-avatars.com/api/?name=' || replace(full_name, ' ', '+') ||
                      '&background=' || (ARRAY['E8900A', '1B8B4B', '2563EB', 'DC2626', '7C3AED', 'DB2777'])[1 + floor(random() * 6)::int] ||
                      '&color=fff&size=200&bold=true&format=png';

        -- Create user
        INSERT INTO users (id, phone, name, user_type, is_verified, is_active)
        VALUES (gen_random_uuid(), phone_num, full_name, 'BUTCHER', true, true)
        RETURNING id INTO user_id;

        -- Create butcher
        INSERT INTO butchers (
            id, user_id, whatsapp, photo_url,
            cow_price, cow_price_type, goat_price, goat_price_type,
            cow_capacity, goat_capacity, rating, total_reviews,
            status, approved_at, unlock_limit
        )
        VALUES (
            gen_random_uuid(), user_id, whatsapp_num, avatar_url,
            cow_price, price_type, goat_price, price_type,
            cow_cap, goat_cap, rating, reviews,
            'APPROVED', now(), unlock_lim
        )
        RETURNING id INTO butcher_id;

        -- Assign 1-4 random thanas to this butcher
        thana_count := 1 + floor(random() * 4)::int;
        FOR j IN 1..thana_count LOOP
            thana_id := 1 + floor(random() * 20)::int;
            INSERT INTO butcher_thanas (butcher_id, thana_id)
            VALUES (butcher_id, thana_id)
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- Add some unlock records for realism (0-30% of limit)
        FOR j IN 1..floor(random() * (unlock_lim * 0.3))::int LOOP
            -- We'd need customer IDs for this, skip for now
            NULL;
        END LOOP;

    END LOOP;

    RAISE NOTICE 'Successfully created 200 dummy butchers!';
END $$;

-- Verify the count
SELECT 'Total butchers: ' || COUNT(*)::text FROM butchers WHERE status = 'APPROVED';
SELECT 'Sample butchers:' as info;
SELECT b.id, u.name, u.phone, b.cow_price, b.goat_price, b.rating, b.unlock_limit
FROM butchers b
JOIN users u ON u.id = b.user_id
WHERE b.status = 'APPROVED'
ORDER BY b.created_at DESC
LIMIT 10;
