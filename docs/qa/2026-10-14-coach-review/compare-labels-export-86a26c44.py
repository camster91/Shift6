import qa,json
obs=json.loads((qa.ROOT/'coach-review-actual-labels-export-receiver-86a26c44.json').read_bytes()); assert any(n.get('package')=='com.shift6.qa.receiver' and 'Received and opened JSON' in (n.get('text') or '') for n in obs['activeWindowNodes'])
raw=qa.adb('exec-out','run-as','com.shift6.qa.receiver','cat','files/received.json'); b=json.loads(raw); a=json.loads((qa.ROOT/'coach-review-accessibility-export-ae3efb5a.json').read_bytes())
assert b['schemaVersion']==17 and b['exportedAt']>'2026-10-14T14:38:00'
keys=[k for k,v in b.items() if isinstance(v,list)]; assert len(keys)==36 and sum(len(b[k]) for k in keys)==1082
changed=[k for k in keys if a[k]!=b[k]]; assert set(changed)<={'workoutDrafts','workoutDraftLoadUnits'}
for k in changed:
 stable=lambda rows:[{f:v for f,v in r.items() if f not in {'updatedAt','updated_at'}} for r in rows]
 assert stable(a[k])==stable(b[k]),k
(qa.ROOT/'coach-review-actual-labels-export-86a26c44.json').write_bytes(raw)
r={'sourceCommit':'86a26c4490ab091f865e20773151a0443a9f2b8c','exportedAt':b['exportedAt'],'records':1082,'arrays':36,'changedArrays':changed,'actualPayloadsUnchanged':True,'draftPayloadsUnchanged':True,'onlyDraftAutosaveTimestampsChanged':True,'receiverOpenedOutsideApp':True,'fontScaleRestored':qa.adb('shell','settings','get','system','font_scale').decode().strip(),'enabledServices':qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()}
assert r['fontScaleRestored']=='1.0' and r['enabledServices']==''
(qa.ROOT/'coach-review-actual-labels-comparison-86a26c44.json').write_text(json.dumps(r,indent=2)+'\n'); print(r)
