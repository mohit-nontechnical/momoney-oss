# Security

This is a single-user self-hosted application. Each owner is responsible for their deployment, data and backups.

- Production requires APP_PASSWORD. Use a unique password, HTTPS and reverse-proxy rate limiting. Never rely on a hidden URL or robots.txt for privacy.
- Never commit `.env` files, imported financial data, browser cookies or real screenshots. Store private imports outside the repository. Only synthetic examples belong in source control.
- Local development is unauthenticated unless APP_PASSWORD is set and binds to loopback by default. Do not expose that server to a network.
- Ingest, edit-worker and summary endpoints require their separate environment credentials. They deny access when those credentials are absent. No bank connector ships with this repository.
- Ask sends financial context to an external model provider only when enabled and requested. Keep it disabled if that is unacceptable.
- Local and Blob writes are not distributed transactions. Run a single owner instance and back up before imports or upgrades.
- Production and previews must use distinct private storage namespaces.

For vulnerabilities, use this repository's GitHub **Security → Report a vulnerability** feature. Please do not put credentials or financial records in public issues.
