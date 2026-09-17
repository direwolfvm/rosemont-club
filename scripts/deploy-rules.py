import subprocess,json,urllib.request,urllib.error
project='permitting-ai-helper'
token=subprocess.check_output(['gcloud','auth','print-access-token'],text=True).strip()
base='https://firebaserules.googleapis.com/v1/projects/'+project
headers={'Authorization':'Bearer '+token,'Content-Type':'application/json','x-goog-user-project':project}
def call(url,method,data):return json.load(urllib.request.urlopen(urllib.request.Request(url,method=method,headers=headers,data=json.dumps(data).encode())))
rules=call(base+'/rulesets','POST',{'source':{'files':[{'name':'firestore.rules','content':open('firestore.rules').read()}]}})
release={'name':'projects/'+project+'/releases/cloud.firestore/rosemont-club','rulesetName':rules['name']}
try:call(base+'/releases','POST',release)
except urllib.error.HTTPError as e:
 if e.code!=409:raise
 call('https://firebaserules.googleapis.com/v1/'+release['name'],'PATCH',{'release':release,'updateMask':'rulesetName'})
print('Deny-all browser rules deployed only to rosemont-club.')
