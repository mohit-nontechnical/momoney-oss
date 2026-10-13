import importlib.util, json, tempfile, unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('import_csv',Path(__file__).with_name('import-csv.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ImportTests(unittest.TestCase):
 def test_demo_reconciliation(self):
  cfg=json.loads(Path('examples/accounts.json').read_text());s=m.build('examples/transactions.csv',cfg,True)
  self.assertEqual(s['net_worth'],33940);self.assertEqual(s['liquid'],16800);self.assertEqual(s['burn_this_month'],1624);self.assertEqual(s['income_this_month'],4200);self.assertTrue(s['demo'])
  self.assertEqual(len({t['id'] for t in s['transactions_90d']}),len(s['transactions_90d']))
 def test_signs_and_coverage(self):
  cfg=json.loads(Path('examples/accounts.json').read_text());cfg.pop('complete_all_accounts')
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'tx.csv';p.write_text('date,payee,amount,category,account\n2026-10-01,Pay,100,Income,Demo Checking\n2026-10-02,Shop,-20,Groceries,Everyday Card\n2026-10-03,Refund,5,Groceries,Everyday Card\n2026-10-04,Payment,-200,Credit Card Payments,Demo Checking\n')
   s=m.build(p,cfg);self.assertEqual(s['income_this_month'],100);self.assertEqual(s['burn_this_month'],20);self.assertFalse(s['transaction_coverage_complete']);self.assertEqual(len(s['transactions_90d']),3)
   p.write_text('date,payee,amount,category,account\n2026-10-02,Shop,NaN,Groceries,Everyday Card\n')
   with self.assertRaises(ValueError):m.build(p,cfg)
if __name__=='__main__':unittest.main()
