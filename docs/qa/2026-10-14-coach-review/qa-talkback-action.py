import qa,sys
mode,label=sys.argv[1:3]
assert mode in {'focus','activate'}
service=qa.adb('shell','settings','get','secure','enabled_accessibility_services').decode().strip()
assert service=='com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService'
if label=='deny-accessibility-notifications':
    ns=qa.nodes()
    assert any(n.get('text')=='Allow Android Accessibility Suite to send you notifications?' and n.get('package')=='com.google.android.permissioncontroller' for n in ns)
    choices=[n for n in ns if n.get('class')=='android.widget.Button' and n.get('text','').startswith('Don') and n.get('package')=='com.google.android.permissioncontroller']
    assert len(choices)==1
    label=choices[0].get('text')
n=qa.find(label)
b=qa.bounds(n);assert 0<=b[0]<b[2]<=1080 and 0<=b[1]<b[3]<=2337
x,y=(b[0]+b[2])//2,(b[1]+b[3])//2
qa.log('talkback-'+mode,label,n.attrib)
if mode=='focus': qa.adb('shell','input','tap',str(x),str(y))
else:
    # A pair of taps through the active touch-exploration service, not a bypass
    # accessibility click action. Selection must first be visually inspected.
    qa.adb('shell',f'input tap {x} {y}; input tap {x} {y}')
print('TalkBack',mode,'sent for observed',label,'fresh state required')
