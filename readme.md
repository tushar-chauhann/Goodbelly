# Goodbelly Backend - Overview

## 📋 Executive Summary

**Goodbelly Backend** is a comprehensive **Node.js/Express** REST API for a food delivery and health consulting platform. The backend manages multiple stakeholders (users, vendors, consultants, admins) and supports:

- **E-commerce**: Product catalog, cart, orders, payments
- **Subscriptions**: Meal subscriptions with recurring billing
- **Consultations**: Health expert booking system
- **Vendor Management**: Multi-vendor marketplace with KYC/compliance
- **Rewards & Referrals**: Loyalty program and promotional codes
- **Delivery Integration**: uEngage third-party delivery service
- **Content Management**: Articles, banners, testimonials

---

## 🛠️ Technology Stack

### Core Technologies
- **Runtime**: Node.js with ES6 modules (`"type": "module"`)
- **Framework**: Express.js v4.21.2
- **Database**: MySQL via Prisma ORM v6.19.0
- **Authentication**: JWT + Passport.js (Google OAuth 2.0)
- **File Storage**: AWS S3
- **Email**: Nodemailer v7.0.3
- **Scheduled Tasks**: node-cron v3.0.3

### Key Dependencies
```json
{
  "express": "^4.21.2",
  "@prisma/client": "^6.19.0",
  "@aws-sdk/client-s3": "^3.933.0",
  "passport-google-oauth20": "^2.0.0",
  "jsonwebtoken": "^9.0.2",
  "bcrypt": "^5.1.1",
  "nodemailer": "^7.0.3",
  "multer": "^1.4.5-lts.1",
  "node-cron": "^3.0.3",
  "axios": "^1.13.1"
}
```

---

## 🗂️ Project Structure

```
BackendGB/
├── src/
│   ├── app.js                  # Main application entry point
│   ├── prismaClient.js         # Prisma client singleton
│   ├── controllers/            # Business logic (29 files)
│   ├── routes/                 # API endpoints (30 files)
│   ├── middlewares/            # Request processing (6 files)
│   ├── utils/                  # Helper functions (8 files)
│   └── integrations/           # External services (3 files)
├── prisma/
│   └── schema.prisma           # Database schema (870 lines, 40+ models)
├── public/                     # Static assets
├── .env                        # Environment configuration
└── package.json
```

---

## 🔑 Key Features & Modules

### 1. **User Management** (`/api/v1/users`)
- Registration & login (email/password + Google OAuth)
- Role-based access: `USER`, `VENDOR`, `ADMIN`, `SUB_ADMIN`
- Profile management with image uploads
- OTP-based verification

### 2. **Product Catalog** (`/api/v1/products`)
- Multi-weight variants (SKU, price, stock management)
- Product types: `VEG`, `NON_VEG`, `EGGETARIAN`
- Categories, brands, ingredients, occasions
- Nutrition information tracking
- Keywords for search optimization
- Soft delete functionality

### 3. **Cart & Orders** (`/api/v1/cart`, `/api/v1/orders`)
- Multi-vendor cart support (one cart per vendor per user)
- Order lifecycle: `PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`
- Payment methods: Online (PayU integration) & Cash on Delivery
- Order tracking with uEngage delivery integration
- Reward points on orders

### 4. **Payment Integration** (`/api/v1/payment`, `/api/v1/payU`)
- **PayU** payment gateway
- Payment status: `PENDING`, `SUCCESS`, `FAILED`, `REFUNDED`
- Order-level and subscription billing

### 5. **Subscriptions** (`/api/v1/subscription`)
- Meal subscriptions (Breakfast/Lunch/Dinner)
- Recurring billing with discount support
- Time window delivery slots
- Subscription status: `ACTIVE`, `PAUSED`, `CANCELLED`, `EXPIRED`
- Vendor-specific subscriptions

### 6. **Vendor Platform** (`/api/v1/vendor`)
- Vendor onboarding with KYC/compliance
- Document upload & verification (Aadhaar, PAN, FSSAI, GST)
- Bank account management
- Earnings tracking (total, received, pending)
- Opening hours & operational status
- Location-based vendor discovery

