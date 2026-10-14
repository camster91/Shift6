import qa,contextlib,io,shlex,json
font='2.0'
qa.adb('shell','input','keyevent','111')
qa.adb('shell','settings','put','system','font_scale',font)
qa.adb('shell','am','force-stop','com.shift6.app')
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6:///'),'com.shift6.app')
qa.nodes()
with contextlib.redirect_stdout(io.StringIO()):qa.tap('Resume workout')
label='QA Hold set 1 duration in seconds'
for _ in range(10):
 try:
  n=qa.find(label,True); b=qa.bounds(n)
  if 120<=b[1]<b[3]<=1900:break
 except RuntimeError as e:
  if 'found 0' not in str(e):raise
 qa.adb('shell','input','swipe','33','1700','33','800','400')
else:raise RuntimeError('Duration not safely reached')
assert n.get('text')=='26'
assert qa.find('QA Hold set 1 RPE from 1 to 10',True).get('text')=='7'
ns=qa.nodes();assert any(x.get('text')=='Duration (seconds)' for x in ns) and any(x.get('text')=='RPE (1–10)' for x in ns)
with contextlib.redirect_stdout(io.StringIO()):qa.capture('coach-review-actual-labels-restored-font2.0-86a26c44')
r={'sourceCommit':'86a26c4490ab091f865e20773151a0443a9f2b8c','fontScale':font,'closedKeyboardPersistentLabels':True,'restoredDuration':'26','restoredRpe':'7','inputBounds':b,'noSetSaveOrApply':True,'keyboardCasesSeparate':True}
(qa.ROOT/'coach-review-actual-labels-closed-font2.0-86a26c44-receipt.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(r)
