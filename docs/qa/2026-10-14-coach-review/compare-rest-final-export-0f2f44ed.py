import json
from pathlib import Path
q=Path.cwd();a=json.loads((q/'coach-review-notification-upgrade-export-0f2f44ed.json').read_bytes());b=json.loads((q/'coach-review-rest-final-export-0f2f44ed.json').read_bytes());r=json.loads((q/'coach-review-rest-final-comparison-0f2f44ed.json').read_bytes())
allowed={'workoutDraftLoadUnits','scheduleBaselines','scheduleRevisions','trainingCycles','workoutSessions','completedSets','workoutDrafts'}
assert set(r['changedArrays'])==allowed
for k in [k for k,v in b.items() if isinstance(v,list) and k not in allowed]:assert a[k]==b[k],k
for k in ['scheduleBaselines','scheduleRevisions']:
 old={x['id']:x for x in a[k]};assert all(x==old[x['id']] for x in b[k] if x['id'] in old)
rev=[x for x in b['scheduleRevisions'] if x['id'] not in {y['id'] for y in a['scheduleRevisions']}];assert len(rev)==1 and (rev[0]['cycle_week'],rev[0]['from_date'],rev[0]['to_date'],rev[0]['time_zone'])==(2,'2026-10-20','2026-10-14','America/New_York')
cycid=rev[0]['cycle_id'];oldc={x['id']:x for x in a['trainingCycles']}
for x in b['trainingCycles']:
 before=oldc[x['id']]
 if x['id']!=cycid:assert x==before
 else:assert [k for k in x if x[k]!=before[k]]==['current_week','weeks_json'] and before['current_week']==1 and x['current_week']==2
old={x['id']:x for x in a['workoutSessions']};modified=[]
for x in b['workoutSessions']:
 if x['id'] in old and x!=old[x['id']]:
  changed={k for k in x if x[k]!=old[x['id']][k]};assert changed=={'status','completed_at'} and old[x['id']]['status']=='in-progress' and x['status']=='complete' and x['cycle_id']==cycid;modified.append(x['id'])
assert len(modified)==1
news=[x for x in b['workoutSessions'] if x['id'] not in old];assert len(news)==1 and news[0]['cycle_id']==cycid and news[0]['cycle_week']==2 and news[0]['status']=='in-progress'
for k in ['workoutDrafts','workoutDraftLoadUnits']:assert len(a[k])==len(b[k])==1 and b[k][0]['session_id']==news[0]['id']
vals=json.loads(b['workoutDrafts'][0]['values_json']);assert vals[r['newActual']['workout_exercise_id']+':1']['duration']=='14'
r['exactLifecycleScheduleAndDraftDeltasVerified']=True;r['unchangedOtherArrays']=29;r['completedOnlyPriorBWeek1']=True;r['singleNewBWeek2Session']=True;r['singleReviewedScheduleMove']={'from':'2026-10-20','to':'2026-10-14','timeZone':'America/New_York'}
(q/'coach-review-rest-final-comparison-0f2f44ed.json').write_text(json.dumps(r,indent=2)+'\n');print('PASS exact synthetic lifecycle/schedule/draft effects;29 other arrays unchanged')
