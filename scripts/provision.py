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
mail_secrets = ['ROSEMONT_MAILGUN_API_KEY', 'ROSEMONT_MAILGUN_DOMAIN', 'ROSEMONT_MAIL_FROM']
for name in mail_secrets:
 exists = subprocess.run(['gcloud', 'secrets', 'describe', name, '--project='+PROJECT], capture_output=True).returncode == 0
 if exists:
  cmd(['secrets', 'add-iam-policy-binding', name, '--member='+account, '--role=roles/secretmanager.secretAccessor'])
 else:
  print('MAILGUN_SETUP_REQUIRED: Create '+name+' before deployment; see README.md.')
print('Existing Rosemont Mailgun secret values preserved.')
env={'GOOGLE_CLOUD_PROJECT':PROJECT,'FIRESTORE_DATABASE':'rosemont-club','FIREBASE_TENANT_ID':'alex311-qfnem','FIREBASE_API_KEY':config['apiKey'],'FIREBASE_APP_ID':config['appId'],'APP_BASE_URL':'https://rosemont.club','APP_ADDITIONAL_ORIGINS':'https://rosemont-club-650621702399.us-east4.run.app,https://rosemont-club-wiz2ttea4a-uk.a.run.app'}
open('.env.local','w').write('\n'.join(k+'='+v for k,v in env.items())+'\n');os.chmod('.env.local',0o600)
open('deploy-env.yaml','w').write('\n'.join(k+': '+json.dumps(v) for k,v in env.items())+'\n')
print('Public Firebase configuration saved. No private credentials written to source.')
