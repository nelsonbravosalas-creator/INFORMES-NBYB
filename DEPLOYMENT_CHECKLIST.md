# INFORMES-NBYB Deployment Checklist

## 📋 Pre-Deployment Verification

Use this checklist to verify everything is ready before deploying INFORMES-NBYB to production.

---

## ✅ Phase 1: Local Development Setup

### Environment Variables
- [ ] `.env.example` exists with all required keys
- [ ] `.env` file created (not committed to git)
- [ ] `GEMINI_API_KEY` set (Google Cloud)
- [ ] `DATABASE_URL` set (Neon PostgreSQL)
- [ ] `JWT_SECRET` set (random 32+ char string)
- [ ] `NODE_ENV=production` for builds

### Dependencies
- [ ] `npm install` completes without errors
- [ ] No security vulnerabilities: `npm audit`
- [ ] Package versions compatible with Node.js 22.x
- [ ] React 19, TypeScript 5.8, Tailwind 4.1

### Build & Test
- [ ] `npm run lint` passes (no errors or warnings)
- [ ] `npm run build` completes successfully
- [ ] Build output in `dist/` directory
- [ ] `npm run preview` serves app correctly
- [ ] No console errors in DevTools

### Local Features
- [ ] Service Worker registers (DevTools → Application)
- [ ] LocalForage working (DevTools → Application → Storage)
- [ ] Login component displays correctly
- [ ] Can create service orders offline
- [ ] Can take photos and add descriptions
- [ ] PWA install prompt appears (may need HTTPS)

---

## ✅ Phase 2: GitHub Repository

### Repository Setup
- [ ] Repository created: `INFORMES-NBYB`
- [ ] Remote origin points to GitHub
- [ ] Commit history clean (no secrets in commits)
- [ ] `.gitignore` excludes sensitive files:
  - `.env`
  - `node_modules/`
  - `dist/`
  - `.DS_Store`

### Files Committed
- [ ] All source code (`src/`, `api/`, `public/`)
- [ ] Configuration files (`vite.config.ts`, `tsconfig.json`)
- [ ] Database schema (`db/schema-multitenant.sql`)
- [ ] Documentation (`.md` files)
- [ ] Package files (`package.json`, `package-lock.json`)
- [ ] `.nvmrc` with `22` for Node version

### Branch Strategy
- [ ] Main branch is default
- [ ] Feature branches merged with PR reviews
- [ ] Deployments only from main branch
- [ ] Tags created for version releases

---

## ✅ Phase 3: Database Setup (Neon)

### Neon Project Creation
- [ ] Neon account created at https://neon.tech
- [ ] Project created with name
- [ ] PostgreSQL 15+ selected
- [ ] Autoscaling enabled (optional, recommended)

### Database Initialization
- [ ] Connection string obtained (DATABASE_URL)
- [ ] Connection tested: `psql $DATABASE_URL \dt`
- [ ] UUID extension installed
- [ ] Schema created: `psql $DATABASE_URL < db/schema-multitenant.sql`
- [ ] Seed data loaded: `psql $DATABASE_URL < db/seed.sql`

### Schema Verification
```bash
psql $DATABASE_URL
```
Tables should exist:
- [ ] `tenants`
- [ ] `users`
- [ ] `clients`
- [ ] `sub_branches`
- [ ] `hvac_reports`
- [ ] `service_orders`
- [ ] `admin_settings`
- [ ] `audit_log`

Views should exist:
- [ ] `v_hvac_status_summary`
- [ ] `v_clients_with_subs`
- [ ] `v_technician_reports`

Triggers should exist:
- [ ] `update_*_timestamp` (for each table with updated_at)

Row-Level Security:
- [ ] RLS enabled on all tables
- [ ] Policies in place for tenant isolation

---

## ✅ Phase 4: Google Cloud Setup (Gemini API)

### API Key Generation
- [ ] Google Cloud project created
- [ ] Gemini API enabled in project
- [ ] API key generated (Restricted Key)
- [ ] API key restricted to:
  - Application name: INFORMES-NBYB
  - API: Generative Language API
  - IP restrictions (optional, recommended)

### Testing
- [ ] API key works locally: `npm run dev`
- [ ] OCR endpoint `/api/ocr` responds
- [ ] Gemini model: `gemini-3.5-flash` selected
- [ ] Rate limits acceptable for usage

### Security
- [ ] API key never committed to git
- [ ] Only stored in `.env` and Vercel secrets
- [ ] Rotation strategy planned

---

## ✅ Phase 5: Vercel Deployment

