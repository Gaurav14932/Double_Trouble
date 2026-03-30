# AI-Powered Property Tax Assistant Chatbot - Complete Setup Guide

## Project Overview

This is a full-stack application that enables municipal officials to query property tax data using natural language. The AI chatbot converts natural language queries to SQL and displays results in tables and charts.

**Tech Stack:**
- Frontend: Next.js 16, React, Tailwind CSS, shadcn/ui
- Backend: Next.js API Routes
- Database: MySQL
- AI: Google Generative AI (Gemini API)
- Visualization: Recharts

---

## Prerequisites

Before starting, ensure you have installed:

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/

2. **MySQL** (v8.0 or higher)
   - Download: https://dev.mysql.com/downloads/mysql/
   - OR use Docker: `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.0`

3. **Google Generative AI API Key**
   - Visit: https://ai.google.dev/
   - Get free API key from Google AI Studio
   - No credit card required for free tier

---

## Installation & Setup Steps

### Step 1: Clone and Install Dependencies

```bash
# Navigate to project directory
cd property-tax-assistant

# Install dependencies
npm install
# or
pnpm install
```

### Step 2: Setup Database

#### Option A: Using MySQL Command Line

```bash
# Connect to MySQL
mysql -u root -p

# Run the initialization script
source scripts/init-database.sql

# Verify installation
USE property_tax_db;
SELECT COUNT(*) FROM properties;
```

#### Option B: Using MySQL GUI (MySQL Workbench)

1. Open MySQL Workbench
2. Create new connection to `localhost:3306`
3. Open SQL editor
4. Copy contents of `scripts/init-database.sql`
5. Execute the script

#### Option C: Using Docker

```bash
# Start MySQL container
docker run -d \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=property_tax_db \
  -v mysql_data:/var/lib/mysql \
  mysql:8.0

# Run initialization script
docker exec -i <container_id> mysql -uroot -proot < scripts/init-database.sql
```

### Step 3: Environment Variables

Create `.env.local` file in project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=property_tax_db

# Google Generative AI API Key (Get from https://ai.google.dev/)
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

**How to get Google API Key:**
1. Visit https://ai.google.dev/
2. Click "Get API Key" → "Create API key in Google Cloud"
3. Copy the API key
4. Paste in `.env.local`

### Step 4: Start Development Server

```bash
npm run dev
# or
pnpm dev
```

The application will be available at: **http://localhost:3000**

---

## Database Schema

### Properties Table

| Column | Type | Description |
|--------|------|-------------|
| property_id | INT | Unique identifier |
| owner_name | VARCHAR | Property owner's name |
| ward | VARCHAR | Administrative ward |
| zone | VARCHAR | Geographic zone (A, B, C) |
| property_address | VARCHAR | Full address |
| tax_amount | DECIMAL | Total tax amount |
| due_amount | DECIMAL | Pending tax amount |
| last_payment_date | DATE | Date of last payment |
| payment_status | ENUM | PAID / UNPAID / PARTIAL |

**Sample Data:** 100 properties across 5 wards and 3 zones

---

## API Endpoints

### 1. Chat Endpoint
```
POST /api/chat
```

**Request:**
```json
{
  "message": "Show top defaulters in Ward 5"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [...],
    "intent": "Identify defaulters",
    "explanation": "Found 15 properties with unpaid taxes...",
    "queryType": "table",
    "resultCount": 15,
    "query": "SELECT * FROM properties WHERE..."
  }
}
```

### 2. Health Check
```
GET /api/health
```

Verify database connection and API status.

### 3. Schema Info
```
GET /api/schema
```

Returns database schema for reference.

---

## Sample Queries to Try

Try these natural language queries in the chatbot:

1. **Defaulter Identification**
   - "Show top defaulters in Ward 5"
   - "List all unpaid properties in Zone A"
   - "Which properties have the highest due amounts?"

2. **Payment Status**
   - "Check payment status of property ID 1023"
   - "How many properties are partially paid?"
   - "Show paid properties in Ward 2"

3. **Analytics & Reports**
   - "Total pending tax in Zone A"
   - "Generate ward-wise collection report"
   - "Show tax collection by payment status"
   - "How many unpaid properties are in each ward?"

