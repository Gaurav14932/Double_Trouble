# Test Queries Guide

This guide provides sample natural language queries to test the AI Property Tax Assistant Chatbot. Each query category demonstrates different features and capabilities.

---

## 1. Defaulter Identification Queries

These queries help identify properties with unpaid taxes.

### Query 1.1: Top Defaulters by Amount
```
"Show top 10 defaulters by due amount"
```

**Expected Result:**
- Shows 10 properties with highest unpaid amounts
- Displays as table with due_amount column sorted descending
- Can see owner_name, ward, zone, tax_amount, and due_amount

**Validate:**
- Results should have payment_status = 'UNPAID'
- Due amounts should be > 0
- Sorted by due_amount DESC

### Query 1.2: Defaulters in Specific Ward
```
"List all unpaid properties in Ward 5"
```

**Expected Result:**
- Shows all properties in Ward 5 with payment_status = 'UNPAID'
- Should return approximately 3-5 properties
- Includes owner information and amount details

**Validate:**
- All results have ward = 'Ward 5'
- All have payment_status = 'UNPAID' or 'PARTIAL'

### Query 1.3: Defaulters by Zone
```
"Which properties are unpaid in Zone A?"
```

**Expected Result:**
- Properties with payment_status = 'UNPAID' in Zone A
- Returns approximately 8-10 results
- Shows tax and due amounts

**Validate:**
- All results have zone = 'A'
- All have unpaid amounts

### Query 1.4: Properties Never Paid
```
"Show properties that have never made a payment"
```

**Expected Result:**
- Properties where last_payment_date is NULL
- Shows properties with payment_status = 'UNPAID' and no payment history
- Approximately 20-25 properties

**Validate:**
- last_payment_date should be NULL
- due_amount should equal tax_amount (no payments made)

---

## 2. Payment Status Queries

These queries track and monitor payment information.

### Query 2.1: Specific Property Status
```
"Check payment status of property ID 23"
```

**Expected Result:**
- Single property record (property_id = 23)
- Shows complete details including owner, location, amounts, dates
- Displays payment_status

**Validate:**
- Only 1 result returned
- Includes last_payment_date and payment_status

### Query 2.2: Paid Properties
```
"Show all properties that are fully paid"
```

**Expected Result:**
- Properties with payment_status = 'PAID'
- Approximately 20-25 records
- Shows that due_amount = 0

**Validate:**
- All results have payment_status = 'PAID'
- All have due_amount = 0

### Query 2.3: Partially Paid Properties
```
"List properties with partial payments"
```

**Expected Result:**
- Properties with payment_status = 'PARTIAL'
- Shows mix of paid and unpaid amounts
- Approximately 15-20 results

**Validate:**
- All have payment_status = 'PARTIAL'
- Due amounts > 0 but < tax_amount

### Query 2.4: Recent Payments
```
"Show properties that paid in March 2024"
```

**Expected Result:**
- Properties with last_payment_date in March 2024
- Shows payment success
- Approximately 20-25 results

**Validate:**
- last_payment_date between 2024-03-01 and 2024-03-31

---

## 3. Analytics & Reporting Queries

These queries generate summary reports and analytics.

### Query 3.1: Ward-wise Collection Report
```
"Generate a ward-wise collection report"
```

**Expected Result:**
- Shows table with data per ward
- Columns: ward, total_properties, total_tax, total_collected, total_due, paid_count, unpaid_count
- 5 wards total (Ward 1-5)

**Validate:**
- 5 rows (one per ward)
- Shows aggregate data
- Visualized as bar chart

### Query 3.2: Zone-wise Analytics
```
"Show tax collection status by zone"
```

**Expected Result:**
- Summary by Zone A, B, C
- Shows total properties, tax, due amounts per zone
- Approximate distribution: Zone A (30), Zone B (35), Zone C (35)

**Validate:**
- 3 rows (one per zone)
- Visualized as pie or bar chart

### Query 3.3: Total Pending Tax
```
"What is the total pending tax in Zone A?"
```

**Expected Result:**
- Single aggregate value showing total due_amount in Zone A
- Should be approximately ₹150,000-200,000
- Shows calculation results

**Validate:**
- Single row result
- Only due_amount values > 0

### Query 3.4: Payment Status Summary
```
"Count properties by payment status"
```

**Expected Result:**
- 3 rows showing PAID, UNPAID, PARTIAL counts
- Approximate split: PAID (25), UNPAID (45), PARTIAL (30)
- Visualized as pie chart

**Validate:**
- Sum of counts = 100
- Three distinct statuses

---

## 4. Advanced Queries

These queries test complex filtering and analysis.

### Query 4.1: High-Value Defaults
```
"Show properties with due amount greater than 15000 rupees"
```

**Expected Result:**
- All properties with due_amount > 15000
- Approximately 15-20 results
- Sorted by due amount