### Vercel Account & Project
- [ ] Vercel account created (https://vercel.com)
- [ ] GitHub connected to Vercel
- [ ] INFORMES-NBYB repository selected
- [ ] Project created and linked

### Build Configuration
- [ ] Framework: Vite selected
- [ ] Build Command: `npm run build:vercel`
- [ ] Output Directory: `dist`
- [ ] Node.js version: 22.x
- [ ] Install Command: `npm install`
- [ ] Environment variables set:
  - [ ] `GEMINI_API_KEY`
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `NODE_ENV=production`

### API Routes Configuration
- [ ] Functions configured with 1GB memory
- [ ] 30-second timeout for OCR endpoint
- [ ] Rewrites configured for API routes
- [ ] SPA fallback to index.html enabled

### First Deployment
- [ ] `git push` triggers build
- [ ] Build completes (check Vercel logs)
- [ ] Deployment successful
- [ ] URL working: https://*.vercel.app

### Verification
- [ ] App loads correctly
- [ ] Service Worker registers
- [ ] Manifest.json accessible
- [ ] PWA can be installed
- [ ] API endpoints respond
- [ ] OCR endpoint works with real image
- [ ] Database queries return data

---

## ✅ Phase 6: Custom Domain Setup

### Domain Registration
- [ ] Domain purchased (or transferred to registrar)
- [ ] Domain registered in Vercel
- [ ] Nameservers updated (if required)

### DNS Configuration
- [ ] CNAME record pointing to Vercel:
  ```
  informes.example.com CNAME cname.vercel.com
  ```
- [ ] DNS propagation checked (5-48 hours)
- [ ] DNS settings verified with `nslookup`

### SSL Certificate
- [ ] Let's Encrypt certificate auto-provisioned
- [ ] HTTPS working: https://informes.example.com
- [ ] Certificate auto-renews (automatic with Vercel)
- [ ] Mixed content warnings resolved

### Verification
- [ ] Domain accessible in browser
- [ ] Redirect www to non-www (or vice versa)
- [ ] HTTPS enforced (no http access)
- [ ] Certificate valid and trusted

---

## ✅ Phase 7: Security Hardening

### Secrets Management
- [ ] `.env` file in `.gitignore`
- [ ] No secrets visible in git history
- [ ] GitHub secrets not used (use Vercel instead)
- [ ] Environment variables marked as sensitive in Vercel

### CORS & Headers
- [ ] CORS headers configured for API routes
- [ ] CSP headers set (Content-Security-Policy)
- [ ] X-Frame-Options header set
- [ ] X-Content-Type-Options: nosniff

### Authentication
- [ ] Login page requires HTTPS
- [ ] JWT tokens have short expiration (15 min)
- [ ] Refresh tokens implemented (if needed)
- [ ] Session logout clears all auth data

### Database Security
- [ ] Row-Level Security enabled
- [ ] All connections use `$DATABASE_URL`
- [ ] Never use hardcoded credentials
- [ ] Audit log functional and monitoring queries

### Service Worker
- [ ] Only caches GET requests
- [ ] Never caches `/api/*` paths
- [ ] Validates responses before caching
- [ ] Cache version incremented

---

## ✅ Phase 8: Performance Optimization

### Build Size
- [ ] `npm run build` shows bundle size
- [ ] Gzip size < 1MB target
- [ ] No unused dependencies
- [ ] Tree-shaking working correctly

### Caching Strategy
- [ ] Static assets cached (1 year expiration)
- [ ] API responses not cached (no-cache)
- [ ] Service Worker caching working
- [ ] Browser DevTools shows cache hits

### CDN & Edge
- [ ] Vercel's global CDN enabled
- [ ] Assets served from edge location near user
- [ ] Cache invalidation working on new builds

### Performance Metrics
- [ ] Lighthouse score 90+
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 3s
- [ ] Cumulative Layout Shift < 0.1

---

## ✅ Phase 9: Testing & QA

### Manual Testing Checklist
- [ ] Login with valid credentials works
- [ ] Invalid login shows error message
- [ ] Create service order offline
- [ ] Add photos to service order
- [ ] Digital signature captures correctly
- [ ] Export to PDF generates valid file
- [ ] Export to HTML is standalone
- [ ] Export to JSON is valid structure
- [ ] View previously created order
- [ ] Edit existing order
- [ ] Delete order (confirmation prompt)
- [ ] Admin settings save correctly
- [ ] Client management works
- [ ] Sub-branch creation and editing

### Offline Testing
- [ ] Enable airplane mode
- [ ] Create report offline
- [ ] App still functional
- [ ] Photos display correctly
- [ ] Disable airplane mode
- [ ] Auto-sync triggers
- [ ] Report marked as synced
- [ ] Service Worker loads cached app

### Cross-Browser Testing
- [ ] Chrome (latest) ✅
- [ ] Firefox (latest) ✅
- [ ] Samsung Internet ✅
- [ ] Microsoft Edge ✅
- [ ] Safari ✅

### Mobile Testing
- [ ] Responsive on small phones (4.7")
- [ ] Responsive on tablets (10"+)
- [ ] Touch events working
- [ ] Camera access functions
- [ ] App installs from home screen

### API Testing
- [ ] GET /api/reports returns data
- [ ] POST /api/reports creates record
- [ ] POST /api/ocr recognizes equipment
- [ ] Error handling for network errors
- [ ] Rate limiting (if configured)

---

## ✅ Phase 10: Monitoring & Analytics

### Error Tracking
- [ ] Sentry or similar set up (optional)
- [ ] Error logs captured
- [ ] Stack traces stored
- [ ] Alerts configured for critical errors

### Performance Monitoring
- [ ] Vercel Analytics enabled
- [ ] Performance metrics tracked
- [ ] Core Web Vitals monitored
- [ ] Slow queries identified

### Logging
- [ ] Server logs accessible
- [ ] Client errors logged
- [ ] API response times monitored
- [ ] Audit log table populated

### Backup & Recovery
- [ ] Database backups scheduled
- [ ] Backups tested (restore procedure)
- [ ] Backup retention policy (30+ days)
- [ ] Disaster recovery plan documented

---

## ✅ Phase 11: Documentation

### User Documentation
- [ ] [ANDROID_INSTALLATION_GUIDE.md](./ANDROID_INSTALLATION_GUIDE.md) ✅
- [ ] [PWA_OFFLINE_WORKFLOW.md](./PWA_OFFLINE_WORKFLOW.md) ✅
- [ ] User manual with screenshots
- [ ] FAQ for common issues
- [ ] Support contact information

### Technical Documentation
- [ ] [NEON_DB_MAPPING.md](./NEON_DB_MAPPING.md) ✅
- [ ] API documentation
- [ ] Architecture decision records (ADRs)
- [ ] Deployment guide (this checklist)

### Code Documentation
- [ ] JSDoc comments on public APIs
- [ ] README in each component directory
- [ ] Type definitions documented
- [ ] Examples for common tasks

---

## ✅ Phase 12: Launch Preparation

### Soft Launch
- [ ] Share private URL with limited users
- [ ] Test real-world usage (field technicians)
- [ ] Collect feedback
- [ ] Fix critical issues
- [ ] Monitor logs for errors

### Launch Day
- [ ] Vercel dashboard monitored
- [ ] Support team on standby
- [ ] Database backups confirmed
- [ ] Emergency rollback plan ready
- [ ] DNS cutover planned (if migrating)

### Post-Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Respond to user feedback
- [ ] Plan improvements for v1.1

---

## 📝 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | _____ | _____ | _____ |
| QA Lead | _____ | _____ | _____ |
| DevOps | _____ | _____ | _____ |
| Product Owner | _____ | _____ | _____ |

---

## 🆘 Troubleshooting During Deployment

### Build fails on Vercel
- Check: Node.js version 22.x
- Check: `.nvmrc` file
- Check: `package.json` engines field
- Check: All dependencies installed locally first

### API routes 404
- Check: `/api/*` routes exist
- Check: Rewrites configured in `vercel.json`
- Check: Function timeout set to 30s
- Check: Memory set to 1GB

### Service Worker not registering
- Check: HTTPS enabled
- Check: `manifest.json` linked in `index.html`
- Check: `service-worker.js` in `public/`
- Check: Correct scope in registration

### Database connection fails
- Check: `DATABASE_URL` correct
- Check: Neon IP allowlist (if enabled)
- Check: Credentials have correct permissions
- Check: Connection string format: `postgresql://`

### PWA won't install
- Check: HTTPS or localhost
- Check: `manifest.json` valid JSON
- Check: Icons exist at referenced paths
- Check: `start_url` correct
- Check: Service Worker registered

---

## 🎯 Success Criteria

✅ **Pre-Launch Readiness:**
- All checkboxes above marked ✅
- No critical bugs in QA
- Performance metrics acceptable
- Security review passed
- Documentation complete
- Team trained and ready

✅ **Post-Launch:**
- Zero critical bugs in first 24 hours
- <1% error rate
- >95 Lighthouse score
- Database responding <200ms
- Users successfully installing on Android

---

## 📞 Support Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Technical Lead | | | |
| DevOps Engineer | | | |
| Product Manager | | | |
| Support Team | | | |

---

**Deployment Version**: 1.0  
**Last Updated**: 2026-06-06  
**Status**: Ready for Production

---

## Next Steps After Launch

- [ ] Schedule v1.1 planning meeting
- [ ] Create roadmap for improvements
- [ ] Set up user feedback collection
- [ ] Plan security audit
- [ ] Document lessons learned
