# Election Voting Backend

Next.js App Router API using PostgreSQL (`pg`) and the simplified 15-table v2 schema.

## Quick Start

1. Set `DATABASE_URL` in `.env` for a disposable development database.
2. Follow the ordered database reset and setup in [INTEGRATION.md](INTEGRATION.md).
3. Install packages and run the app:

```sh
pnpm install
pnpm dev
```

See [TESTING.md](TESTING.md) for TypeScript, connection, turnout, duplicate-vote, and concurrent-vote checks.

The vote route reads voter identity from an HTTP-only mock session cookie set on voter registration. Vote integrity and turnout aggregation remain in PostgreSQL.