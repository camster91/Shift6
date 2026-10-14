import qa,contextlib,io,json
font=qa.adb('shell','settings','get','system','font_scale').decode().strip();assert font=='2.0'
qa.adb('shell','input','keyevent','111')
def tap_reached(label):
 for _ in range(12):
  try:
   n=qa.find(label);b=qa.bounds(n)
   if 120<=b[1]<b[3]<=1900:
    qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));return
  except RuntimeError as e:
   if 'found 0' not in str(e):raise
  qa.adb('shell','input','swipe','33','1700','33','800','400')
 raise RuntimeError('Control not reached '+label)
tap_reached('Use optional voice set entry');tap_reached('Speak a set entry')
label='Review or correct the spoken set entry'
for _ in range(12):
 try:
  n=qa.find(label,True);b=qa.bounds(n)
  if 120<=b[1]<b[3]<=1900:break
 except RuntimeError as e:
  if 'found 0' not in str(e):raise
 qa.adb('shell','input','swipe','33','1700','33','800','400')
else:raise RuntimeError('Voice correction not reached')
with contextlib.redirect_stdout(io.StringIO()):qa.fill(label,'26 seconds, RPE seven',hide=False)
n=qa.find(label,True);assert n.get('focused')=='true' and n.get('text')=='26 seconds, RPE seven'
with contextlib.redirect_stdout(io.StringIO()):qa.capture('coach-review-actual-labels-voice-current-ime-font2.0-86a26c44')
r={'sourceCommit':'86a26c4490ab091f865e20773151a0443a9f2b8c','fontScale':font,'typedFallbackExactReadback':True,'focused':True,'fieldBounds':qa.bounds(n),'keyboardModeMustBeObserved':True,'noReviewApplyOrComplete':True}
(qa.ROOT/'coach-review-actual-labels-voice-typed-font2.0-86a26c44-receipt.json').write_text(json.dumps(r,indent=2)+'\n',encoding='utf8');print(r)
