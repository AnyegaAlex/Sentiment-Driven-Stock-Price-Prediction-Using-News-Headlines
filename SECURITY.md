# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

1. **Email**: anyega.alex.kamau@gmail.com
2. **Subject**: `[Security] Brief description of the vulnerability`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any possible fixes (optional)

### Response Timeline

| Step | Timeframe |
|------|-----------|
| Initial acknowledgment | Within 24 hours |
| Assessment and triage | Within 72 hours |
| Fix development | 1-2 weeks (depending on severity) |
| Public disclosure | After patch release |

### What to Expect

- You will receive a confirmation of receipt
- You will be updated on the progress
- You will be credited for responsible disclosure (if desired)

---

## Security Best Practices

### For Users

| Practice | Description |
|----------|-------------|
| **API Key Security** | Never share your API key publicly |
| **Environment Variables** | Use environment variables for all secrets |
| **Regular Updates** | Keep dependencies updated |
| **Monitor Usage** | Check for unusual activity regularly |
| **Revoke Compromised Keys** | Contact admin immediately |

### For Developers

| Practice | Description |
|----------|-------------|
| **Secrets** | Never commit secrets to version control |
| **Dependencies** | Regularly audit dependencies |
| **Input Validation** | Always validate user input |
| **SQL Injection** | Use Django ORM (safe by default) |
| **XSS Prevention** | Use Django's template escaping |
| **Rate Limiting** | Implement rate limiting for endpoints |

---

## Known Issues

| Issue | Severity | Status | Mitigation |
|-------|----------|--------|------------|
| API key in URL query params | Low | Monitoring | Warned in documentation |
| Yahoo Finance rate limiting | Low | Accepted | Fallback to cache |

---

## Security Features

| Feature | Status | Description |
|---------|--------|-------------|
| API Key Authentication | ✅ Implemented | All endpoints require X-API-Key header |
| Rate Limiting | ✅ Implemented | 200 requests/minute per key |
| CORS | ✅ Implemented | Locked to frontend domain |
| HTTPS | ✅ Implemented | Enforced on Render |
| Environment Variables | ✅ Implemented | All secrets in env vars |
| Input Validation | ✅ Implemented | Django REST Framework serializers |
| SQL Injection Protection | ✅ Implemented | Django ORM |

---

## Reporting Best Practices

### Do

- Report vulnerabilities promptly
- Provide clear, actionable information
- Allow time for fixes before disclosure
- Use the designated reporting channel

### Don't

- Disclose vulnerabilities publicly until fixed
- Exploit vulnerabilities for any reason
- Share sensitive information in public channels

---

## Security Contact

- **Email**: anyega.alex.kamau@gmail.com
- **Response Time**: Within 24 hours

---

## Acknowledgements

We thank the following individuals for responsible disclosure:

- *None yet – be the first!*

---

**Last Updated:** July 14, 2026