### 7. **Consultation System** (`/api/v1/consultant`, `/api/v1/booking`)
- Health experts: Nutritionists, Dieticians, Doctors
- Availability & time slot management
- Multi-duration sessions with pricing
- Booking status workflow
- Instant call option
- Reviews & ratings
- Certifications & credentials

### 8. **Promotions & Rewards**
- **Promo Codes** (`/api/v1/promoCode`): Flat/percentage discounts with min order value
- **Referrals** (`/api/v1/referral`): User referral reward system
- **Rewards** (`/api/v1/rewards`): Points-based loyalty program
- **Discounts** (`/api/v1/discount`): Vendor-specific subscription discounts

### 9. **Reviews & Ratings** (`/api/v1/reviews`)
- Product reviews with images
- Consultant reviews
- Subscription reviews
- Admin verification system

### 10. **Delivery Integration** (uEngage)
- Task creation for deliveries
- Real-time rider tracking (name, phone, lat/long)
- Delivery partner status updates
- RTO (Return to Origin) handling

### 11. **Content Management**
- **Banners** (`/api/v1/banner`): Web & mobile platform banners
- **Testimonials** (`/api/v1/testimonials`): Customer testimonials
- **Articles** (`/api/v1/articles`): Blog/content articles
- **Brands** (`/api/v1/brands`): Brand management
- **Contact Forms** (`/api/v1/contact`): User inquiries

### 12. **Location Services** (`/api/v1/location`)
- Address management with lat/long
- Primary address selection
- Location-based vendor filtering

---

## 🗄️ Database Architecture (Prisma Schema)

### Core Models (40+ total)

#### User & Authentication
- **User**: Main user model with role-based access
- **TempOTP**: Temporary OTP storage for verification
- **Referral**: User referral tracking
- **Reward**: Loyalty points system

#### E-commerce
- **Product**: Main product catalog
- **Category**: Product categorization
- **Weight**: Product variants (size/weight)
- **Image**: Product images (multi-image support)
- **Ingredients**: Product ingredients
- **Nutrition**: Nutritional information
- **Occasion**: Product occasions (pre-workout, dessert, etc.)
- **Brand**: Brand management

#### Cart & Orders
- **Cart**: Multi-vendor cart system
- **CartItem**: Cart line items
- **Order**: Order management
- **OrderItem**: Order line items
- **Address**: User delivery addresses

#### Payments
- **PromoCode**: Discount codes
- **UsedPromo**: Promo code usage tracking
- **Discount**: Vendor-specific subscription discounts

#### Subscriptions
- **Subscription**: Recurring meal subscriptions
- **SubscriptionItem**: Subscription line items
- **TimeWindow**: Delivery time slots
- **Billing**: Subscription billing records
- **SubsReview**: Subscription reviews

#### Vendor Management
- **Vendor**: Vendor/kitchen details
- **VendorDocument**: KYC documents (Aadhaar, PAN, FSSAI, GST)
- **BankAccount**: Payment account details

#### Consultation System
- **Consultant**: Health expert profiles
- **ConsultantType**: Expert roles
- **ConsultationDuration**: Session durations & pricing
- **ConsultationLanguage**: Languages spoken
- **ConsultationFocusArea**: Areas of expertise
- **ConsultationAvailability**: Time slot availability
- **ConsultationHighlight**: Expert highlights
- **Certification**: Professional certifications
- **Booking**: Consultation bookings

#### Content & Marketing
- **Banner**: Promotional banners
- **Testimonial**: Customer testimonials
- **Article**: Blog articles
- **Contact**: Contact form submissions
- **Subscribers**: Newsletter subscribers

#### Miscellaneous
- **Wishlist**: User wishlists
- **Review**: Product/consultant reviews
- **community**: Community categorization
- **keyword**: Search keywords
- **Stats**: Platform statistics
- **Scoop**: Rich text content

