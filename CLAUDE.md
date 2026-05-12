# CLAUDE.md — Kosai Bari (কসাই বাড়ি)

> Butcher marketplace connecting কসাই (butchers) with customers in Bangladesh.
> Mobile-first responsive webapp for Qurbani/meat processing services.

---

## 1. Project Overview

**Project Name:** Kosai Bari (কসাই বাড়ি)
**Tagline:** আপনার লোকেশনে নির্ভরযোগ্য কসাই খুঁজুন
**Owner:** Mahfuz Ahmed — Web Innovation
**Region:** Bangladesh

**Business Model:**
- Free registration for butchers and customers
- Customers pay subscription to unlock butcher contact details
- Packages: Basic (৳149/3 contacts), Standard (৳189/5), Premium (৳249/unlimited)

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Spring Boot | 3.3.x |
| Java | OpenJDK | 21 LTS |
| Database | PostgreSQL | 16.x |
| Cache | Redis | 7.x |
| Frontend | Next.js | 15.x (App Router) |
| Language | TypeScript | 5.x (strict) |
| Styling | Tailwind CSS | 3.4.x |
| SMS | SSL Wireless | - |
| Payments | bKash, Nagad, Rocket | - |

---

## 3. User Types

### 3.1 Butcher (কসাই)
- Registers with phone + OTP
- Creates profile: name, photo, WhatsApp, service areas
- Sets pricing: cow processing (গরু), goat processing (ছাগল)
- Sets capacity: how many animals they can process
- Needs admin approval before listing

### 3.2 Customer (গ্রাহক)
- Registers with phone + OTP
- Searches butchers by location
- Buys subscription to unlock contact details
- Can favorite/bookmark butchers

### 3.3 Admin
- Approves/blocks butchers
- Manages districts and thanas
- Verifies payments
- Views reports
- Removes fake accounts

---

## 4. Database Schema

```sql
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
    district_id INTEGER REFERENCES districts(id),
    name_bn VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255),
    user_type VARCHAR(20) NOT NULL, -- BUTCHER, CUSTOMER, ADMIN
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Butcher Profiles
CREATE TABLE butchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    whatsapp VARCHAR(15),
    photo_url VARCHAR(500),
    cow_price INTEGER, -- টাকা
    goat_price INTEGER, -- টাকা
    cow_capacity INTEGER, -- সংখ্যা
    goat_capacity INTEGER, -- সংখ্যা
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, BLOCKED
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Butcher Service Areas
CREATE TABLE butcher_thanas (
    butcher_id UUID REFERENCES butchers(id) ON DELETE CASCADE,
    thana_id INTEGER REFERENCES thanas(id),
    PRIMARY KEY (butcher_id, thana_id)
);

-- Customer Profiles
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    whatsapp VARCHAR(15),
    address TEXT,
    district_id INTEGER REFERENCES districts(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Preferred Thanas
CREATE TABLE customer_thanas (
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    thana_id INTEGER REFERENCES thanas(id),
    PRIMARY KEY (customer_id, thana_id)
);

-- Subscription Packages
CREATE TABLE packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    name_bn VARCHAR(50) NOT NULL,
    contact_limit INTEGER, -- NULL = unlimited
    price INTEGER NOT NULL, -- টাকা
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customer Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES packages(id),
    contacts_used INTEGER DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'ACTIVE' -- ACTIVE, EXPIRED, CANCELLED
);

-- Unlocked Contacts
CREATE TABLE unlocked_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    butcher_id UUID REFERENCES butchers(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, butcher_id)
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount INTEGER NOT NULL,
    method VARCHAR(20) NOT NULL, -- BKASH, NAGAD, ROCKET
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    butcher_id UUID REFERENCES butchers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(customer_id, butcher_id)
);

-- OTP Storage (temporary, use Redis in production)
CREATE TABLE otps (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. API Endpoints

### Auth
```
POST /auth/send-otp      { phone } → { success, message }
POST /auth/verify-otp    { phone, code } → { token, user }
POST /auth/refresh       { refreshToken } → { token }
```

### Registration
```
POST /register/butcher   { name, whatsapp, thanaIds[], cowPrice, goatPrice, cowCapacity, goatCapacity, photo } → { butcher }
POST /register/customer  { name, whatsapp, address, districtId, thanaIds[] } → { customer }
```

### Butchers (Public)
```
GET  /butchers                   ?districtId=&thanaId=&page=&limit= → { butchers[], total }
GET  /butchers/:id               → { butcher } (limited info unless unlocked)
POST /butchers/:id/unlock        → { butcher } (full info, requires subscription)
POST /butchers/:id/favorite      → { success }
DELETE /butchers/:id/favorite    → { success }
```

### Customer
```
GET  /me                         → { user, profile }
GET  /me/unlocked                → { butchers[] }
GET  /me/favorites               → { butchers[] }
GET  /me/subscription            → { subscription, usage }
```

### Packages & Payments
```
GET  /packages                   → { packages[] }
POST /subscriptions              { packageId } → { subscription, paymentUrl }
POST /payments/callback          (webhook from payment provider)
```

### Admin
```
GET  /admin/stats                → { totalUsers, paid, unpaid, butchers, customers }
GET  /admin/users                ?type=&status=&page= → { users[] }
GET  /admin/butchers/pending     → { butchers[] }
POST /admin/butchers/:id/approve → { butcher }
POST /admin/butchers/:id/block   → { butcher }
GET  /admin/payments             ?status=&page= → { payments[] }
POST /admin/payments/:id/verify  → { payment }
GET  /admin/districts            → { districts[] }
POST /admin/districts            { nameBn, nameEn } → { district }
GET  /admin/thanas               ?districtId= → { thanas[] }
POST /admin/thanas               { districtId, nameBn, nameEn } → { thana }
```

---

## 6. Frontend Pages

### Public
- `/` - Landing page
- `/login` - Phone login
- `/register` - Choose user type
- `/register/butcher` - Butcher registration form
- `/register/customer` - Customer registration form
- `/verify` - OTP verification

### Customer App
- `/home` - Search butchers, filter by location
- `/search` - Advanced search
- `/butcher/:id` - Butcher profile
- `/packages` - Subscription packages
- `/payment` - Payment page
- `/profile` - User profile
- `/favorites` - Saved butchers
- `/unlocked` - Unlocked contacts

### Admin
- `/admin` - Dashboard
- `/admin/users` - User management
- `/admin/butchers` - Butcher approvals
- `/admin/payments` - Payment verification
- `/admin/locations` - District/Thana management
- `/admin/reports` - Reports

---

## 7. Color Scheme (from design)

```css
:root {
  --primary: #1B8B4B;      /* Green */
  --primary-dark: #156B3A;
  --primary-light: #E8F5EE;
  --secondary: #F5F5F5;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --border: #E0E0E0;
  --white: #FFFFFF;
  --danger: #DC2626;
  --warning: #F59E0B;
}
```

---

## 8. Deployment

- **Frontend:** Port 3001
- **Backend:** Port 8082
- **Database:** Shared PostgreSQL (separate database: kosaibari)
- **Redis:** Shared Redis instance
- **Domain:** TBD

---

## 9. Bengali UI Strings

All UI text in Bengali with English fallback.
Font: Hind Siliguri (Google Fonts)

---

*Last updated: 2026-05-11*
