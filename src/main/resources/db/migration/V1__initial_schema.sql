-- ============================================================
-- Kosai Bari V1 — Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Districts (জেলা)
CREATE TABLE districts (
    id SERIAL PRIMARY KEY,
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Thanas (থানা)
CREATE TABLE thanas (
    id SERIAL PRIMARY KEY,
    district_id INTEGER NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_thanas_district ON thanas(district_id);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('BUTCHER', 'CUSTOMER', 'ADMIN')),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_type ON users(user_type);

-- Butcher Profiles
CREATE TABLE butchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    whatsapp VARCHAR(15),
    photo_url VARCHAR(500),
    cow_price INTEGER,
    goat_price INTEGER,
    cow_capacity INTEGER,
    goat_capacity INTEGER,
    rating DECIMAL(2,1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'BLOCKED')),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_butchers_status ON butchers(status);
CREATE INDEX idx_butchers_user ON butchers(user_id);

-- Butcher Service Areas
CREATE TABLE butcher_thanas (
    butcher_id UUID NOT NULL REFERENCES butchers(id) ON DELETE CASCADE,
    thana_id INTEGER NOT NULL REFERENCES thanas(id) ON DELETE CASCADE,
    PRIMARY KEY (butcher_id, thana_id)
);

CREATE INDEX idx_butcher_thanas_thana ON butcher_thanas(thana_id);

-- Customer Profiles
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    whatsapp VARCHAR(15),
    address TEXT,
    district_id INTEGER REFERENCES districts(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_customers_user ON customers(user_id);

-- Customer Preferred Thanas
CREATE TABLE customer_thanas (
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    thana_id INTEGER NOT NULL REFERENCES thanas(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, thana_id)
);

-- Subscription Packages
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    name_bn VARCHAR(50) NOT NULL,
    description TEXT,
    description_bn TEXT,
    contact_limit INTEGER, -- NULL = unlimited
    price INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    contacts_used INTEGER DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Unlocked Contacts
CREATE TABLE unlocked_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    butcher_id UUID NOT NULL REFERENCES butchers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, butcher_id)
);

CREATE INDEX idx_unlocked_customer ON unlocked_contacts(customer_id);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount INTEGER NOT NULL,
    method VARCHAR(20) NOT NULL CHECK (method IN ('BKASH', 'NAGAD', 'ROCKET')),
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    paid_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    butcher_id UUID NOT NULL REFERENCES butchers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, butcher_id)
);

CREATE INDEX idx_favorites_customer ON favorites(customer_id);

-- OTP Storage
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'LOGIN',
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otps_phone ON otps(phone, verified);
