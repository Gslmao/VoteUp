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
│   │   ├── ElectionsPage.tsx   # Read-only list of ongoing backend elections
│   │   ├── SimpleDirectory.tsx # Reusable directory component for tabular entities
│   │   ├── ConstituenciesPage.tsx
│   │   ├── PartiesPage.tsx     # Read-only backend party directory
│   │   ├── CandidatesPage.tsx  # Backend candidate directory and creation form
│   │   ├── NominationsPage.tsx # Nomination status review and candidate synchronization
│   │   ├── VotersPage.tsx      # In-memory voter directory with privacy notice
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
authentication credential. On login and page reload, the portal loads backend
elections, parties, constituencies, candidates and complaints. Results and
ongoing-election turnout are loaded from their API routes. Candidate creation
calls `POST /api/candidates`; the database must have the
`create_candidate_with_assets_api` RPC deployed first. For an existing database,
apply `sql/migrations/20260816_candidate_assets_rpc.sql`; do not rerun the
fresh-install `sql/schema.sql`.

Backend-backed election, party and constituency directories are read-only.
Candidate creation is enabled, but candidate editing/deletion is not. Complaints
can be listed, but status updates and filing dates are unavailable. The
backend currently exposes only ongoing elections, so election lifecycle
management and scheduled/completed election choices are not integrated.

The voter directory now loads from an admin-authenticated endpoint, supports
registration and edits, and displays participation for the selected election
from `has_voted` only. Voter deletion is disabled because other records can
reference voters. Voter data is not stored in localStorage. Nomination review,
observer assignments and admin audit history remain local demonstration data;
their forms do not write to the backend. Party recognition metadata, complaint
filed timestamps/status updates, and an administrative audit-list endpoint are
also backend gaps.