### Key Relationships
- One User → Many Orders/Carts/Reviews/Addresses
- One Vendor → Many Products/Orders/Subscriptions
- One Product → Many Variants(Weights)/Images/Reviews
- Many-to-Many: Products ↔ Occasions, Products ↔ Ingredients
- One Subscription → Many SubscriptionItems/TimeWindows/Billings

---

## 🔐 Security & Middleware

### Middleware Stack (`src/middlewares/`)
1. **auth.middleware.js**: JWT token verification (2.1 KB)
2. **authorizeRoles.middleware.js**: Role-based access control
3. **errorHandler.js**: Centralized error handling
4. **passport.middleware.js**: Google OAuth strategy (1.7 KB)
5. **multer.middleware.js**: File upload handling
6. **multerProduct.middleware.js**: Product image upload

### Authentication Flow
- **Local Auth**: bcrypt password hashing + JWT tokens
- **OAuth**: Google OAuth 2.0 with Passport.js
- **Session Management**: express-session for OAuth flow
- **Cookie Support**: cookie-parser for token management

---

## 🔧 Utilities (`src/utils/`)

1. **ApiError.js**: Custom error class
2. **ApiResponse.js**: Standardized API response format
3. **asyncHandler.js**: Async error wrapper
4. **enum.js**: Shared enums (2.3 KB)
5. **mail.service.js**: Email templates & sending (36 KB - comprehensive)
6. **orderCleanup.cron.js**: Scheduled cleanup of pending orders (3.8 KB)
7. **s3.js**: AWS S3 upload utility
8. **s3Delete.js**: AWS S3 delete utility

### Cron Jobs
- **Order Cleanup**: Automatically cancels pending orders after timeout

---

## 🔗 External Integrations

### uEngage Delivery Service (`src/integrations/`)
- **uengage.config.js**: Configuration
- **uengage.service.js**: API client (2.3 KB)
- **uengage.utils.js**: Helper functions

**Features:**
- Create delivery tasks
- Track rider location
- Update delivery status
- Handle RTO scenarios

---

## 🌐 API Routes (24 Modules)

All routes are prefixed with `/api/v1/`:

| Route | Purpose | Controller Size |
|-------|---------|-----------------|
| `/users` | User management | 13.1 KB |
| `/products` | Product catalog | 21.3 KB |
| `/categories` | Category management | 3.7 KB |
| `/wishlist` | User wishlist | 2.5 KB |
| `/address` | Address management | 5.0 KB |
| `/cart` | Shopping cart | 6.9 KB |
| `/rewards` | Loyalty points | 2.0 KB |
| `/promoCode` | Promo codes | 8.4 KB |
| `/orders` | Order management | 30.3 KB |
| `/reviews` | Product/consultant reviews | 6.3 KB |
| `/payment` | Payment processing | 10.1 KB |
| `/payU` | PayU gateway | 10.5 KB |
| `/referral` | Referral system | 3.0 KB |
| `/banner` | Banner management | 4.2 KB |
| `/testimonials` | Testimonials | 3.1 KB |
| `/reports` | Admin reports | 11.1 KB |
| `/contact` | Contact forms | 3.1 KB |
| `/articles` | Blog articles | 2.0 KB |
| `/brands` | Brand management | 3.6 KB |
| `/vendor` | Vendor operations | 25.3 KB |
| `/ingredients` | Ingredient catalog | 3.6 KB |
| `/community` | Community groups | 5.3 KB |
| `/occasion` | Occasions | 4.3 KB |
| `/consultant` | Expert management | 25.2 KB |
| `/booking` | Consultation bookings | 8.4 KB |
| `/subscription` | Meal subscriptions | 12.2 KB |
| `/discount` | Vendor discounts | 5.9 KB |
| `/uengage` | Delivery webhooks | — |
| `/auth/google` | Google OAuth | 0.7 KB |
| `/location` | Location services | 19.9 KB |

**Total:** 30 route files, 29 controller files

---

## 🎯 Business Logic Highlights

