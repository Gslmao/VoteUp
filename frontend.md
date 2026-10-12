src/
├── types/
│   └── portal.ts               # Shared TypeScript types (Party, Candidate, Election, Store, etc.)
├── data/
│   └── mockData.ts             # Initial seed data for parties, elections, constituencies, etc.
├── lib/
│   └── formatters.ts           # Formatters (formatDate, money, nextId)
├── components/
│   ├── ui/
│   │   ├── Icon.tsx            # SVG icon set (grid, calendar, flag, users, map, etc.)
│   │   ├── Button.tsx          # Reusable styled button with tone variants
│   │   ├── Badge.tsx           # Status tone badge
│   │   ├── Modal.tsx           # Accessible modal dialog with Esc and backdrop handling
│   │   ├── Confirm.tsx         # Confirmation action modal
│   │   ├── Toast.tsx           # Transient notification alert
│   │   ├── PageHeader.tsx      # Breadcrumbs, heading, subtitle, and primary action slot
│   │   ├── Filters.tsx         # Search input with dropdown filter slots
│   │   ├── DataTable.tsx       # Generic sortable, paginated table with row action menus
│   │   └── Detail.tsx          # Key-value inspector dialog with related item preview
│   ├── forms/
│   │   └── EntityForm.tsx      # Generic entity creation and editing form with validation
│   ├── layout/
│   │   ├── Topbar.tsx          # Fixed top header with brand mark and administrator profile
│   │   ├── Sidebar.tsx         # Collapsible desktop sidebar and responsive mobile drawer
│   │   └── AppShell.tsx        # Shell wrapping layout, notifications, and navigation
│   ├── auth/
│   │   └── Login.tsx           # Backend administrator login with credential visibility
│   ├── pages/
│   │   ├── OverviewPage.tsx    # Backend metrics, complaints and live turnout
│   │   ├── ElectionsPage.tsx   # Backend election management
│   │   ├── SimpleDirectory.tsx # Reusable directory component for tabular entities
│   │   ├── ConstituenciesPage.tsx
│   │   ├── PartiesPage.tsx     # Backend party CRUD
│   │   ├── CandidatesPage.tsx  # Backend candidate CRUD
│   │   ├── NominationsPage.tsx # Nomination status review and candidate synchronization
│   │   ├── VotersPage.tsx      # Backend voter directory with 25-row pagination
│   │   ├── ComplaintsPage.tsx  # Complaint tracking and investigation resolution
│   │   ├── ObserversPage.tsx   # Observer assignment directory
│   │   ├── ResultsPage.tsx     # Provisional backend results and leaderboard
│   │   └── AuditPage.tsx       # Administrative audit log with search and filters
│   └── portal/
│       └── PortalApp.tsx       # Root orchestrator: handles state, localStorage sync, and routing
└── app/
    ├── layout.tsx              # Root HTML layout with Inter font and portal metadata
    ├── globals.css             # Prototype design tokens, color variables, and responsive layout
    ├── page.tsx                # Default route (renders PortalApp on /overview)
    └── [page]/page.tsx         # Direct route handler (e.g. /candidates, /parties, /elections)

## Backend integration status

The admin login form calls `POST /api/admin/login`; the server sets an HTTP-only
admin cookie. The browser's `ecap-session` value is only a UI marker, not an
authentication credential. Admin startup loads backend elections, parties,
constituencies, candidates, nominations, voters, complaints, observer
assignments, audit history and turnout/results as available.

Voter CRUD, election management, candidate CRUD, nomination decisions,
complaint filing/status updates, party CRUD, constituency CRUD, and observer
assignment CRUD persist through authenticated API routes and transactional
Supabase functions. Mutations append non-PII audit entries. Voter participation
uses `has_voted` only; edits are blocked after participation, and deletion is
blocked by related records. The voter page displays 25 records per page.
Election/constituency/party reads intended for public voter flows remain
available from their existing public read routes.

For existing databases, apply `sql/migrations/20260816_candidate_assets_rpc.sql`
if not already deployed, followed by the `sql/migrations/20261013_*.sql`
admin-write and audit migrations. Apply migrations to the intended development
Supabase project, not by rerunning the fresh-install `sql/schema.sql` against a
populated database. No SQL migration has been applied as part of this frontend
work.

Remaining data-model limitations: party recognition metadata and complaint
filed timestamps do not exist in the schema. A nomination is not tied to an
election in the current table design, so the admin listing's election
association is ambiguous when a candidate has filings across multiple
elections. Audit history is limited to the entries recorded by database
functions and the vote trigger; it is not a complete database-wide audit
stream.
