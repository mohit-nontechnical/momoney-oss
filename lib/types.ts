export interface Goal {
    net_worth_target: number;
    target_date: string;
    label: string;
    months_left: number;
    required_monthly_gain: number;
}
export interface MonthData {
    spendByCat: Record<string, number>;
    income: number;
    burn: number;
}
export interface Balance {
    name: string;
    offbudget: boolean;
    balance: number;
}
export interface ManualAsset {
    name: string;
    value: number;
    as_of: string;
    note?: string;
}
export interface FeeEntry {
    date: string;
    payee: string;
    amount: number;
    account: string;
}
export interface LargeCharge {
    date: string;
    payee: string;
    amount: number;
    category?: string | null;
}
export interface RecurringEntry {
    payee: string;
    category?: string | null;
    monthly: number;
    annual: number;
    count: number;
}
export interface VentureCost {
    total: number;
    byMonth: Record<string, number>;
}
export interface VentureRevenue {
    total: number;
    byMonth: Record<string, number>;
    sources: string[];
}
export interface Venture {
    id: string;
    name: string;
}
export interface FixedCost {
    name: string;
    amount: number;
    category: string;
    note?: string;
}
export interface BudgetLine {
    budgeted: number;
    actual: number;
}
export type Budgets = Record<string, BudgetLine>;
export type PatternType = "category_creep" | "interest_drag" | "idle_cash" | "duplicate_sub" | "annual_fee" | "hobby_venture";
export interface Pattern {
    id: string;
    type: PatternType;
    title: string;
    detail: string;
    dollars_annual: number;
    action: string;
}
export interface MoneyMove {
    title: string;
    rationale: string;
    est_annual_dollars: number;
    first_step: string;
}
export interface CardInfo {
    name: string;
    last4: string;
    annual_fee: number;
    fee_month: string | null;
    verdict: string;
    note?: string;
    account_match?: string | null;
    balance?: number;
}
export interface HouseholdMonth {
    month: string;
    utilities: Record<string, number>;
    total: number;
    per_person: number;
}
export interface Household {
    split_ways: number;
    roommates: string[];
    rent_note: string;
    months: HouseholdMonth[];
}
export interface Txn {
    id?: string;
    tags?: string[];
    splits?: {
        category: string;
        amount: number;
    }[];
    date: string;
    payee: string;
    amount: number;
    category: string | null;
    account: string;
}
export interface FreshnessAccount {
    name: string;
    last_txn_date: string;
    days_stale: number;
}
export interface Freshness {
    newest_txn_date: string | null;
    days_since_newest_txn: number | null;
    accounts: FreshnessAccount[];
}
export type OutlierKind = "category_month" | "new_category" | "txn";
export interface Outlier {
    id: string;
    kind: OutlierKind;
    title: string;
    detail: string;
    amount: number;
    baseline: number;
    delta: number;
    month?: string;
    category?: string;
    date?: string;
    payee?: string;
}
export interface LedgerReport {
    total_rows: number;
    oldest_date: string | null;
    new_today: number;
    changed_today: number;
    missing_new: number;
    missing_active: number;
    updated_at: string;
}
export interface CoverageMonth {
    spend: number;
    uncategorized: number;
    uncategorized_pct: number;
    n_total: number;
    n_uncategorized: number;
}
export interface Coverage {
    by_month: Record<string, CoverageMonth>;
    overall_pct: number;
    worst_month: string | null;
}
export interface NeedsReviewItem {
    id: string;
    date: string;
    payee: string;
    amount: number;
    account: string;
    suggested: string;
    confidence: number;
    reason: string;
}
export interface CategorizeCounts {
    uncategorized_before: number;
    decided_deterministic: number;
    decided_llm: number;
    written: number;
    needs_review: number;
    rules_created: number;
}
export interface CategorizeSummary {
    generated_at: string;
    model_used: string | null;
    dry_run?: boolean;
    counts: CategorizeCounts;
}
export interface TripMerchant {
    payee: string;
    total: number;
}
export interface Trip {
    id: string;
    start: string;
    end: string;
    days: number;
    total: number;
    per_day: number;
    n_txns: number;
    by_category: Record<string, number>;
    top_merchants: TripMerchant[];
    anchor_payee: string | null;
    new_merchant_share: number;
}
export interface PacePriorMonth {
    month: string;
    same_day_spend: number | null;
    full_month_spend: number;
}
export interface Pace {
    month: string;
    day_of_month: number;
    mtd_spend: number;
    prior_months: PacePriorMonth[];
    avg_same_day: number | null;
    delta_pct: number | null;
    projected_month_end: number | null;
    on_pace: boolean | null;
}
export interface ForecastEvent {
    label: string;
    amount: number;
}
export interface ForecastDay {
    date: string;
    projected: number;
    events: ForecastEvent[];
}
export interface Forecast {
    generated_at: string;
    horizon_days: number;
    starting_liquid: number;
    daily: ForecastDay[];
    min_balance: number;
    min_date: string;
    below_threshold_date: string | null;
    threshold: number;
    assumptions: string[];
}
export interface PendingAlert {
    id: string;
    title: string;
    detail: string;
    urgent: boolean;
    since_date: string;
    amount?: number | null;
}
export interface AlertsStatus {
    generated_at: string;
    pending_total: number;
    pending_urgent: number;
    oldest_pending_date: string | null;
    delivery_configured: boolean;
    pending: PendingAlert[];
}
export interface Snapshot {
    demo?: boolean;
    transaction_coverage_complete?: boolean;
    now_month?: string;
    category_policy?: {
        burn_excluded_categories: string[];
        house_categories: string[];
        house_share: number;
    };
    generated_at: string;
    goal: Goal;
    net_worth: number;
    nw_synced: number;
    nw_manual: number;
    income_goal_monthly: number;
    income_this_month: number;
    avg_burn: number;
    burn_this_month: number;
    liquid: number;
    runway_months: number | null;
    months: string[];
    by_month: Record<string, MonthData>;
    balances: Balance[];
    manual_assets: ManualAsset[];
    fees_90d: FeeEntry[];
    large_30d: LargeCharge[];
    recurring: RecurringEntry[];
    venture_costs: Record<string, VentureCost>;
    venture_revenue?: Record<string, VentureRevenue>;
    ventures: Venture[];
    biz_income_this_month: number;
    house_share: number;
    fixed_costs_monthly: FixedCost[];
    budgets?: Budgets;
    patterns?: Pattern[];
    cards?: CardInfo[];
    household?: Household;
    transactions_90d?: Txn[];
    freshness?: Freshness;
    outliers?: Outlier[];
    ledger?: LedgerReport;
    coverage?: Coverage;
    needs_review?: NeedsReviewItem[];
    categorize?: CategorizeSummary;
    trips?: Trip[];
    pace?: Pace;
    forecast?: Forecast;
    alerts_status?: AlertsStatus;
}
export interface HistoryEntry {
    date: string;
    net_worth: number;
    liquid: number;
}
export type History = HistoryEntry[];
export type TaskCategory = "cancel" | "negotiate" | "automate" | "review";
export interface Task {
    id: string;
    title: string;
    impact_annual: number | null;
    category: TaskCategory;
    how: string;
    delegate: boolean;
}
export interface Analysis {
    generated_at: string;
    model: string;
    verdict: string;
    highlights: string[];
    actions: string[];
    venture_note?: string;
    tasks: Task[];
    money_moves?: MoneyMove[];
}
export type TaskStatus = "todo" | "done" | "dismissed";
export interface TaskState extends Task {
    status: TaskStatus;
    created_at: string;
    updated_at: string;
}
export type TasksFile = TaskState[];
export interface IngestBody {
    snapshot: Snapshot;
    history: History;
    analysis: Analysis;
    receipts?: Receipts;
}
export interface ReceiptMerchant {
    merchant: string;
    accounts: string[];
    count: number;
    last_date: string;
    last_amount: number;
    sample_subject?: string;
    signals: string[];
}
export interface ReceiptAlert {
    type: string;
    merchant: string;
    date: string;
    amount: number;
}
export interface Receipts {
    generated_at: string;
    window_days: number;
    scanned_accounts: string[];
    merchants: ReceiptMerchant[];
    alerts: ReceiptAlert[];
}
export interface AskHistoryTurn {
    q: string;
    a: string;
}
export interface AskRequestBody {
    question: string;
    history?: AskHistoryTurn[];
}
export interface AskSuccessResponse {
    answer: string;
    model: string;
}
export interface AskErrorResponse {
    error: string;
}
export interface SummaryGoal {
    label: string;
    target: number;
    target_date: string;
    months_left: number;
    delta_vs_glide: number;
}
export interface SummaryHero {
    net_worth: number;
    goal: SummaryGoal;
    income_this_month: number;
    income_goal_monthly: number;
    avg_burn: number;
    burn_this_month: number;
    liquid: number;
    runway_months: number | null;
}
export interface SummaryPattern {
    title: string;
    dollars_annual: number;
    action: string;
}
export interface SummaryMoneyMove {
    title: string;
    est_annual_dollars: number;
}
export interface SummaryHouseholdLatest {
    month: string;
    total: number;
    per_person: number;
}
export interface SummaryUpcomingRenewal {
    merchant: string;
    est_next_date: string;
    amount: number;
}
export interface SummaryVentures {
    total_cost: number;
    total_revenue?: number;
    total_net?: number;
}
export interface SummaryFreshness {
    data_through: string;
    days_old: number;
    stale: boolean;
}
export interface SummaryCoverage {
    categorized_pct: number;
    worst_month: string | null;
}
export interface SummaryCategorize {
    needs_review: number;
    written: number;
}
export interface SummaryTrip {
    start: string;
    end: string;
    total: number;
}
export interface SummaryPace {
    delta_pct: number | null;
    on_pace: boolean | null;
}
export interface SummaryForecastDigest {
    min_balance: number;
    min_date: string;
    below_threshold_date: string | null;
}
export interface SummaryRecommendations {
    total_annual: number;
    priced_count: number;
    unpriced_count: number;
    top_title?: string;
}
export interface SummaryAlertsStatus {
    pending_total: number;
    pending_urgent: number;
    oldest_pending_date: string | null;
}
export interface SummaryResponse {
    goals?: {
        name: string;
        deadline: string;
        available: boolean;
        current: number | null;
        target: number;
        remaining: number | null;
        percent: number | null;
        monthly: number | null;
        overdue: boolean;
        observed: number | null;
    }[];
    generated_at: string;
    freshness?: SummaryFreshness;
    hero: SummaryHero;
    nw_change_30d: number | null;
    top_patterns: SummaryPattern[];
    money_moves: SummaryMoneyMove[];
    open_tasks?: number;
    receipts_alerts?: ReceiptAlert[];
    upcoming_renewals?: SummaryUpcomingRenewal[];
    household_latest?: SummaryHouseholdLatest;
    ventures?: SummaryVentures;
    coverage?: SummaryCoverage;
    needs_review_count?: number;
    categorize?: SummaryCategorize;
    trips?: SummaryTrip[];
    pace?: SummaryPace;
    forecast?: SummaryForecastDigest;
    recommendations?: SummaryRecommendations;
    alerts_status?: SummaryAlertsStatus;
}
