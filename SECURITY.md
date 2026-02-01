# 🔒 CERTIFY - Security Guide

## ⚠️ CRITICAL: Protecting Sensitive Information

Your CERTIFY project contains **highly sensitive credentials** that must NEVER be committed to Git:

### 🚨 Sensitive Data to Protect

1. **Database Credentials** (`backend/.env`)
   - PostgreSQL connection string with username/password
   - Database host and credentials

2. **JWT Secret** (`backend/.env`)
   - Used for authentication token signing
   - If exposed, attackers can forge admin tokens

3. **Private Keys** (`contracts/.env`)
   - Blockchain wallet private keys
   - If exposed, attackers can steal your funds

4. **API Keys** (if added later)
   - Third-party service credentials
   - Email service keys, etc.

---

## ✅ Security Checklist

### Before Committing to Git

- [ ] Verify `.env` files are in `.gitignore`
- [ ] Check `.env.example` files have NO real credentials
- [ ] Run `git status` to ensure no `.env` files are staged
- [ ] Review all files before `git add`
- [ ] Use `git diff --cached` before committing

### Setting Up a New Environment

```bash
# 1. Copy example files
cp backend/.env.example backend/.env
cp contracts/.env.example contracts/.env

# 2. Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 3. Fill in your actual credentials in .env files
# 4. NEVER commit .env files!
```

---

## 🛡️ What's Protected

### `.gitignore` Excludes:
- ✅ `.env` files (all locations)
- ✅ `node_modules/`
- ✅ Build artifacts
- ✅ Logs and temporary files
- ✅ IDE configurations
- ✅ Certificate PDFs

### Safe to Commit:
- ✅ `.env.example` files (with placeholders only)
- ✅ Source code
- ✅ Documentation
- ✅ Configuration templates

---

## 🔍 How to Check for Leaks

### Before First Commit
```bash
# Check what will be committed
git status

# View staged changes
git diff --cached

# Search for potential secrets
git grep -i "password\|secret\|private"
```

### If You Accidentally Committed Secrets

**⚠️ CRITICAL: If you've already pushed secrets to GitHub:**

1. **Immediately rotate ALL credentials:**
   - Change database password
   - Generate new JWT secret
   - Create new wallet (transfer funds first!)

2. **Remove from Git history:**
   ```bash
   # Use git-filter-repo or BFG Repo-Cleaner
   # This is complex - consider creating a new repo
   ```

3. **Force push (if repo is private and you're the only user):**
   ```bash
   git push --force
   ```

4. **For public repos:** Consider the credentials permanently compromised

---

## 📋 Environment Variables Reference

### Backend `.env`
```bash
DATABASE_URL=postgresql://...          # Database connection
JWT_SECRET=...                         # Auth token secret
RPC_URL=https://sepolia.base.org      # Blockchain RPC
CONTRACT_WALLET_REGISTRY=0x...        # Contract address (public)
CONTRACT_CERT_REGISTRY=0x...          # Contract address (public)
```

### Contracts `.env`
```bash
RPC_URL=https://sepolia.base.org      # Blockchain RPC
DEPLOYER_PRIVATE_KEY=0x...            # ⚠️ NEVER SHARE!
```

---

## 🎯 Best Practices

### 1. Use Environment-Specific Files
```bash
.env.development    # Local development
.env.staging        # Staging environment
.env.production     # Production (use secrets manager)
```

### 2. Use Secrets Managers (Production)
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Google Secret Manager**

### 3. Rotate Credentials Regularly
- Change JWT secret every 90 days
- Rotate database passwords quarterly
- Use different credentials per environment

### 4. Limit Access
- Only give credentials to team members who need them
- Use separate credentials for each developer
- Audit access logs regularly

---

## 🚀 Deployment Security

### For Production Deployment:

1. **Never use `.env` files in production**
   - Use platform environment variables (Vercel, Heroku, etc.)
   - Or use a secrets manager

2. **Set environment variables via platform:**
   ```bash
   # Example: Vercel
   vercel env add DATABASE_URL production
   
   # Example: Heroku
   heroku config:set DATABASE_URL="postgresql://..."
   ```

3. **Enable additional security:**
   - Use SSL/TLS for database connections
   - Enable database IP whitelisting
   - Use VPC/private networks
   - Enable audit logging

---

## 📞 If Credentials Are Compromised

### Immediate Actions:

1. **Revoke/Change ALL credentials immediately**
2. **Check access logs for unauthorized access**
3. **Notify your team**
4. **Review recent transactions (blockchain)**
5. **Update all environments with new credentials**
6. **Document the incident**

### Prevention:
- Use `.env.example` with placeholders only
- Never screenshot or share `.env` files
- Use password managers for team sharing
- Enable 2FA on all services
- Regular security audits

---

## ✅ Current Status

Your project is now configured with:
- ✅ Secure `.env.example` files (placeholders only)
- ✅ Enhanced `.gitignore` (excludes all sensitive files)
- ✅ Security warnings in example files
- ✅ Setup instructions for new developers

**Remember:** Security is everyone's responsibility! 🔒
