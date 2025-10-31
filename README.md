# ChronoVize — Front-end Demo

Eye-catching landing + interactive demo dashboards with heavy animations and zero backend. Great for investor demos and UX walkthroughs.

## Run locally

Requirements: Python 3.x

```powershell
python server.py
```

Open http://localhost:8085 and click Login to try the demo.

- All demo account passwords: `demo123`
- Use "Use random demo account" on the login page to jump in quickly.

## Structure (key files)

- `index.html` — Landing page with animations and QR Share
- `auth/login.html` — Demo login with random/demo account picker
- `dashboard/student.html` — Student dashboard
- `dashboard/employer.html` — Employer dashboard
- `css/style.css` — Global theme and components
- `css/animations.css` — Reveal and hover animation helpers
- `css/dashboard.css` — Dashboard layout
- `js/main.js` — Nav, smooth scroll, QR, interactions
- `js/animations.js` — Reveal-on-scroll, counters, tilt/magnetic helpers
- `js/demo-auth.js` — Demo accounts + mocked `apiRequest`
- `js/dashboard-common.js` — Shared dashboard utils
- `js/student-dashboard.js` — Student logic
- `js/employer-dashboard.js` — Employer logic
- `server.py` — Static file server on port 8085

## Notes

- Demo mode uses `sessionStorage` and mocked endpoints. Not for production use.
- QR relies on Google Charts image endpoint; for offline-only demos, replace with a local QR lib.
- Animations are tuned to be lively but performant. Adjust in `css/animations.css` and `js/animations.js`.

## Quick edit reference

- Landing copy: `index.html`
- Colors/theme: `css/style.css` (`:root` vars)
- Demo data/endpoints: `js/demo-auth.js`
- Dashboard UI: `dashboard/*.html` and `js/*-dashboard.js`

Enjoy the show! ✨