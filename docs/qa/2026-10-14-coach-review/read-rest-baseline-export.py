import qa,json
obs=json.loads((qa.ROOT/'coach-review-rest-baseline-export-receiver-settled-86a26c44.json').read_bytes());assert any(n.get('package')=='com.shift6.qa.receiver' and 'Received and opened JSON' in (n.get('text') or '') for n in obs['activeWindowNodes'])
raw=qa.adb('exec-out','run-as','com.shift6.qa.receiver','cat','files/received.json');b=json.loads(raw);a=json.loads((qa.ROOT/'coach-review-actual-labels-export-86a26c44.json').read_bytes());assert b['exportedAt']>'2026-10-14T15:23:00' and b['schemaVersion']==17
keys=[k for k,v in b.items() if isinstance(v,list)];changed=[k for k in keys if a[k]!=b[k]]
print('records',sum(len(b[k]) for k in keys),'arrays',len(keys),'changed',changed)
for k in keys:
 if 'completed' in k.lower() or 'session' in k.lower():
  print(k,len(a[k]),len(b[k]));
  if k=='completedSets':
   old={r['id'] for r in a[k]}; print('new records',[r for r in b[k] if r['id'] not in old])
(qa.ROOT/'coach-review-rest-baseline-export-86a26c44.json').write_bytes(raw)