4. **Advanced Queries**
   - "Find properties that haven't paid since 2023"
   - "List top 5 properties by due amount"
   - "Count properties by payment status and zone"

---

## Architecture

### Frontend Flow
1. User enters natural language query
2. ChatInterface component sends to `/api/chat`
3. Response includes results, intent, and SQL query
4. ResultsDisplay component renders appropriate view:
   - **Table**: For detailed property records
   - **Charts**: For aggregated data
   - **Both**: For comprehensive view

### Backend Flow
1. API receives natural language query
2. Gemini API converts to SQL
3. Query validation prevents SQL injection
4. MySQL executes validated query
5. Results formatted and returned to frontend

---

## File Structure

```
project/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main chatbot page
│   ├── globals.css         # Global styles
│   └── api/
│       ├── chat/route.ts   # Chat endpoint
│       ├── health/route.ts # Health check
│       └── schema/route.ts # Schema endpoint
├── components/
│   ├── ChatInterface.tsx   # Main chat component
│   ├── MessageBubble.tsx   # Message display
│   ├── ResultsDisplay.tsx  # Results container
│   ├── DataTable.tsx       # Table with pagination
│   ├── ChartDisplay.tsx    # Charts & visualization
│   └── Header.tsx          # App header
├── lib/
│   ├── db.ts              # Database utilities
│   ├── gemini.ts          # AI integration
│   └── errors.ts          # Error handling
├── scripts/
│   └── init-database.sql  # Database schema
├── .env.local             # Environment variables
└── SETUP_GUIDE.md         # This file
```

---

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:**
- Ensure MySQL is running: `mysql -u root -p -e "SELECT 1;"`
- Check `.env.local` has correct credentials
- If using Docker, verify container is running: `docker ps`

### API Key Not Set
```
Error: GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set
```

**Solution:**
- Add API key to `.env.local`
- Get key from https://ai.google.dev/
- Restart development server after adding key

### No Data in Database
```
No results found for any query
```

**Solution:**
- Verify database initialization: `SELECT COUNT(*) FROM properties;`
- Re-run `scripts/init-database.sql`
- Check you're using correct database: `USE property_tax_db;`

### Slow Queries
**Solution:**
- Database has indexes on ward, zone, payment_status, due_amount
- Queries limit results to 100 rows
- Increase LIMIT in Gemini prompt if needed

---

## Security Considerations

1. **SQL Injection Prevention**
   - Only SELECT queries allowed
   - Query validation in `lib/db.ts`
   - Parameterized queries via mysql2

2. **API Key Protection**
   - Store in `.env.local` (never commit)
   - Add `.env.local` to `.gitignore`
   - Keys never exposed in frontend

3. **Input Validation**
   - All queries validated before execution
   - Dangerous operations blocked
   - User input sanitized

---

## Performance Optimization

1. **Database Indexes**
   ```sql
   INDEX idx_ward (ward)
   INDEX idx_zone (zone)
   INDEX idx_payment_status (payment_status)
   INDEX idx_due_amount (due_amount)
   ```

2. **Query Limits**
   - Results limited to 100 rows
   - Pagination in frontend (10 per page)

3. **Caching Strategy**
   - Schema cached in memory
   - Consider Redis for larger deployments

---

## Future Enhancements

- [ ] Voice input support
- [ ] Multi-language support (Hindi, Marathi)
- [ ] Predictive analytics for defaulter identification
- [ ] Integration with payment systems
- [ ] Export reports to PDF/Excel
- [ ] Role-based access control
- [ ] Audit logging for compliance
- [ ] Mobile application
- [ ] Real-time notifications
- [ ] SMS reminders for defaulters

---

## Support & Resources

- **Gemini API Docs**: https://ai.google.dev/
- **Next.js Docs**: https://nextjs.org/docs
- **MySQL Docs**: https://dev.mysql.com/doc/
- **Recharts Docs**: https://recharts.org/

---

## License

MIT License - Feel free to modify and use for your municipality.

---

## Version Info

- Next.js 16.2.0
- React 19.2.4
- MySQL 8.0+
- Google Generative AI API

---

**Setup completed! Access the chatbot at http://localhost:3000**
