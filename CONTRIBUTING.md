# Contributing

Use synthetic data only. Keep changes focused, explain the behavior and include meaningful regression checks for financial calculations or access control. Run `npm test` and `npm run build` before opening a pull request. Do not use a personal production workspace to test writes.

Missing data must stay unavailable rather than becoming zero. Preserve transaction signs, distinguish refunds from income, and never invent card fees, due dates or payment status. New external integrations must be opt-in and document what leaves the user's machine.
