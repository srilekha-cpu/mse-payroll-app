# MSE Tech Payroll System

A small web app for running payroll for 100+ workers, with real role separation:
- **Owner** — records advances given, maintains the employee master, edits everything.
- **Accountant** — enters worked days, OT hours, and any allowances each month, either
  one employee at a time or by uploading an Excel sheet for the whole month at once.
  They cannot see or touch the Advance Ledger. Basic pay, OT pay, Gross, and Net Pay
  are always computed **server-side** — editing the page in the browser can't change
  how those are calculated. The **Advance Deducted** figure is pre-filled with a
  suggested amount but the accountant *can* edit it — whatever number they save is
  exactly what reduces that employee's balance on the Advance Ledger (enter 0 to skip
  a month's recovery, enter less to partially recover, etc.). The server always checks
  the edited amount can't exceed what's actually still outstanding, so the ledger can
  never go negative or get double-counted.

Architecture, matched to what you said you'd deploy with:

```
Browser (Netlify/GitHub Pages static site)
      │  fetch() JSON calls
      ▼
Google Apps Script Web App  (backend/Code.gs)
      │  reads/writes
      ▼
Google Sheet  (created automatically — this is your database)
```

No server to pay for or maintain. The Google Sheet is a normal spreadsheet you can
always open directly to inspect or back up the raw data.

---

## Part 1 — Backend (Google Apps Script + Google Sheet)

