# Loss Finder MVP — Finale Build Plan

## User and problem

Primary user: Indian salaried professionals with several recurring digital payments across bank accounts. They need a clear view of charges, price changes and upcoming renewals without granting bank-login access. The initial payer hypothesis is a consumer who values multi-statement history and reminders; the proposed ₹49/month or ₹399/year premium price needs customer validation.

Secondary journeys: a household member combines statements to find repeated subscriptions, and an independent professional reviews recurring software payments. Both use the same multi-CSV and review flow. The household journey works without shared login; a dedicated business/personal split is planned, not present.

## Working product journey

1. Open Loss Finder and continue as guest or sign in.
2. Select several bank CSVs in one action or add them incrementally. See accepted file names and parsed row counts; remove a file before analysis. Each file is checked for required headings and a 5 MB size limit.
3. Analyze all selected statements together. Transactions with matching references and details are collapsed in browser analysis. Signed-in users send normalized transactions to Neo4j, which maintains import records and subscriptions.
4. Signed-in users open the Subscription Review Centre, choose Keep, Review later or Consider cancelling for each detected subscription, then press Save choices. The Saved Decisions page groups their choices, which persist in Neo4j. Guests who open either page see a sign-in prompt.
5. See estimated renewals within 30 days, based on the most recent payment date. These are in-app estimates, not emails, push notifications or confirmed merchant schedules.

## Existing foundation

React/Vite frontend, Express API, Neo4j user-scoped storage, authentication, CSV parsing, merchant recognition, recurring-charge detection, price-hike/trial flags, evidence, annual view and cancellation guides. The sample profile is illustrative; actual CSV import and saved review decisions form the working MVP flow.

## What the final product should look like

An upload screen that accepts several statements and explains privacy; a dashboard with recurring charges and supporting evidence; a Review Centre with decisions and upcoming payment estimates; account-based history across visits; accessible mobile navigation. Future product work includes actual notification delivery, account-level bank provenance, stronger duplicate review, cancellation verification, correction of false positives and production security/deployment hardening.

## Definition of done and validation still required

The code-level MVP is done when a real supported CSV can be combined with another, analyzed, reviewed and revisited after signing in, with estimated renewals shown only when recent payment data supports them. A production-ready finale submission additionally needs a live URL, a working Neo4j account flow, two ArgosX scan reports with remediation notes, and interviews with three real target users. None of those external results should be claimed from code alone.

Persona/use-case evidence to gather from each interview: current tracking method; an overlooked or changed recurring payment; whether the explanation earns trust; whether they would return at renewal time; willingness to pay. Record assumption, observation and planned change for each participant without inventing responses.

Scaling path: keep frontend assets static, run the API as a stateless service, monitor import latency and database connections, and move import/reanalysis into background work as volume grows. The Neo4j graph stores user → transaction → merchant → subscription relationships and persists review decisions.
