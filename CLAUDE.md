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
- All data is MADE UP. Never add real names, phone numbers, employee IDs or
  real MCL figures.

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
- Files: index.html (the page), mm.js (data and calculations), style.css,
  config.js (empty Supabase settings, for later).
- Data: made-up sample data inside mm.js, saved per browser (localStorage).
  No database yet. If one is added, the table would be purchase_orders.

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
