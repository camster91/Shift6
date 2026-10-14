import qa,json,shlex,time
label='Review or correct the spoken set entry'
n=qa.find(label,True); assert n.get('focused')=='true' and n.get('text')=='e.g. thirty seconds'
steps=[]
for part,expected in [('26','26'),(' seconds','26 seconds'),(', RPE seven','26 seconds, RPE seven')]:
 qa.adb('shell','input','text',shlex.quote(part.replace(' ','%s')))
 n=qa.find(label,True); steps.append({'expected':expected,'actual':n.get('text'),'focused':n.get('focused')}); assert n.get('text')==expected and n.get('focused')=='true'
qa.capture('coach-review-actual-labels-voice-paced-font2.0-86a26c44')
(qa.ROOT/'coach-review-actual-labels-voice-paced-font2.0-86a26c44-receipt.json').write_text(json.dumps({'sourceCommit':'86a26c44','fontScale':2.0,'tutorialDismissedViaObservedCancel':True,'exactSteps':steps,'noReviewApplyComplete':True},indent=2)+'\n')
