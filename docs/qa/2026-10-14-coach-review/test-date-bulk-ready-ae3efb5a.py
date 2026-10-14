import qa,shlex,contextlib,io,json
def quiet(f,*a):
    with contextlib.redirect_stdout(io.StringIO()): return f(*a)
def reach(label):
    for _ in range(7):
        try:return qa.find(label,True)
        except RuntimeError as e:
            if 'found 0' not in str(e):raise
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    raise RuntimeError('Field not reached '+label)
assert qa.adb('shell','settings','get','system','font_scale').decode().strip()=='1.0'
qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
quiet(qa.tap,'Change review dates')
results=[]
for label,slug in [('Review start date','start'),('Review end date','end')]:
    n=reach(label);b=qa.bounds(n)
    qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
    assert qa.find(label,True).get('focused')=='true'
    for index in range(2):
        qa.adb('shell','input','keycombination','113','29')
        qa.adb('shell','input','keyevent','67')
        empty=qa.find(label,True)
        assert empty.get('focused')=='true' and empty.get('text')=='' and qa.bounds(empty)[3]<=1517
        qa.adb('shell','input','text','2026-10-')
        field=qa.find(label,True)
        quiet(qa.capture,f'coach-review-date-bulk-{slug}-{index}-ae3efb5a')
        row={'field':label,'attempt':index,'text':field.get('text'),'focused':field.get('focused'),'bounds':field.get('bounds')}
        results.append(row)
        (qa.ROOT/'coach-review-date-bulk-readback-ae3efb5a.json').write_text(json.dumps(results,indent=2)+'\n')
        assert field.get('text')=='2026-10-' and field.get('focused')=='true' and qa.bounds(field)[3]<=1517,row
        print(row,flush=True)
    qa.adb('shell','input','keyevent','111')
qa.adb('shell','input','keyevent','3')
print('PASS four bulk inputs after confirmed empty focused field; no review/save',flush=True)
