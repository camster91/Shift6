import qa,json
ns=qa.nodes()
assert any(n.get('package')=='com.shift6.qa.receiver' and 'Received and opened JSON' in n.get('text','') for n in ns)
b=qa.adb('exec-out','run-as','com.shift6.qa.receiver','cat','files/received.json'); d=json.loads(b)
assert d['schemaVersion']==17 and d['exportedAt']>'2026-10-14T12:48:00'
old=json.loads((qa.ROOT/'coach-review-date-bulk-export-ae3efb5a.json').read_bytes())
arrays={k:v for k,v in d.items() if isinstance(v,list)}
assert len(arrays)==36 and sum(map(len,arrays.values()))==1082
changed=[k for k in arrays if arrays[k]!=old[k]]
(qa.ROOT/'coach-review-accessibility-export-ae3efb5a.json').write_bytes(b)
r={'exportedAt':d['exportedAt'],'schemaVersion':17,'recordCount':1082,'arrayCount':36,'changedArrays':changed,'receiverVerified':True}
(qa.ROOT/'coach-review-accessibility-comparison-ae3efb5a.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8')
print(r)
qa.capture('coach-review-accessibility-export-ae3efb5a-receiver')
