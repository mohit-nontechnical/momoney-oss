#!/usr/bin/env python3
"""Import explicit account balances plus a normalized transaction CSV; no bank access."""
import argparse, csv, hashlib, json, math, os, tempfile
from collections import Counter
from datetime import date, timedelta
from pathlib import Path

EXCLUDED = {'Credit Card Payments', 'Starting Balances', 'Transfer'}
INCOME = {'Income', 'Business Income', 'Rewards & Interest'}
def number(v):
    n = float(v)
    if not math.isfinite(n): raise ValueError('Amounts must be finite numbers')
    return round(n, 2)

def build(csv_path, config, demo=False):
    asof = date.fromisoformat(config['as_of'])
    accounts = config['accounts']
    if not accounts or len({a['name'] for a in accounts}) != len(accounts):
        raise ValueError('Provide uniquely named accounts and explicit balances')
    balances = [{'name': a['name'], 'balance': number(a['balance']), 'offbudget': bool(a.get('offbudget', False))} for a in accounts]
    names = {a['name'] for a in accounts}
    tx, occurrences, by_month = [], Counter(), {}
    with open(csv_path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        if not {'date', 'payee', 'amount', 'category', 'account'} <= set(reader.fieldnames or []):
            raise ValueError('CSV requires date,payee,amount,category,account columns')
        for row in reader:
            day = date.fromisoformat(row['date'])
            if day > asof: raise ValueError('Transaction date is later than as_of')
            if row['account'] not in names: raise ValueError('Transaction account missing from config')
            amount = number(row['amount']); cat = row['category'].strip() or 'Uncategorized'
            if cat in EXCLUDED: continue
            if not row['payee'].strip(): raise ValueError('Payee cannot be empty')
            identity = json.dumps([row['account'], row['date'], row['payee'], amount], separators=(',', ':'))
            occurrences[identity] += 1
            key = hashlib.sha256((identity + ':' + str(occurrences[identity])).encode()).hexdigest()[:24]
            tx.append(dict(id=key, date=row['date'], payee=row['payee'], amount=amount, category=cat, account=row['account']))
            m = by_month.setdefault(row['date'][:7], {'spendByCat': {}, 'income': 0, 'burn': 0})
            if amount > 0 and cat in INCOME: m['income'] = round(m['income'] + amount, 2)
            elif amount < 0:
                m['spendByCat'][cat] = round(m['spendByCat'].get(cat, 0) - amount, 2)
                m['burn'] = round(m['burn'] - amount, 2)
    now = asof.isoformat()[:7]
    current = by_month.setdefault(now, {'spendByCat': {}, 'income': 0, 'burn': 0})
    months = sorted(by_month)
    full = [m for m in months if m < now][-3:]
    avg = round(sum(by_month[m]['burn'] for m in full) / len(full), 2) if full else current['burn']
    liquid = round(sum(number(a['balance']) for a in accounts if a.get('kind') == 'cash'), 2)
    nw = round(sum(a['balance'] for a in balances), 2)
    goal = config['goal']; target = number(goal['target']); deadline = date.fromisoformat(goal['date'])
    if target <= 0 or deadline <= asof: raise ValueError('Provide a positive goal and a future goal date')
    if any(number(v) < 0 for v in config.get('budgets', {}).values()): raise ValueError('Budget amounts cannot be negative')
    left = max(1, (deadline - asof).days / 30.4375)
    cards = []
    for a in accounts:
        if a.get('kind') == 'card':
            if 'annual_fee' not in a: raise ValueError('Card accounts require an explicit annual_fee')
            cards.append(dict(name=a['name'], last4=str(a.get('last4', '')), annual_fee=number(a['annual_fee']), fee_month=a.get('fee_month'), verdict='review', note='Owner-entered card inventory.', account_match=a['name'], balance=number(a['balance'])))
    cutoff = asof - timedelta(days=89)
    tx90 = sorted([t for t in tx if date.fromisoformat(t['date']) >= cutoff], key=lambda t:t['date'], reverse=True)
    # Partial CSV coverage never becomes a claim of zero card spending.
    coverage = config.get('coverage_start')
    complete = bool(config.get('complete_all_accounts') is True and coverage and date.fromisoformat(coverage) <= cutoff)
    snapshot = dict(demo=demo, transaction_coverage_complete=complete, generated_at=asof.isoformat()+'T12:00:00Z', now_month=now,
        goal=dict(net_worth_target=target, target_date=goal['date'], label=goal.get('label','Net worth goal'), months_left=round(left,2), required_monthly_gain=round(max(0,target-nw)/left,2)),
        net_worth=nw, nw_synced=nw, nw_manual=0, income_goal_monthly=number(config.get('income_goal_monthly',0)), income_this_month=current['income'],
        avg_burn=avg, burn_this_month=current['burn'], liquid=liquid, runway_months=round(liquid/avg,2) if avg else None,
        months=months, by_month=by_month, balances=balances, manual_assets=[], fees_90d=[dict(date=t["date"], payee=t["payee"], amount=-t["amount"], account=t["account"]) for t in tx90 if t["category"] == "Bank & Card Fees" and t["amount"] < 0], large_30d=[], recurring=[], venture_costs={}, ventures=[], biz_income_this_month=round(sum(t["amount"] for t in tx if t["date"].startswith(now) and t["category"] == "Business Income" and t["amount"] > 0),2), house_share=1, fixed_costs_monthly=[],
        category_policy=dict(burn_excluded_categories=list(EXCLUDED), house_categories=[], house_share=1),
        budgets={c:dict(budgeted=number(v),actual=current['spendByCat'].get(c,0)) for c,v in config.get('budgets',{}).items()}, cards=cards, transactions_90d=tx90[:500])
    return snapshot

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--demo',action='store_true');p.add_argument('--csv');p.add_argument('--config');p.add_argument('--out',default=os.environ.get('MOMONEY_DATA_DIR','.data'));p.add_argument('--replace',action='store_true')
    a=p.parse_args()
    if a.demo: a.csv='examples/transactions.csv';a.config='examples/accounts.json'
    if not a.csv or not a.config: p.error('Provide --csv and --config, or --demo')
    dest=Path(a.out)
    if dest.exists() and any(dest.iterdir()) and not a.replace: p.error('Output contains data. Back it up, then use --replace to replace the snapshot.')
    s=build(a.csv,json.loads(Path(a.config).read_text()),a.demo)
    dest.mkdir(parents=True,exist_ok=True,mode=0o700)
    docs={'snapshot.json':s,'history.json':[], 'analysis.json':dict(generated_at=s['generated_at'],model='none',verdict='Imported snapshot. No automated analysis has been run.',highlights=[],actions=[],tasks=[]), 'receipts.json':dict(generated_at=s['generated_at'],window_days=90,scanned_accounts=[],merchants=[],alerts=[])}
    for name,value in docs.items():
        fd,tmp=tempfile.mkstemp(dir=dest,prefix='.import-')
        with os.fdopen(fd,'w') as f: json.dump(value,f,indent=2);f.write('\n')
        os.replace(tmp,dest/name)
    if not (dest/'tasks.json').exists(): (dest/'tasks.json').write_text('[]\n')
    print(f'Imported {len(s["transactions_90d"])} recent transactions and {len(s["balances"])} accounts. Data written to {dest}.')
if __name__=='__main__': main()
