-- ============================================================
-- Kosai Bari V2 — Seed Data
-- ============================================================

-- Dhaka District and Thanas
INSERT INTO districts (name_bn, name_en) VALUES ('ঢাকা', 'Dhaka');

INSERT INTO thanas (district_id, name_bn, name_en) VALUES
    (1, 'মিরপুর', 'Mirpur'),
    (1, 'উত্তরা', 'Uttara'),
    (1, 'মোহাম্মদপুর', 'Mohammadpur'),
    (1, 'ধানমন্ডি', 'Dhanmondi'),
    (1, 'যাত্রাবাড়ী', 'Jatrabari'),
    (1, 'খিলগাঁও', 'Khilgaon'),
    (1, 'বনানী', 'Banani'),
    (1, 'গুলশান', 'Gulshan'),
    (1, 'রামপুরা', 'Rampura'),
    (1, 'বাড্ডা', 'Badda'),
    (1, 'তেজগাঁও', 'Tejgaon'),
    (1, 'শাহবাগ', 'Shahbag'),
    (1, 'মতিঝিল', 'Motijheel'),
    (1, 'পল্টন', 'Paltan'),
    (1, 'সাভার', 'Savar');

-- Chattogram District and Thanas
INSERT INTO districts (name_bn, name_en) VALUES ('চট্টগ্রাম', 'Chattogram');

INSERT INTO thanas (district_id, name_bn, name_en) VALUES
    (2, 'আগ্রাবাদ', 'Agrabad'),
    (2, 'নাসিরাবাদ', 'Nasirabad'),
    (2, 'পাঁচলাইশ', 'Panchlaish'),
    (2, 'হালিশহর', 'Halishahar'),
    (2, 'কোতোয়ালি', 'Kotwali');

-- Gazipur District
INSERT INTO districts (name_bn, name_en) VALUES ('গাজীপুর', 'Gazipur');

INSERT INTO thanas (district_id, name_bn, name_en) VALUES
    (3, 'টঙ্গী', 'Tongi'),
    (3, 'গাজীপুর সদর', 'Gazipur Sadar'),
    (3, 'কালীগঞ্জ', 'Kaliganj');

-- Narayanganj District
INSERT INTO districts (name_bn, name_en) VALUES ('নারায়ণগঞ্জ', 'Narayanganj');

INSERT INTO thanas (district_id, name_bn, name_en) VALUES
    (4, 'নারায়ণগঞ্জ সদর', 'Narayanganj Sadar'),
    (4, 'সিদ্ধিরগঞ্জ', 'Siddhirganj'),
    (4, 'ফতুল্লা', 'Fatullah');

-- Subscription Packages
INSERT INTO packages (name, name_bn, description, description_bn, contact_limit, price, sort_order) VALUES
    ('Basic', 'বেসিক', '3 butcher contacts', '৩ জন কসাইয়ের নম্বর', 3, 149, 1),
    ('Standard', 'স্ট্যান্ডার্ড', '5 butcher contacts', '৫ জন কসাইয়ের নম্বর', 5, 189, 2),
    ('Premium', 'প্রিমিয়াম', 'Unlimited butcher contacts', 'আনলিমিটেড কসাইয়ের নম্বর', NULL, 249, 3);

-- Admin User (phone: 01700000000, will need OTP to login)
INSERT INTO users (id, phone, name, user_type, is_verified, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '01700000000',
    'Admin',
    'ADMIN',
    true,
    true
);
