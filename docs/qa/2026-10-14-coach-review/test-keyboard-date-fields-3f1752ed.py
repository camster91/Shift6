import qa, shlex, contextlib, io, sys

scale = sys.argv[1]
assert scale in ['1.0','2.0']
assert qa.adb('shell','settings','get','system','font_scale').decode().strip() == scale
qa.nodes()
for label, slug in [('Review start date','start'),('Review end date','end')]:
    qa.adb('shell','am','force-stop','com.shift6.app')
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
    with contextlib.redirect_stdout(io.StringIO()):
        qa.tap('Change review dates')
    for _ in range(7):
        try:
            qa.find(label, True)
            break
        except RuntimeError as error:
            if 'found 0' not in str(error): raise
            qa.nodes()
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    else: raise RuntimeError('Field not reached: '+label)
    with contextlib.redirect_stdout(io.StringIO()):
        qa.fill(label,'2026-10-',hide=False)
        qa.capture(f'coach-review-keyboard-date-{slug}-font{scale[0]}-3f1752ed')
    ns = qa.nodes()
    focused = [n for n in ns if n.get('class')=='android.widget.EditText' and n.get('focused')=='true']
    assert len(focused)==1 and focused[0].get('content-desc')==label and focused[0].get('text')=='2026-10-'
    print(label, focused[0].get('bounds'), flush=True)
    qa.adb('shell','input','keyevent','111')
qa.adb('shell','input','keyevent','3')
print('Date field cases complete; visual inspection required',flush=True)
