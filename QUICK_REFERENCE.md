# Quick Reference Card - Property Tax Assistant

## Getting Started (5 Minutes)

### 1. Prerequisites Checklist
```bash
node --version          # Should be v18+
mysql --version        # Should be 8.0+
```

### 2. Three-Step Setup
```bash
# 1. Install
npm install

# 2. Setup Database (choose one)
mysql -u root -p < scripts/init-database.sql
# OR
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8.0

# 3. Add API Key to .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your_key_from_ai.google.dev
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=property_tax_db
```

### 4. Run
```bash
npm run dev
# Visit: http://localhost:3000
```

---

## Common Queries (Copy & Paste)

### Top Defaulters
```
"Show top 10 defaulters in Ward 5"
"List unpaid properties in Zone A"
"Which properties have the highest due amounts?"
```

### Payment Status
```
"Check payment status of property ID 23"
"How many properties are fully paid?"
"Show properties with partial payments"
```

### Reports & Analytics
```
"Generate ward-wise collection report"
"Total pending tax by zone"
"Count properties by payment status"
```

### Advanced Filtering
```
"Show unpaid properties with due amount over 15000"
"Find properties owned by Rajesh"
"Which ward has the most defaulters?"
```

---

## File Locations

| File | Purpose |
|------|---------|
| `.env.local` | Configuration (create this) |
| `SETUP_GUIDE.md` | Detailed setup instructions |
| `README.md` | Project overview |
| `TEST_QUERIES.md` | Example queries to test |
| `scripts/init-database.sql` | Database schema |
| `app/api/chat/route.ts` | Main API endpoint |
| `components/ChatInterface.tsx` | Chat UI |

---

## API Endpoints

```
POST /api/chat
→ Send natural language query
→ Returns: results, intent, SQL query

GET /api/health
→ Check database connection

GET /api/schema
→ Get database schema info
```

---

## Database Tables

### properties
```
property_id (INT)
owner_name (VARCHAR)
ward (VARCHAR) - Ward 1, 2, 3, 4, 5
zone (VARCHAR) - A, B, C
property_address (VARCHAR)
tax_amount (DECIMAL)
due_amount (DECIMAL)
last_payment_date (DATE)
payment_status (ENUM: PAID, UNPAID, PARTIAL)
```

### Sample Data
- 100 properties
- 5 wards × 3 zones
- Mixed payment statuses

---

## Environment Variables

```env
# Database
DB_HOST=localhost          # MySQL server host
DB_PORT=3306             # MySQL port
DB_USER=root             # MySQL username
DB_PASSWORD=root         # MySQL password
DB_NAME=property_tax_db  # Database name

# AI
GOOGLE_GENERATIVE_AI_API_KEY=xxx  # From ai.google.dev
```

---

## Troubleshooting

### Can't Connect to Database
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# Check credentials in .env.local
# Check database exists
mysql -u root -p -e "SHOW DATABASES;"
```

### API Key Error
```bash
# Get key from https://ai.google.dev/
# Add to .env.local
# Restart dev server
npm run dev
```

### No Data Found
```bash
# Re-initialize database
mysql -u root -p < scripts/init-database.sql

# Verify data
mysql property_tax_db -e "SELECT COUNT(*) FROM properties;"
```

### Slow Queries
- Database has indexes (ward, zone, payment_status)
- Queries limited to 100 results
- Normal queries < 1 second

---

## Key Features

✓ Natural language to SQL conversion
✓ Defaulter identification
✓ Ward-wise analytics
✓ Payment status tracking
✓ Data visualization (tables & charts)
✓ SQL injection prevention
✓ Mobile responsive
✓ Sample data included

---

## Architecture Overview

```
Frontend (React)
    ↓ (Query)
API Route (/api/chat)
    ↓ (NLP)
Gemini API
    ↓ (SQL)
SQL Validation
    ↓ (Execute)
MySQL Database
    ↓ (Results)
Display (Table/Chart)
```

---

## Important Files to Know

```
/components/
  ChatInterface.tsx    ← Main chat logic
  ResultsDisplay.tsx   ← Result formatting
  DataTable.tsx        ← Table view
  ChartDisplay.tsx     ← Visualization

/lib/
  db.ts               ← Database functions
  gemini.ts           ← AI integration
  errors.ts           ← Error handling

/app/api/
  chat/route.ts       ← Chat API
  health/route.ts     ← Status check
  schema/route.ts     ← Database schema
```

---

## Expected Behavior

### Successful Query
1. User enters natural language
2. API converts to SQL (< 1 sec)
3. Database executes query (< 1 sec)
4. Results displayed as table/chart
5. SQL visible for transparency

### Error Cases Handled
- Database not running → Clear error message
- API key missing → Configuration error
- Invalid query → "No results found"
- SQL injection attempt → Query blocked

---

## Performance Stats

| Metric | Target |
|--------|--------|
| Page Load | < 2s |
| Query Processing | < 1s |
| Database Query | < 500ms |
| Chart Rendering | < 1s |
| Pagination | Instant |

---

## Sample Data Statistics

- **Properties**: 100
- **Total Tax**: ~₹1,500,000
- **Total Pending**: ~₹600,000
- **Paid**: ~25 properties
- **Unpaid**: ~45 properties
- **Partial**: ~30 properties

---

## Next Steps

1. ✓ Run `npm run dev`
2. ✓ Visit http://localhost:3000
3. ✓ Try sample queries from TEST_QUERIES.md
4. ✓ Explore different query types
5. ✓ Test with your own questions

---

## Resources

| Resource | Link |
|----------|------|
| Google AI Studio | https://ai.google.dev/ |
| Next.js Docs | https://nextjs.org/docs |
| MySQL Docs | https://dev.mysql.com/doc/ |
| Recharts | https://recharts.org/ |

---

## Support Checklist

- [ ] Database initialized with 100 records
- [ ] API key configured
- [ ] Environment variables set
- [ ] Dev server running
- [ ] Can access http://localhost:3000
- [ ] Can submit queries
- [ ] Results display correctly
- [ ] Charts show data
- [ ] Tables paginate
- [ ] Error handling works

---

## Quick Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm start              # Run production build

# Database
mysql -u root -p      # Connect to MySQL
mysql -u root -p < scripts/init-database.sql  # Initialize

# Debugging
npm run lint           # Check code
node --version         # Check Node
mysql --version        # Check MySQL
```

---

## Version Info

- Next.js: 16.2.0
- React: 19.2.4
- Node: 18+
- MySQL: 8.0+
- Gemini API: Latest

---

**Ready in 5 minutes! Start with `npm run dev`** ✨
