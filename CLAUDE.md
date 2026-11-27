# CLAUDE.md - read this first, in every session

## About us
- We are a team of 4-5 people from Mahanadi Coalfields Limited (MCL) at an
  IIM Sambalpur MDP. We are NOT programmers.
- Explain everything in plain English, in short sentences. If you must use a
  technical word, explain it in one line.
- We build ONE small web tool in phases. Only one Claude session works at a
  time. The Progress Log at the end of this file is our handover logbook.

## What we are building
- A tool with at most 3 pages. Today it is one page: index.html.
- Every record has location, urgency (Low / Medium / High) and status
  (Open / In progress / Resolved), plus the columns in "Our tool" below.
- Records are MADE UP. Costs and rates in the sample may come from PUBLIC
  sources (tenders, orders, government data), listed with links on the page
  under "Where the figures come from". Never add real names, phone numbers,
  employee IDs or MCL internal figures.

## Technical rules
1. Plain HTML, CSS and JavaScript only. Pages stay in the top folder; SQL
   files go in the database folder. No frameworks, no npm, no package.json,
   no build step.
2. Vercel publishes the site from the main branch. Use relative links only,
   e.g. href="dashboard.html".
3. Load Supabase from the jsDelivr CDN, then our settings, in this order:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="config.js"></script>
   Then create the client like this (do not call the variable "supabase"):
     const db = window.supabase.createClient(window.SUPABASE_URL,
                                              window.SUPABASE_PUBLISHABLE_KEY);
4. The Project URL and the publishable key live only in config.js. Never use
   or ask for a secret key, a service_role key or the database password.
5. For charts, load Chart.js from the jsDelivr CDN.
6. No login or sign-up. Anyone with the link can use the tool.
7. You may not be able to reach our database. Do NOT try to test the database
   connection. Write the code; we test it on the live website.
8. If anything fails, show a friendly message on the page that also includes
   the actual error text, so we can pass it on.
9. Every page must work well on a mobile phone: large buttons, readable text,
   no sideways scrolling. Use the same header and menu on every page.
10. Never delete config.js or CLAUDE.md.

## Database rules
- Our Data Keeper runs all SQL by pasting it into the Supabase SQL Editor.
  You cannot run SQL yourself.
- Give SQL as ONE block that runs in one go. Also save it in the database
  folder: 01-setup.sql, then 02-..., 03-... for later changes.
- One table. It must have: id uuid primary key default gen_random_uuid()
  and created_at timestamptz not null default now().
- Enable Row Level Security. Add policies that let the roles anon and
  authenticated SELECT, INSERT and UPDATE. No delete.
- Always include: grant select, insert, update on the table to anon,
  authenticated; (new Supabase projects need it, or the website gets
  "permission denied").
- Never drop a table or delete rows.
- Avoid changing the table after Phase 1. If a change is really needed, give
  one small block and explain it in one sentence.

## How to work with us
- Make one change at a time. Do not change parts that already work unless we
  ask.
- After each change, reply in 3 short bullets: what you changed and what we
  should test on the live website.
- Commit and push your work at every stopping point.

## Takeover and handover
- At the START of every session: read the Progress Log below and summarize it
  in 3 bullets (what exists, what works, what is next).
- At a "save point": add a new entry at the end of the Progress Log (phase,
  builder, what was built, what works, known problems, next step). Then
  commit and push.

## Our tool
- Team: MCL team 5
- Tool name: MM machine and spares monitor (Materials Management dept)
- Problem: (1) is each machine profitable to run, given its production,
  availability and utilisation; (2) is a big spare (e.g. a Rs 2 crore
  undercarriage for a shovel) worth buying, and is a cheaper option really
  cheaper per working hour; (3) what late supplies cost, including the
  domino effect (drill stops -> shovel stops after its buffer -> dumpers stop).
- Who records / who decides: MM staff record purchase orders; the manager
  reads the dashboard, chases suppliers and decides on spares and disposal.
- Files: index.html (the page), mm.js (data and calculations), sap.js (import
  from SAP), style.css, config.js (Supabase settings), database/ (SQL).
- Data: one shared Supabase table, mm_records (see database/01-setup.sql),
  used when config.js is filled in; otherwise each browser keeps its own copy
  (localStorage). Each row: kind (machine / spare / fitted / order / setting),
  record_key, location, urgency, status, data (all fields as JSON), hidden.

## Progress Log (newest entry at the bottom)
- Phase 0 (Claude): one-page dashboard built inside the mcl-team-5 repo in
  the mm-dashboard folder, waiting for its own GitHub repository. Works:
  machine profit cards with verdicts, spare "worth it?" calculator with
  Option A vs B, purchase orders with idle days and domino chain, charts,
  phone layout, print. Known problems: all figures made up; data kept in
  each browser only. Next: create the new repository and move these files
  to its top folder; then pick from the suggested additions.
- Own repository (Claude): files moved from mcl-team-5/mm-dashboard to the
  top folder of mcl-materialsmanagement, plus an empty config.js. Next:
  connect this repository to Vercel; replace made-up figures; choose the
  next addition (reorder levels, indent early warning, supplier scorecard).
