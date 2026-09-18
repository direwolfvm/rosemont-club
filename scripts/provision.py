"""Idempotent Rosemont-only cloud configuration. Never prints secret values."""
import subprocess,json,urllib.request,urllib.error,os
PROJECT='permitting-ai-helper'
def cmd(args,input=None):
 p=subprocess.run(['gcloud',*args,'--project='+PROJECT,'--quiet'],input=input,capture_output=True,text=True)
 if p.returncode:raise RuntimeError('gcloud '+args[0]+' '+args[1]+' failed')
 return p.stdout.strip()
token=cmd(['auth','print-access-token'])
def call(url,method='GET',data=None):
 return json.load(urllib.request.urlopen(urllib.request.Request(url,method=method,data=json.dumps(data).encode() if data is not None else None,headers={'Authorization':'Bearer '+token,'x-goog-user-project':PROJECT,'Content-Type':'application/json'})))
apps=call('https://firebase.googleapis.com/v1beta1/projects/'+PROJECT+'/webApps')['apps']
app=next(x for x in apps if x['displayName']=='Rosemont Club');config=call('https://firebase.googleapis.com/v1beta1/'+app['name']+'/config')
url='https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT+'/config'
current=call(url);domains=current['authorizedDomains'];new=['rosemont.club','rosemont-club-650621702399.us-east4.run.app','rosemont-club-wiz2ttea4a-uk.a.run.app']
if any(d not in domains for d in new):call(url+'?updateMask=authorizedDomains','PATCH',{'authorizedDomains':list(dict.fromkeys(domains+new))})
print('Registered web app and added Rosemont domains; existing domains preserved.')
account='serviceAccount:rosemont-runtime@'+PROJECT+'.iam.gserviceaccount.com'
cmd(['projects','add-iam-policy-binding',PROJECT,'--member='+account,'--role=roles/datastore.user','--condition=expression=resource.name=="projects/'+PROJECT+'/databases/rosemont-club",title=rosemont-database'])
cmd(['projects','add-iam-policy-binding',PROJECT,'--member='+account,'--role=roles/firebaseauth.viewer','--condition=None'])
tenant_url='https://identitytoolkit.googleapis.com/admin/v2/projects/'+PROJECT+'/tenants/alex311-qfnem'
policy=call(tenant_url+':getIamPolicy','POST',{'options':{'requestedPolicyVersion':3}})
bindings=policy.setdefault('bindings',[])
role=next((b for b in bindings if b['role']=='roles/identityplatform.viewer' and 'condition' not in b),None)
if role is None:
 role={'role':'roles/identityplatform.viewer','members':[]};bindings.append(role)
if account not in role['members']:
 role['members'].append(account);call(tenant_url+':setIamPolicy','POST',{'policy':policy})
print('Runtime permissions configured.')
# Preserve existing Rosemont credentials; never copy another application's key.
# ROSEMONT_ADDRESS_KEY is the AES-256 key (32 random bytes, base64) for the opt-in remembered addresses.
mail_secrets = ['ROSEMONT_MAILGUN_API_KEY', 'ROSEMONT_MAILGUN_DOMAIN', 'ROSEMONT_MAIL_FROM', 'ROSEMONT_ADDRESS_KEY']
for name in mail_secrets:
 exists = subprocess.run(['gcloud', 'secrets', 'describe', name, '--project='+PROJECT], capture_output=True).returncode == 0
 if exists:
  cmd(['secrets', 'add-iam-policy-binding', name, '--member='+account, '--role=roles/secretmanager.secretAccessor'])
 else:
  print('SECRET_SETUP_REQUIRED: Create '+name+' before deployment; see README.md.')
print('Existing Rosemont Mailgun secret values preserved.')
# Native iOS client: register the Firebase iOS app once and publish its public values through /api/config.
ios_apps=call('https://firebase.googleapis.com/v1beta1/projects/'+PROJECT+'/iosApps').get('apps',[])
ios=next((a for a in ios_apps if a.get('bundleId')=='club.rosemont.ios'),None)
if ios is None:
 call('https://firebase.googleapis.com/v1beta1/projects/'+PROJECT+'/iosApps','POST',{'bundleId':'club.rosemont.ios','displayName':'Rosemont Club iOS'})
 print('Registered the Firebase iOS app; rerun once the operation completes to publish its values.')
 ios_cfg={}
else:
 import base64,re
 plist=base64.b64decode(call('https://firebase.googleapis.com/v1beta1/'+ios['name']+'/config')['configFileContents']).decode()
 ios_cfg={k:(re.search('<key>'+k+'</key>\\s*<string>([^<]*)</string>',plist) or [None,''])[1] for k in ['API_KEY','GOOGLE_APP_ID']}
# Everything written below is public client configuration (Firebase web and iOS
# client keys and app IDs are delivered to every browser and app). Private
# values are never written here; they live in Secret Manager.
env={'GOOGLE_CLOUD_PROJECT':PROJECT,'FIRESTORE_DATABASE':'rosemont-club','FIREBASE_TENANT_ID':'alex311-qfnem','FIREBASE_API_KEY':config['apiKey'],'FIREBASE_APP_ID':config['appId'],'FIREBASE_IOS_API_KEY':ios_cfg.get('API_KEY',''),'FIREBASE_IOS_APP_ID':ios_cfg.get('GOOGLE_APP_ID',''),'IOS_MINIMUM_VERSION':'1.0.0','APPLE_TEAM_ID':os.environ.get('APPLE_TEAM_ID',''),'APPLE_APP_STORE_ID':os.environ.get('APPLE_APP_STORE_ID',''),'APP_BASE_URL':'https://rosemont.club','APP_ADDITIONAL_ORIGINS':'https://rosemont-club-650621702399.us-east4.run.app,https://rosemont-club-wiz2ttea4a-uk.a.run.app'}
open('.env.local','w').write('\n'.join(k+'='+v for k,v in env.items())+'\n');os.chmod('.env.local',0o600)
open('deploy-env.yaml','w').write('\n'.join(k+': '+json.dumps(v) for k,v in env.items())+'\n')
print('Public Firebase configuration saved. No private credentials written to source.')
