import qa,shlex,json,contextlib,io
assert qa.adb('shell','settings','get','system','font_scale').decode().strip()=='1.0'
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6:///'),'com.shift6.app')
with contextlib.redirect_stdout(io.StringIO()):qa.tap('Resume workout')
for _ in range(10):
 try:
  n=qa.find('QA Hold set 1 duration in seconds',True);b=qa.bounds(n)
  if 120<=b[1]<b[3]<=1900:break
 except RuntimeError as e:
  if 'found 0' not in str(e):raise
 qa.adb('shell','input','swipe','33','1700','33','800','400')
else:raise RuntimeError('Draft not safely reached')
assert n.get('text')=='26'; assert qa.find('QA Hold set 1 RPE from 1 to 10',True).get('text')=='7'
with contextlib.redirect_stdout(io.StringIO()):qa.capture('coach-review-actual-labels-final-recovery-font1.0-86a26c44')
print('Final force-close recovery exact26seconds/RPE7; font1, no save')