**Validate:**
- All due_amounts >= 15000
- Sorted descending

### Query 4.2: Properties in Multiple Conditions
```
"Show unpaid properties in Ward 2 with due amount above 10000"
```

**Expected Result:**
- Multiple filters applied
- Results from Ward 2 with UNPAID status and high due amounts
- Approximately 3-5 properties

**Validate:**
- All have ward = 'Ward 2'
- All have payment_status = 'UNPAID'
- All have due_amount > 10000

### Query 4.3: Owner-based Query
```
"Find all properties owned by Priya"
```

**Expected Result:**
- Properties with owner names containing "Priya"
- Multiple properties across different wards
- Approximately 2-4 results

**Validate:**
- All owner_names contain 'Priya'
- May be across different zones/wards

### Query 4.4: Location-based Analysis
```
"Which properties on Elm Street are unpaid?"
```

**Expected Result:**
- Properties with address containing "Elm" and UNPAID status
- Several results from property_address column
- Shows location details

**Validate:**
- All addresses contain "Elm"
- All have UNPAID or PARTIAL status

---

## 5. Comparison & Ranking Queries

These queries compare and rank data.

### Query 5.1: Top Wards by Defaulters
```
"Which ward has the most defaulters?"
```

**Expected Result:**
- Ward information showing defaulter count
- Visualized as bar chart
- Shows Ward 1-5 with counts

**Validate:**
- Shows count per ward
- Sorted by defaulter count

### Query 5.2: Highest Tax Properties
```
"Show top 5 properties by tax amount"
```

**Expected Result:**
- 5 properties with highest tax_amount
- Amounts approximately ₹15,000-19,000
- Sorted descending

**Validate:**
- Only 5 results
- Highest tax amounts first

### Query 5.3: Collection Efficiency
```
"What percentage of properties are fully paid?"
```

**Expected Result:**
- Calculation showing paid property percentage
- Approximately 25% (25 out of 100)
- Shows as aggregate/comparison

**Validate:**
- Shows payment status distribution
- Calculates percentages

---

## 6. Edge Cases & Special Queries

These test boundary conditions.

### Query 6.1: Empty Result Set
```
"Show properties in Ward 99"
```

**Expected Result:**
- "No results found" message
- Handles gracefully without errors

**Validate:**
- Error message is user-friendly
- No crash or timeout

### Query 6.2: NULL Handling
```
"Show properties with no payment record"
```

**Expected Result:**
- Properties where last_payment_date is NULL
- Approximately 45-50 results

**Validate:**
- Handles NULL values correctly
- Shows properties without payment history

### Query 6.3: Special Characters in Names
```
"Find properties owned by Singh"
```

**Expected Result:**
- Multiple properties with "Singh" in owner name
- Handles special characters
- Approximately 8-10 results

**Validate:**
- Correct filtering despite special characters
- No SQL injection attempts succeed

---

## Expected Database Statistics

When database is properly initialized, expect:

- **Total Properties**: 100
- **Total Tax Amount**: ~₹1,500,000
- **Total Pending (Due)**: ~₹600,000
- **Fully Paid Properties**: ~25
- **Unpaid Properties**: ~45
- **Partially Paid Properties**: ~30
- **Wards**: 5 (Ward 1 through Ward 5)
- **Zones**: 3 (Zone A, B, C)

---

## Testing Checklist

Use this checklist to validate system functionality:

- [ ] Database connection successful (check health status indicator)
- [ ] Natural language query executed successfully
- [ ] Results display correctly (table or chart format)
- [ ] Pagination works for large result sets
- [ ] Charts render appropriately for aggregate data
- [ ] SQL query is visible and can be copied
- [ ] Error handling works for invalid queries
- [ ] No sensitive data is exposed in responses
- [ ] Response times are reasonable (< 2 seconds)
- [ ] Mobile responsiveness works

---

## Performance Testing

To test performance:

1. **Large Result Sets**
   ```
   "Show all properties"
   ```
   - Should return max 100 results
   - Paginated into 10 per page
   - Performance should be instant

2. **Complex Aggregation**
   ```
   "Generate complete report by ward and zone"
   ```
   - May take 1-2 seconds
   - Should handle without timeout

3. **Rapid Queries**
   - Submit 5-10 queries in succession
   - System should handle queue
   - No memory leaks

---

## Debugging Tips

If a query fails:

1. Check the generated SQL (shown at bottom of results)
2. Verify expected columns exist in schema
3. Check if data matches filter criteria
4. Try a simpler version of the query
5. Check browser console for errors
6. Verify API key is set correctly
7. Check database is running and has data

---

## Support

For issues with these test queries:
- Check SETUP_GUIDE.md for database setup
- Review database schema in init-database.sql
- Check console logs for error messages
- Verify environment variables are set

---

**Happy Testing!** These queries should fully exercise the system functionality.
