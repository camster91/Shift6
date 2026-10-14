import qa, shlex, contextlib, io

assert qa.adb('shell','settings','get','system','font_scale').decode().strip()=='2.0'
qa.nodes()
for label, slug in [('Review start date','start'),('Review end date','end')]:
    qa.adb('shell','am','force-stop','com.shift6.app')
    qa.adb('shell','am','start','-W','-a','android.intent.action.VIEW','-d',shlex.quote('shift6://coach-review'),'com.shift6.app')
    with contextlib.redirect_stdout(io.StringIO()): qa.tap('Change review dates')
    for _ in range(7):
        try:
            field=qa.find(label,True)
            break
        except RuntimeError as error:
            if 'found 0' not in str(error): raise
            qa.nodes()
            qa.adb('shell','input','swipe','33','1800','33','600','400')
    else: raise RuntimeError('Field not reached: '+label)
    bounds=qa.bounds(field)
    qa.adb('shell','input','tap',str((bounds[0]+bounds[2])//2),str((bounds[1]+bounds[3])//2))
    assert qa.find(label,True).get('focused')=='true'
    qa.adb('shell','input','keycombination','113','29')
    qa.adb('shell','input','keyevent','67')
    assert qa.find(label,True).get('text')==''
    expected=''
    for ch in '2026-10-':
        qa.adb('shell','input','text',ch)
        expected+=ch
        assert qa.find(label,True).get('text')==expected
    with contextlib.redirect_stdout(io.StringIO()):
        qa.capture(f'coach-review-keyboard-date-{slug}-paced-font2-3f1752ed')
    print(label,qa.find(label,True).get('bounds'),flush=True)
    qa.adb('shell','input','keyevent','111')
qa.adb('shell','input','keyevent','3')
qa.adb('shell','settings','put','system','font_scale','1.0')
print('Font2 cases complete; font1 reset; visual inspection still required',flush=True)