### Multi-Vendor Support
- Users can have separate carts per vendor
- Orders track vendor-specific items
- Vendor earnings & payout tracking
- Vendor-specific subscriptions & discounts

### Smart Subscription System
- Meal type selection (Breakfast/Lunch/Dinner)
- Flexible delivery time windows
- Discount application at subscription level
- Recurring billing with next billing date tracking
- Pause/cancel functionality

### Comprehensive Consultant Platform
- Multiple consultation durations with pricing
- Weekly availability schedule
- Language preferences
- Focus area specialization
- Instant call support
- Bank account for payouts
- Professional certifications

### Advanced Vendor Compliance
- KYC document management (Aadhaar, PAN, FSSAI, GST)
- Document verification workflow
- Masked storage for sensitive IDs
- File hash integrity checks
- Rejection reason tracking

### Delivery Integration
- Third-party delivery via uEngage
- Real-time rider tracking
- Delivery status webhooks
- RTO handling
- Order-to-delivery lifecycle management

---

## ⚙️ Environment Configuration

Based on the CORS setup and .env usage, the system expects:

```env
DATABASE_URL=mysql://...
PORT=3000
CORS_ORIGIN=<frontend-url>
CORS_ORIGIN2=<frontend-url-2>
CORS_ORIGIN_ADMIN=<admin-panel-url>
CORS_ORIGIN_ADMIN2=<admin-panel-url-2>
SESSION_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
AWS_S3_BUCKET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...
PAYU_MERCHANT_KEY=...
PAYU_SALT=...
UENGAGE_API_KEY=...
```

---

## 📊 Scale & Complexity

- **Database Schema**: 870 lines, 40+ models, 15+ enums
- **Total Routes**: 30 route files
- **Total Controllers**: 29 controller files
- **Total Lines of Code**: ~250KB+ across all modules
- **Largest Controllers**: 
  - Order (30.3 KB)
  - Consultant (25.2 KB)
  - Vendor (25.3 KB)
  - Product (21.3 KB)
  - Location (19.9 KB)

---

## 🔍 Notable Implementation Details

### Email Service
- **36 KB** mail service with comprehensive templates
- Order confirmations, OTP emails, booking confirmations
- Vendor notifications, status updates

### Order Cleanup Cron
- Scheduled job to clean up stale pending orders
- Prevents inventory locking from abandoned carts

### Soft Delete Pattern
- Products use `isDeleted` + `deletedAt` for soft deletion
- Preserves historical data integrity

### Multi-Platform Banners
- Separate banners for WEB and MOBILE platforms
- Platform-specific targeting

### uEngage Integration
- Webhook-based status updates
- Rider tracking with real-time location
- Delivery partner status synchronization

---

## 🎨 API Design Patterns

- **RESTful Routes**: Standard CRUD operations
- **Async/Await**: All controllers use async handlers
- **Error Handling**: Centralized error middleware
- **Response Format**: Standardized ApiResponse class
- **Validation**: Prisma schema + controller-level validation
- **Authentication**: JWT middleware on protected routes
- **Authorization**: Role-based middleware (ADMIN, USER, VENDOR, etc.)

---

## 🚀 Development Workflow

### Running the Application
```bash
npm start  # Uses nodemon for auto-reload
```

### Database Management
```bash
npx prisma migrate dev    # Run migrations
npx prisma generate       # Generate Prisma client
npx prisma studio         # Database GUI
```

---

## 📝 Summary

The Goodbelly Backend is a **production-ready, full-featured food delivery platform** with:

✅ Multi-vendor marketplace  
✅ Subscription meal plans  
✅ Health consultation booking  
✅ Payment gateway integration (PayU)  
✅ Delivery partner integration (uEngage)  
✅ Comprehensive admin & vendor portals  
✅ Rewards & referral system  
✅ Document verification & KYC  
✅ Real-time order tracking  
✅ Email notifications  
✅ AWS S3 file storage  
✅ Google OAuth authentication  

The codebase is well-structured, follows modern Node.js practices, and handles complex business logic across multiple stakeholder types.
