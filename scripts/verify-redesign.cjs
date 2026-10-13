const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
function load(name) {
  const file = path.resolve(name),
    m = new Module(file);
  m.filename = file;
  m.paths = module.paths;
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const {
  normalizeAccount,
  cardMetrics,
  reporting,
  budgetRows,
  needsReview,
  accountGroups,
} = load("lib/dashboard-metrics.ts");
const { validateCardDetails } = load("lib/card-details.ts");
const s = {
  generated_at: "2026-10-12T20:00:00Z",
  now_month: "2026-10",
  balances: [
    { name: "Card A", balance: -100, offbudget: false },
    { name: "Spending Account", balance: 500, offbudget: true },
  ],
  cards: [
    { name: "A", account_match: "Card A", annual_fee: 100 },
    { name: "Unknown", annual_fee: 99 },
  ],
  manual_assets: [{ name: "Other", value: 20 }],
  budgets: {
    Dining: { budgeted: 100, actual: 50 },
    Travel: { budgeted: 0, actual: 10 },
    "Credit Card Payments": { budgeted: 0, actual: -100 },
  },
  transaction_coverage_complete: true, transactions_90d: [
    { account: "Card A", amount: -100, category: "Dining" },
    { account: "Card A", amount: -50, category: "Credit Card Payments" },
    { account: "Card A", amount: 20, category: "Dining" },
  ],
};
assert.equal(normalizeAccount("VISA�� CARD"), normalizeAccount("VISA CARD"));
let cards = cardMetrics(s);
assert.equal(cards[0].spend, 100);
assert.equal(cards[0].owed, 100);
assert.equal(cards[0].drag, (100 / ((100 * 365) / 90)) * 100);
assert.equal(cards[1].owed, null);
assert.equal(cards[1].spend, null);
assert.equal(
  cardMetrics({
    ...s,
    transaction_coverage_complete: true, transactions_90d: Array(500).fill(s.transactions_90d[0]),
  })[0].spend,
  null,
);
assert.equal(cardMetrics({ ...s, transaction_coverage_complete: true, transactions_90d: [] })[0].drag, null);
assert.equal(reporting(s).days, 31);
assert.equal(reporting({ ...s, now_month: "2024-02" }).days, 29);
assert.equal(budgetRows(s).find((b) => b.name === "Travel").status, "unset");
assert.equal(budgetRows(s).length, 2);
assert.equal(budgetRows(s).find((b) => b.name === "Dining").status, "watch");
assert.equal(
  accountGroups(s).reduce((n, g) => n + g.total, 0),
  420,
);
assert.equal(
  needsReview({ category: "Dining", id: "one" }, [{ id: "one" }]),
  true,
);
const good = {
  due_date: "2026-10-20",
  minimum: 0,
  limit: 1000,
  autopay: "unknown",
  fee_month: 12,
};
assert.deepEqual(validateCardDetails(good), good);
for (const bad of [
  { ...good, limit: 0 },
  { ...good, minimum: -1 },
  { ...good, due_date: "2026-02-30" },
  { ...good, fee_month: 13 },
  { ...good, autopay: "guess" },
  { ...good, minimum: 1.001 },
])
  assert.throws(() => validateCardDetails(bad));
console.log(
  "Redesign checks passed: missing and capped feeds, transfer/payment exclusion, fee drag, debt signs, dates, unset budgets, review flags, account reconciliation and card input validation.",
);
