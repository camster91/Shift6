import qa,xml.etree.ElementTree as ET,sys,json
mode=sys.argv[1]
assert mode in {'on','off'}
qa.nodes()
root=ET.fromstring((qa.ROOT/'latest.xml').read_bytes())
matches=[n for n in root.iter('node') if n.get('resource-id')=='com.android.settings:id/main_switch_bar' and n.get('package')=='com.android.settings' and n.get('clickable')=='true' and n.get('enabled')=='true']
assert len(matches)==1
bar=matches[0]
assert any(n.get('text')=='Use TalkBack' for n in bar.iter('node'))
switches=[n for n in bar.iter('node') if n.get('resource-id')=='android:id/switch_widget']
assert len(switches)==1
current=switches[0].get('checked')=='true'
assert current != (mode=='on'), 'Refusing duplicate setting mutation'
b=qa.bounds(bar);assert 0<=b[0]<b[2]<=1080 and 0<=b[1]<b[3]<=2337
qa.log('talkback-settings-toggle',mode,{'beforeChecked':current,'package':'com.android.settings','bounds':b})
qa.adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
print('Requested observed TalkBack switch change',mode,'confirmation/state needs fresh inspection')
