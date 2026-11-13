import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fromTechOps, TechOpsTicketSchema, type TechOpsScenario } from "../lib/techops";

const scenario = (id: string, n: number, body = "It keeps failing with 503s."): TechOpsScenario => ({
  id,
  title: `${id} title`,
  ticketTemplates: Array.from({ length: n }, (_, i) => ({ subject: `${id} ${i}`, body, priority: "high", affectedService: "api-gateway" })),
});

describe("fromTechOps", () => {
  const tickets = fromTechOps([scenario("dns-failure", 3), scenario("cdn-outage", 2)], ["Northwind Retail", "Aster Health"]);

  it("numbers tickets from MT-3001 and keeps 1-based template numbers per scenario", () => {
    expect(tickets.map((t) => t.id)).toEqual(["MT-3001", "MT-3002", "MT-3003", "MT-3004", "MT-3005"]);
    expect(tickets.map((t) => [t.source.scenarioId, t.source.templateNumber])).toEqual([
      ["dns-failure", 1],
      ["dns-failure", 2],
      ["dns-failure", 3],
      ["cdn-outage", 1],
      ["cdn-outage", 2],
    ]);
  });

  it("counts the other tickets in the same incident as other accounts reporting", () => {
    expect(tickets.map((t) => t.otherAccountsReporting)).toEqual([2, 2, 2, 1, 1]);
  });

  it("never invents a plan tier and cycles through TechOps companies", () => {
    expect(new Set(tickets.map((t) => t.customer.tier))).toEqual(new Set(["pro"]));
    expect(tickets.map((t) => t.customer.company).slice(0, 3)).toEqual(["Northwind Retail", "Aster Health", "Northwind Retail"]);
  });

  it("refuses a template that names a real domain", () => {
    expect(() => fromTechOps([scenario("dns-failure", 1, "Failing against api.meridiancloud.io")], ["X"])).toThrow(/real domain/);
    expect(() => fromTechOps([scenario("dns-failure", 1, "zone internal.meridian.io broke")], ["X"])).toThrow(/real domain/);
  });
});

describe("data/techops/tickets.json", () => {
  const tickets = z.array(TechOpsTicketSchema).parse(JSON.parse(readFileSync("data/techops/tickets.json", "utf8")));
  it("is valid, uses its own ID range, and names no real domain", () => {
    expect(tickets.length).toBeGreaterThan(0);
    expect(new Set(tickets.map((t) => t.id)).size).toBe(tickets.length);
    for (const t of tickets) {
      expect(t.id).toMatch(/^MT-3\d{3}$/);
      expect(`${t.subject} ${t.body}`).not.toMatch(/meridiancloud\.io|meridian\.io\b/);
    }
  });
});
