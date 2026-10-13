const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
function load(file) {
  const m = new Module(file);
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
  annotated,
  validateAnnotation,
  applyCustomization,
  goalProgress,
  EMPTY_CUSTOMIZATION,
  txnKey,
} = load(require("node:path").resolve("lib/customization.ts"));
const { supportedDollarFigures } = load(
  require("node:path").resolve("lib/ask-grounding.ts"),
);
const t = {
  id: "t1",
  date: "2026-10-01",
  payee: "Hotel",
  account: "Card",
  amount: -100,
  category: "Travel",
};
assert.throws(
  () =>
    validateAnnotation(
      {
        category: "Travel",
        tags: [],
        splits: [
          { category: "Travel", amount: 40 },
          { category: "Dining & Drinks", amount: 50 },
        ],
      },
      t,
    ),
  /equal/,
);
assert.throws(
  () =>
    validateAnnotation(
      { category: "Business Income", tags: [], splits: [] },
      t,
    ),
  /spending/,
);
assert.throws(
  () =>
    validateAnnotation(
      {
        category: "Travel",
        tags: [],
        splits: [
          { category: "Travel", amount: 50.001 },
          { category: "Dining & Drinks", amount: 49.999 },
        ],
      },
      t,
    ),
  /cents/,
);
const a = validateAnnotation(
  {
    category: "Travel",
    tags: ["trip", "trip"],
    splits: [
      { category: "Travel", amount: 60 },
      { category: "Dining & Drinks", amount: 40 },
    ],
  },
  t,
);
assert.deepEqual(a.tags, ["trip"]);
const s = {
  transactions_90d: [t],
  by_month: {
    "2026-10": { spendByCat: { Travel: 100 }, burn: 100, income: 0 },
  },
  months: ["2026-10"],
  balances: [],
  cards: [{ balance: -300 }, { balance: -200 }],
  liquid: 1000,
  net_worth: 2000,
};
const c = structuredClone(EMPTY_CUSTOMIZATION);
c.annotations[txnKey(t)] = { ...a, updated_at: "now" };
const after = applyCustomization(s, c);
assert.equal(after.by_month["2026-10"].spendByCat.Travel, 60);
assert.equal(after.by_month["2026-10"].spendByCat["Dining & Drinks"], 40);
assert.equal(after.by_month["2026-10"].burn, 100);
assert.equal(s.by_month["2026-10"].spendByCat.Travel, 100);
const base = {
  id: "goal",
  name: "Pay off cards",
  source: "debt",
  target: 1000,
  current: 0,
  baseline: 1000,
  deadline: "2027-01-01",
  tag: "",
  updated_at: "",
};
let p = goalProgress(base, s, new Date("2026-10-12"));
assert.equal(p.current, 500);
assert.equal(p.remaining, 500);
assert.equal(p.percent, 50);
p = goalProgress(
  { ...base, deadline: "2026-01-01" },
  s,
  new Date("2026-10-12"),
);
assert.equal(p.monthly, null);
assert.equal(p.overdue, true);
assert.equal(supportedDollarFigures("You have **$1,000**.", s), true);
assert.equal(supportedDollarFigures("You have $9,999.", s), false);
assert.equal(
  supportedDollarFigures("It costs $1.5k.", s, "What if I spend $1,500?"),
  true,
);
console.log(
  "Adjustments checks passed: split reconciliation, category guards, preserved totals, debt goals, deadlines, unsupported figures",
);

const futureRules = {
  ...EMPTY_CUSTOMIZATION,
  rules: [
    {
      merchant: "Hotel",
      category: "Dining & Drinks",
      sign: "negative",
      effective_date: "2026-10-12",
      known_keys: ["t1"],
    },
  ],
};
assert.equal(annotated(t, futureRules).category, "Travel");
assert.equal(
  annotated({ ...t, id: "new", date: "2026-10-13" }, futureRules).category,
  "Dining & Drinks",
);
assert.equal(
  annotated({ ...t, id: "old", date: "2026-10-01" }, futureRules).category,
  "Travel",
);
console.log("Future merchant rules preserve historical classifications");

const pendingBusiness = structuredClone(c);
pendingBusiness.annotations[txnKey(t)] = {
  ...a,
  splits: [],
  category: "Business Tools & Infra",
  updated_at: "now",
};
assert.equal(
  applyCustomization(s, pendingBusiness).by_month["2026-10"].burn,
  0,
);
p = goalProgress(
  { ...base, deadline: "2026-10-12" },
  s,
  new Date("2026-10-12T12:00:00Z"),
);
assert.equal(p.overdue, false);
assert.equal(p.monthly, null);
p = goalProgress(base, { ...s, cards: [] }, new Date("2026-10-12T12:00:00Z"));
assert.equal(p.available, false);
assert.equal(p.current, null);
console.log("Business burn, due-today goals and missing card balances passed");
