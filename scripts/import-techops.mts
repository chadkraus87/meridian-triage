/**
 * Import TechOps Command Center's scenario ticket templates as Switchboard tickets.
 *
 *   npm run import:techops -- ../techops-command-center
 *
 * Writes data/techops/tickets.json. Re-run when TechOps adds or changes scenario tickets.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fromTechOps, type TechOpsScenario } from "../lib/techops";

const repo = process.argv[2];
if (!repo) throw new Error("Pass the path to a TechOps Command Center checkout.");
const load = (file: string) => import(pathToFileURL(path.resolve(repo, file)).href);

const { SCENARIOS } = (await load("lib/sim/scenarios/index.ts")) as { SCENARIOS: TechOpsScenario[] };
const { CUSTOMERS } = (await load("lib/sim/tickets.ts")) as { CUSTOMERS: { company: string }[] };

const tickets = fromTechOps(SCENARIOS, CUSTOMERS.map((c) => c.company));
const out = path.join(process.cwd(), "data", "techops");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "tickets.json"), JSON.stringify(tickets, null, 2) + "\n");
console.log(`Wrote ${tickets.length} tickets from ${SCENARIOS.length} TechOps scenarios to data/techops/tickets.json`);