1. Go to [sheets.google.com](https://sheets.google.com) and create a **new blank
   spreadsheet**. Name it e.g. "MSE Tech Payroll DB".
2. In that sheet: **Extensions → Apps Script**.
3. Delete anything in the default `Code.gs` file, then paste in the entire contents
   of `backend/Code.gs` from this repo.
4. Click the **+** next to "Files" → **Add a script/JSON file** → choose the manifest
   type and name it `appsscript` (a file `appsscript.json` will be created) — or open
   the existing `appsscript.json` (Project Settings → check "Show appsscript.json
   manifest file in editor") and replace its contents with `backend/appsscript.json`
   from this repo.
5. In the function dropdown at the top (next to Run/Debug), select
   **`setupSpreadsheet`**, then click **Run**.
   - The first time, Google will ask you to authorize the script — click through
     "Advanced" → "Go to [project name] (unsafe)" if it warns you (this is normal for
     scripts you write yourself). This is your own script talking to your own sheet.
   - This creates all the tabs (Users, Employees, AdvanceLedger, PayrollData,
     Sessions, AuditLog) and seeds them with your actual May–July 2026 payroll data,
     so you start with real history already in place, not an empty system.
6. **Deploy it as a Web App**:
   - Click **Deploy → New deployment**.
   - Type: **Web app**.
   - Execute as: **Me**.
   - Who has access: **Anyone**.
   - Click **Deploy**, authorize again if asked.
   - Copy the **Web app URL** it gives you (ends in `/exec`). You'll need this next.
7. Default logins (created by `setupSpreadsheet`) — **change both immediately**
   after your first login, using the "Change Password" screen in the app:
   - Owner: `owner` / `owner123`
   - Accountant: `accountant` / `acc123`

**Correcting historical advance amounts:** the Advance Ledger was seeded with my
best estimate of what each employee's advance was, reconstructed from the earliest
month it was deducted in your original files. For 9 employees whose advance was
still being deducted every month as of July, I only recorded what was observed —
the true original amount may be higher. Open the Google Sheet's `AdvanceLedger` tab
directly (or use the in-app Advance Ledger screen) and correct these amounts, then
run **Admin → Recalculate All Payroll** in the app so the correction cascades
through every month correctly.

---

## Part 2 — Frontend (Netlify or GitHub Pages)

1. In `frontend/app.js`, replace the placeholder at the top:
   ```js
   const API_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
   with the Web app URL you copied in Part 1, step 6.

2. Push this whole folder to a **GitHub repo**.

3. **Netlify:**
   - New site from Git → pick the repo.
   - Build command: *(leave blank)* — there's no build step, it's plain HTML/CSS/JS.
   - Publish directory: `frontend`
   - Deploy.

   Or **GitHub Pages:**
   - Repo Settings → Pages → Deploy from a branch → root (or `/frontend` if GitHub
     Pages lets you pick a subfolder; otherwise move the contents of `frontend/` to
     the repo root, or use a GitHub Action to publish that folder).

4. Open the deployed site, log in, and change both passwords right away.

---

## How the important bits work

**Advance deduction (suggested, editable, always validated):**
On the Owner's "Advance Ledger" screen, you record `{employee, date, amount}`.
The accountant never sees this tab. Whenever they open a Payroll Entry for an
employee/month, the backend calculates a *suggestion*:
1. Sums everything ever given to that employee (from the Ledger) up to that month.
2. Subtracts everything already recovered from them in **earlier** months
   (from Payroll Data).
3. Suggests the smaller of the remaining balance or their "Standard Monthly
   Instalment" (optional cap you can set per employee in Employee Master) —
   or the full remaining balance if no cap is set.
This shows up pre-filled in the Advance Deducted field (`suggestedAdvanceDue_()`
in `Code.gs`). The accountant can type over it — enter 0 to skip recovering
anything that month, enter a smaller number to partially recover, etc. Whichever
number is actually saved is written to that row and is exactly what counts as
"recovered" everywhere else (Advance Balance screen, next month's suggestion).
The one thing the server enforces (`computePayrollRow_()`) is that the amount can
never exceed what's genuinely still outstanding — so the balance can't go negative
or get double-counted, but the accountant has real flexibility for special cases
(hardship months, part-payments, clearing early).

**Allowances (any type, per employee, per month):**
Instead of one fixed "other allowance" number, each Payroll Entry has an
open-ended list of `{label, amount}` lines — click "+ Add Allowance" and name it
whatever you use (Bus Fare, Transport, Film Allowance, Project Allowance, Festival
Bonus, anything). They're summed into Gross automatically.

**Bulk upload via Excel:**
On the Payroll Entry screen, "Download Template" generates an `.xlsx` pre-filled
with every employee's ID/name and blank columns for Worked Days, OT Hours, Exit
flags, Advance Deducted (leave blank to use the suggested amount), Other Deduction,
and a few example allowance columns (Bus Fare, Transport, Film Allowance, Project
Allowance). **You can add your own extra columns for any other allowance type** —
any column that isn't one of the recognized fields is automatically treated as an
allowance line named after its header. Fill it in, upload it back, review the
preview table, then "Confirm & Save All" — this calls a single bulk endpoint
(`savePayrollBulk_`) that validates and saves every row in one batch (each row's
advance override is still checked against that employee's real outstanding balance,
so one bad row shows an error without blocking the rest of the batch).

**Exit / double-OT handling:**
Normally Basic is paid for the current month's worked days, and OT is paid for
the *previous* month's hours. When someone exits, mark "Exit This Month = Y" and
"Also Pay Current-Month OT? = Y" on their last entry, and fill in their current
month's OT hours in the extra field. The system adds that on top of the normal
previous-month OT, and the entry shows up automatically in the Exit / Final
Settlement Log for your records.

**Monthly spike detection:**
For each employee, each month-to-month pay change is compared against their
worked-days change. A swing over 30% in Net Pay with Worked Days staying roughly
flat is flagged "TRUE SPIKE" (worth investigating); a swing that lines up with a
big change in worked days is flagged as leave/attendance-driven instead, so you're
not chasing normal leave patterns.

**Department Summary:**
Fill in the `Department` column for each employee on the Employee Master screen —
the summary updates automatically, no separate step needed.

---

## Limitations to know about

- **Password hashing** uses SHA-256 (via Apps Script's built-in `Utilities`) — reasonable
  for a small internal tool, but not the same grade as a production HR system with
  salted bcrypt and rate-limiting. Don't reuse these passwords elsewhere.
- **Sessions** last 12 hours (edit `SESSION_TTL_HOURS` in `Code.gs` to change).
- Google Apps Script Web Apps have API quotas (generous for 100+ employees/month,
  but very heavy concurrent use could hit limits — unlikely at this scale).
- If you ever edit a **past** month's entry after later months were already saved,
  run **Admin → Recalculate All Payroll** so advance recovery re-cascades correctly.
  This also **preserves** any manually-edited advance amounts from before — it only
  refreshes Basic/OT/Gross/Net and re-validates each saved advance against the
  (possibly now-different) outstanding balance.
- The Excel upload matches columns by name, ignoring case/spaces/punctuation
  (`"Bus Fare"`, `bus_fare`, `BUSFARE` are all treated the same). Any column that
  isn't `EmpID`, `Name`, `WorkedDays`, `OTHoursPrev`, `ExitFlag`, `AlsoPayCurrentOT`,
  `OTHoursCurrentExit`, `AdvanceDeducted`, `OtherDeductionManual`, or `Notes` becomes
  an allowance line — so don't accidentally name a real allowance column something
  like "Notes".
- If the owner and accountant save the same employee/month at almost the same
  moment, the second save simply overwrites the first (no merge/lock) — normal for
  a small-team tool at this scale, just worth knowing.
