# Deployment Guide - Property Tax Assistant

This guide explains how to deploy the Property Tax Assistant to production environments.

---

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database initialized with production data
- [ ] API key secured and set
- [ ] Code tested locally
- [ ] Database backups created
- [ ] Security review completed

---

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the platform made by the creators of Next.js and provides seamless deployment.

#### Steps:

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/property-tax-assistant.git
git push -u origin main
```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Select the project folder

3. **Configure Environment**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.local`:
     ```
     DB_HOST=your-mysql-host
     DB_PORT=3306
     DB_USER=your-username
     DB_PASSWORD=your-password
     DB_NAME=property_tax_db
     GOOGLE_GENERATIVE_AI_API_KEY=your-key
     ```

4. **Deploy**
   - Click "Deploy"
   - Vercel automatically builds and deploys
   - Visit your live URL

#### For Remote MySQL Database:

If using Vercel with external MySQL (recommended):

1. **Setup MySQL Hosting** (PlanetScale, AWS RDS, or your own)
2. **Update DB_HOST** to remote server address
3. **Ensure Security Groups** allow Vercel IP addresses
4. **Test Connection** before deploying

---

### Option 2: Self-Hosted (Linux/Docker)

Deploy on your own server or cloud instance.

#### Prerequisites:
- Linux server (Ubuntu 20.04+)
- Node.js installed
- MySQL installed
- Nginx/Apache for reverse proxy

#### Steps:

1. **Clone Repository**
```bash
git clone https://github.com/your-username/property-tax-assistant.git
cd property-tax-assistant
```

2. **Install Dependencies**
```bash
npm install
```

3. **Build Application**
```bash
npm run build
```

4. **Setup Environment**
```bash
cp .env.local.example .env.local
nano .env.local  # Edit with your values
```

5. **Setup Systemd Service** (for auto-restart)

Create `/etc/systemd/system/property-tax.service`:
```ini
[Unit]
Description=Property Tax Assistant
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/property-tax-assistant
ExecStart=/usr/bin/node /var/www/property-tax-assistant/.next/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable property-tax
sudo systemctl start property-tax
```

6. **Setup Nginx Reverse Proxy**

Create `/etc/nginx/sites-available/property-tax`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/property-tax /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **Setup SSL** (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 3: Docker Deployment

Deploy using Docker containers for isolation and scalability.

#### Dockerfile

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

#### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-database.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      GOOGLE_GENERATIVE_AI_API_KEY: ${GOOGLE_GENERATIVE_AI_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      mysql:
        condition: service_healthy
    restart: always

volumes:
  mysql_data:
```

Deploy:
```bash
docker-compose up -d
```

---

## Database Migration

### Migrating Production Data

1. **Backup Current Database**
```bash
mysqldump -u root -p property_tax_db > backup.sql
```

2. **Export Data**
```bash
# Export properties table
mysql property_tax_db -e "SELECT * FROM properties" > properties_data.csv
```

3. **Load to New Environment**
```bash
mysql -h new-host -u user -p new_db < backup.sql
```

---

## Performance Optimization

### Database Optimization

1. **Add Indexes** (already included)
```sql
CREATE INDEX idx_ward ON properties(ward);
CREATE INDEX idx_zone ON properties(zone);
CREATE INDEX idx_payment_status ON properties(payment_status);
CREATE INDEX idx_due_amount ON properties(due_amount);
```

2. **Regular Maintenance**
```bash
# Weekly optimization
mysql property_tax_db -e "OPTIMIZE TABLE properties;"

# Check table status
mysql property_tax_db -e "SHOW TABLE STATUS;"
```

3. **Query Caching**
```sql
SET GLOBAL query_cache_size = 268435456;  # 256MB
SET GLOBAL query_cache_type = 1;
```

### API Optimization

1. **Enable Compression**
```javascript
// next.config.mjs
const nextConfig = {
  compress: true,
};
```

2. **Image Optimization**
```javascript
// next.config.mjs
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};
```

---

## Monitoring & Maintenance

### Health Monitoring

Set up monitoring for:
- API endpoint response times
- Database connection pool
- Error rates
- Query performance

Use services like:
- **Sentry** for error tracking
- **DataDog** for system monitoring
- **New Relic** for APM

### Log Management

Configure logging:
```javascript
// lib/logger.ts
export function log(level, message, data) {
  console.log(`[${level}] ${message}`, data);
  // Send to centralized logging service
}
```

### Backup Strategy

1. **Automated Daily Backups**
```bash
# /usr/local/bin/backup-db.sh
#!/bin/bash
mysqldump -u root -p$DB_PASSWORD property_tax_db | gzip > /backups/backup-$(date +%Y%m%d).sql.gz
find /backups -name "backup-*.sql.gz" -mtime +30 -delete
```

2. **Schedule with Cron**
```bash
0 2 * * * /usr/local/bin/backup-db.sh
```

---

## Security Hardening

### Production Checklist

- [ ] HTTPS/SSL enabled
- [ ] Environment variables not in code
- [ ] Database credentials secured
- [ ] API keys rotated regularly
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation strict
- [ ] SQL injection prevention active

### Security Headers

Add to `next.config.mjs`:
```javascript
const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];

export default {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

---

## Scaling Strategy

### Horizontal Scaling

For high traffic:

1. **Multiple App Instances**
   - Deploy multiple instances of the app
   - Use load balancer (Nginx, HAProxy)
   - Share database connection

2. **Database Scaling**
   - Use read replicas for SELECT queries
   - Implement query caching
   - Consider sharding for very large datasets

3. **CDN for Static Assets**
   - Cloudflare for image caching
   - Vercel built-in CDN

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Use caching layers (Redis)

---

## Disaster Recovery

### Recovery Plan

1. **Database Failure**
   - Restore from latest backup
   - Failover to replica
   - Verify data integrity

2. **Application Failure**
   - Automated restart via systemd/Docker
   - Health check endpoints
   - Alert on failures

3. **Data Loss**
   - Daily automated backups
   - Off-site backup storage
   - Point-in-time recovery capability

---

## Post-Deployment

### Monitoring

```bash
# Check application status
systemctl status property-tax

# View logs
journalctl -u property-tax -f

# Check database
mysql property_tax_db -e "SELECT COUNT(*) FROM properties;"
```

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://your-domain.com/api/health

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/
```

---

## Rollback Procedure

If deployment fails:

1. **Rollback Code**
```bash
git revert <commit-hash>
git push origin main
# Vercel auto-deploys or manually restart
```

2. **Rollback Database**
```bash
# Restore from backup
mysql -u root -p property_tax_db < backup.sql
```

3. **Verify**
- Check application loads
- Test sample queries
- Verify data integrity

---

## Cost Optimization

### Vercel Deployment
- Free tier: up to 100GB bandwidth/month
- $20/month Pro: includes more features
- Pay-as-you-go beyond limits

### Self-Hosted
- VPS: $5-20/month (DigitalOcean, Linode)
- MySQL hosting: Free on-server or $10-50/month managed

### Recommendations
- Start with Vercel for simplicity
- Move to self-hosted at scale
- Monitor costs monthly

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **MySQL Optimization**: https://dev.mysql.com/doc/refman/8.0/en/optimization.html
- **Docker**: https://docs.docker.com/

---

**Ready for production!** Deploy with confidence using this guide.
