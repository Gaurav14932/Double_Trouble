# AI-Powered Property Tax Assistant Chatbot

A full-stack web application that enables municipal officials to query property tax data using natural language. Powered by Google Generative AI (Gemini), this chatbot converts natural language questions into SQL queries and visualizes results in tables and charts.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Natural Language Processing**: Ask questions in plain English
- **AI-Powered SQL Generation**: Google Gemini API converts queries to SQL
- **Real-time Results**: Instantly retrieve property tax data
- **Data Visualization**: View results as tables, bar charts, and pie charts
- **Ward & Zone Analytics**: Generate collection reports by administrative areas
- **Defaulter Identification**: Quickly identify unpaid properties
- **Payment Status Tracking**: Monitor payment history and status
- **Secure Queries**: SQL injection prevention and input validation
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- Google Generative AI API Key (free)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
# Create database and load sample data
mysql -u root -p < scripts/init-database.sql
```

### 3. Configure Environment
Create `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=property_tax_db

GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

### 4. Run Development Server
```bash
npm run dev
```

Visit **http://localhost:3000**

## Example Queries

### Defaulter Management
```
"Show top 10 defaulters in Ward 5"
→ Returns: Properties with highest unpaid amounts in Ward 5

"List all unpaid properties in Zone A"
→ Returns: All properties with payment_status = UNPAID in Zone A

"Which properties have never paid their taxes?"
→ Returns: Properties with last_payment_date = NULL
```

### Payment Analytics
```
"Total pending tax in Zone A"
→ Returns: Sum of all due_amounts grouped by zone

"Generate ward-wise collection report"
→ Returns: Table showing total, paid, and unpaid amounts per ward

"How many properties are partially paid?"
→ Returns: Count of properties by payment_status
```

### Individual Property Lookup
```
"Check payment status of property ID 1023"
→ Returns: Specific property details and payment info

"Show properties owned by Rajesh Kumar"
→ Returns: All properties for that owner
```

## Architecture

### Tech Stack

**Frontend**
- Next.js 16 (React framework)
- React 19 (UI library)
- Tailwind CSS (styling)
- shadcn/ui (component library)
- Recharts (data visualization)

**Backend**
- Next.js API Routes
- Node.js runtime

**Database**
- MySQL 8.0+
- Connection pooling via mysql2

**AI**
- Google Generative AI API
- Gemini Pro model

### System Flow

```
User Input (Chat)
    ↓
API Route (/api/chat)
    ↓
Gemini API (NLP → SQL)
    ↓
SQL Validation
    ↓
MySQL Query
    ↓
Result Formatting
    ↓
Frontend Display (Table/Chart)
```

## Database Schema

### Properties Table
```sql
CREATE TABLE properties (
  property_id INT PRIMARY KEY AUTO_INCREMENT,
  owner_name VARCHAR(100),
  ward VARCHAR(50),
  zone VARCHAR(50),
  property_address VARCHAR(255),
  tax_amount DECIMAL(10,2),
  due_amount DECIMAL(10,2),
  last_payment_date DATE,
  payment_status ENUM('PAID','UNPAID','PARTIAL')
);
```

### Sample Data
- **100 properties** across 5 wards
- **3 zones** (A, B, C)
- Mixed payment statuses
- Realistic tax amounts (₹11,000 - ₹19,000)

## API Endpoints

### POST /api/chat
Process natural language query and return results.

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
    "results": [
      {
        "property_id": 1,
        "owner_name": "John Doe",
        "ward": "Ward 5",
        "due_amount": 19000
      }
    ],
    "intent": "Identify defaulters",
    "explanation": "Found properties with unpaid taxes in Ward 5",
    "queryType": "table",
    "resultCount": 15,
    "query": "SELECT * FROM properties WHERE..."
  }
}
```

### GET /api/health
Check API and database status.

### GET /api/schema
Retrieve database schema information.

## Project Structure

```
property-tax-assistant/
├── app/
│   ├── page.tsx              # Main chatbot page
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Global styles
│   └── api/
│       ├── chat/route.ts     # Chat API endpoint
│       ├── health/route.ts   # Health check
│       └── schema/route.ts   # Schema endpoint
├── components/
│   ├── ChatInterface.tsx     # Main chat UI
│   ├── MessageBubble.tsx     # Message display
│   ├── ResultsDisplay.tsx    # Results container
│   ├── DataTable.tsx         # Data table view
│   ├── ChartDisplay.tsx      # Charts & stats
│   └── Header.tsx            # App header
├── lib/
│   ├── db.ts                 # Database utilities
│   ├── gemini.ts             # Gemini AI integration
│   └── errors.ts             # Error handling
├── scripts/
│   └── init-database.sql     # Database setup
├── .env.local                # Configuration
└── SETUP_GUIDE.md            # Detailed setup
```

## Component Overview

### ChatInterface
- Main chat component
- Manages conversation state
- Sends queries to API
- Displays messages and results

### ResultsDisplay
- Renders query results
- Chooses between table/chart view
- Shows SQL query transparency
- Displays summary statistics

### DataTable
- Paginated table view
- Formats columns and values
- Handles large datasets
- Sortable columns

### ChartDisplay
- Bar charts for comparisons
- Pie charts for distributions
- Summary statistics cards
- Responsive layouts

## Security Features

1. **SQL Injection Prevention**
   - Validates all queries
   - Blocks dangerous operations
   - Parameterized database queries

2. **API Key Management**
   - Environment variables only
   - Never exposed in frontend
   - Server-side execution

3. **Input Validation**
   - User input sanitization
   - Query string validation
   - Rate limiting ready

## Performance

- **Database Indexes** on ward, zone, payment_status, due_amount
- **Query Limits** to 100 rows per query
- **Frontend Pagination** (10 items per page)
- **Connection Pooling** for MySQL efficiency

## Troubleshooting

### Database Connection Failed
```bash
# Verify MySQL is running
mysql -u root -p -e "SELECT 1;"

# Check .env.local credentials
cat .env.local
```

### API Key Issues
```bash
# Verify key in .env.local
echo $GOOGLE_GENERATIVE_AI_API_KEY

# Get key: https://ai.google.dev/
```

### No Results
```bash
# Check database has data
mysql -u property_tax_db -e "SELECT COUNT(*) FROM properties;"

# Re-initialize database
mysql -u root -p < scripts/init-database.sql
```

## Future Roadmap

- [ ] Voice input support
- [ ] Multi-language support (Hindi, Marathi, etc.)
- [ ] Predictive defaulter analytics
- [ ] Payment system integration
- [ ] PDF/Excel export
- [ ] Role-based access control
- [ ] Mobile app
- [ ] SMS notifications
- [ ] Real-time dashboards

## Contributing

Contributions welcome! Please fork and submit pull requests.

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check SETUP_GUIDE.md for detailed setup instructions
- Review sample queries in this README
- Check API error messages for debugging hints

## Credits

Built with:
- Google Generative AI (Gemini API)
- Next.js and React
- Tailwind CSS
- Recharts
- MySQL

## Changelog

### v1.0.0 (Initial Release)
- Natural language query support
- 100 sample properties
- Ward and zone analytics
- Payment status tracking
- Data visualization
- Responsive design

---

**Ready to use!** Start with `npm run dev` and visit http://localhost:3000
