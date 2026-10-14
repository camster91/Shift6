import qa,json,subprocess,sys
qa.fill('QA Hold set 1 duration in seconds','14');qa.tap('Complete QA Hold set 1')
subprocess.run([sys.executable,str(qa.ROOT/'capture-default-observer-86a26c44.py'),'coach-review-rest-running-0f2f44ed'],check=True)
qa.tap('Skip rest')
subprocess.run([sys.executable,str(qa.ROOT/'capture-default-observer-86a26c44.py'),'coach-review-rest-skipped-0f2f44ed'],check=True)
d=json.loads((qa.ROOT/'coach-review-rest-skipped-0f2f44ed.json').read_bytes())
assert not any((n.get('text')=='REST TIMER' or n.get('contentDescription')=='Skip rest') and n.get('visible') for n in d['activeWindowNodes'])
print('Skip rest removed live timer and button; saved count is 1 of 5')