- Supplier scorecard (Claude): new "Suppliers" section and menu link. Per
  supplier: orders and value, on-time % (only orders that arrived or are past
  their promised date), average days late, machine idle days caused,
  production lost with domino, penalty (LD) due, late and not yet received,
  grade (Good / Watch / Poor) and advice. Chart of money lost per supplier.
  Penalty terms (0.5% a week, 10% cap; made up) can be changed on the page.
  Poor suppliers also appear in "What to do next". Seven made-up on-time
  orders added to the sample so the grades vary. Known problem: browsers that
  opened the page before keep the old sample until "Reset to sample figures".
  Next: reorder levels or indent early warning.
- Indent early warning (Claude): new "Indent warning" section and menu link.
  A list of spares fitted on machines (life in hours, hours run, date read,
  lead time, safety margin, price, indent raised yes/no) with add, edit and
  remove. For each: life used, wear-out date, "raise indent by" date and a
  status (Raise indent now / Raise within N days / On track / Indent raised /
  Decide first when the machine loses money). If it would arrive after
  wear-out even if raised today, the loss is costed with the domino. Shows
  the real average indent-to-delivery days from the purchase orders. Urgent
  ones appear in "What to do next". Six made-up fitted spares in the sample.
  Next: reorder levels for stock items; connect to Vercel.
- Live on Vercel (team + Claude): https://mcl-materialsmanagement.vercel.app
  publishes from the main branch. Checked: latest version live, all six
  sections load, no errors, phone layout fine. Next: reorder levels for
  stock items, or real figures in place of the made-up ones.
- Spares list (Claude): new "Spares list" section and menu link, for each
  individual spare in the stores: code, machine, store (location), price,
  stock, on order, use per month, lead time, safety days, how critical
  (Low / Medium / High), last issued, life in hours. Works out reorder
  level, status (Out of stock / Reorder now / On order / Overstock / Dead
  stock / OK), suggested order quantity, stock value and money locked.
  Filter and search; add, edit, remove; a "Worth it?" button sends the spare
  to the "Is a big spare worth buying?" calculator. Critical reorders and
  locked money appear in "What to do next". Twelve made-up spares.
  Next: pick from the suggestions (ABC analysis, import from SAP, database).
- ABC analysis (Claude): new "ABC" section and menu link. Yearly spend per
  spare = price x use per month x 12, sorted; A = first 70% of spend, B up
  to 90%, C the rest (both cut-offs can be changed on the page). Shows
  counts and spend per class, a bar chart coloured by class, the ranked list
  with running total, and an ABC x critical (High/Medium/Low) grid with what
  to do for each box. Each spare card in the Spares list now shows its class.
- Shared database (Claude): database/01-setup.sql creates mm_records (one
  table for all records, RLS: read, add, update; no delete). index.html loads
  supabase-js and config.js. When config.js is filled in, the page reads all
  records from the table, saves each change about 1 second after typing (only
  the changed record), "Remove" sets hidden = true, re-reads every minute
  (not while someone is typing), and "Reset to sample figures" hides old rows
  and adds the sample. An empty table shows a button "Copy the sample data
  into the shared database". Tested with a stand-in database, not the real
  one. Next: Data Keeper creates a Supabase project, runs 01-setup.sql, fills
  in config.js; then SAP import.
- SAP import (Claude): new "SAP import" section and menu link (sap.js).
  Reads files exported from SAP ECC / S/4HANA list reports: ME2M/ME2N
  purchase orders, MB52/MMBE stock, MB51 consumption (201/261 issues,
  202/262 returns). CSV, semicolon, tab-separated and SAP "unconverted" text
  with | columns; repeated page headers and total lines are skipped. Columns
  are matched by SAP names and can be changed by hand; a preview shows the
  first rows. Matches by PO number + item, or by material code, so a second
  import updates instead of doubling. Dates day.month.year; numbers
  1,23,456.00, 1.234,56 and SAP's trailing minus. "Download a sample file"
  gives a made-up file of each kind for practice. Next: realistic figures.
- Public cost figures (Claude): sample costs and rates now come from public
  sources, listed with links in a new "Where the figures come from" section:
  overburden hired out about Rs 114/BCM (split drilling 15%, loading 35%,
  hauling 50%), BEML 100 t dumper about Rs 8.9 Cr, 20 m3 shovel Rs 118-133 Cr,
  diesel about Rs 88/litre and 8-10 litres a trip, 27.00 R49 tyre about
  Rs 2.7 L, coal 1.5 t per BCM. Records (machines, spares, orders, suppliers)
  are still made up. New results: Rs 2.57 Cr lost to late supplies, shovel
  undercarriage pays back in about 91 days. Browser storage key changed to
  mm-monitor-v2 so browsers load the new sample. Known problem: the MDP
  summary doc and slides still show the old figures. Next: real Supabase
  setup (config.js), then update the presentation figures.
