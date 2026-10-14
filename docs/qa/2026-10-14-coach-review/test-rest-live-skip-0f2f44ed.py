import qa,json,subprocess,sys
from qa_surface_guard import require_surface
subprocess.run([sys.executable,str(qa.ROOT/'capture-default-observer-86a26c44.py'),'coach-review-rest-live-before-tap-0f2f44ed'],check=True)
d=json.loads((qa.ROOT/'coach-review-rest-live-before-tap-0f2f44ed.json').read_bytes());ns=[n for n in d['activeWindowNodes'] if n.get('contentDescription')=='Skip rest' and n.get('visible') and n.get('enabled')];assert len(ns)==1
b=ns[0]['bounds'];assert len(b)==4 and 0<=b[0]<b[2]<=1080 and 0<=b[1]<b[3]<=2337
require_surface(qa.adb,'com.shift6.app');qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));print('TAPPED live Skip rest',b)
subprocess.run([sys.executable,str(qa.ROOT/'capture-default-observer-86a26c44.py'),'coach-review-rest-after-actual-skip-0f2f44ed'],check=True)
e=json.loads((qa.ROOT/'coach-review-rest-after-actual-skip-0f2f44ed.json').read_bytes());assert not any(n.get('visible') and (n.get('text')=='REST TIMER' or n.get('contentDescription')=='Skip rest') for n in e['activeWindowNodes']);assert any(n.get('text')=='1 of 5 sets' for n in e['activeWindowNodes'])
(qa.ROOT/'coach-review-rest-positive-0f2f44ed.json').write_text(json.dumps({'actualSkipTapped':True,'beforeCaptureEpoch':d['capturedAtEpochMillis'],'afterCaptureEpoch':e['capturedAtEpochMillis'],'tapBounds':b,'timerAndSkipRemoved':True,'savedCount':'1 of 5 sets','nativeCueDeliveryTested':False},indent=2)+'\n');print('PASS timer and Skip removed immediately, saved set retained')
