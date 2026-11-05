import {resolveIssueWorkspaceSwitch} from '../shared/issue-workspace-switch.mjs';
import {issueSwitchDestination} from '../shared/issue-switch-destination.mjs';
import {render} from '../render.mjs';
const canonical='/ziki/app/482';
const target=canonical+'?comment=demo#comment-demo';
export default async function handler(req,res){
 const host=req.headers.host||'localhost';const protocol=host.startsWith('127.0.0.1')||host.startsWith('localhost')?'http':'https';const origin=protocol+'://'+host;
 const url=new URL(req.url,origin);const cookies=Object.fromEntries((req.headers.cookie||'').split(';').map(c=>c.trim().split('=')));
 const mode=cookies['demo-mode']||'member';const user=mode==='guest'?null:mode==='denied'?'visitor':'member';const active=cookies['demo-workspace']==='b'?'Ziki':'Design';
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
 function cookie(name,value){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${protocol==='https'?'; Secure':''}`;}
 function redirect(path,status=303){res.statusCode=status;res.setHeader('Location',path);res.end();}
 function page(screen,status=200,error='',destination=target){res.statusCode=status;res.setHeader('Content-Type','text/html; charset=utf-8');res.end(render({screen,active,destination,error}));}
 if(req.method==='POST'){
  if(req.headers.origin!==origin){res.statusCode=403;return res.end('Origin denied');}
  let text='';for await(const chunk of req){text+=chunk;if(text.length>8192){res.statusCode=413;return res.end('Form too large');}}
  const form=new URLSearchParams(text);const returnTo=issueSwitchDestination(canonical,form.get('returnTo'));
  if(url.pathname==='/login'){res.setHeader('Set-Cookie',cookie('demo-mode','member'));return redirect(returnTo);}
  if(url.pathname!=='/switch')return page('unavailable',404);
  if(!user)return redirect('/login?next='+encodeURIComponent(returnTo));
  const db={bug:{findFirst:async({where})=>user==='member'&&mode!=='missing'&&where.id==='demo-482'&&where.tenantId==='b'&&where.tenant.memberships.some.userId===user?{tenantId:'b',number:482,project:{slug:'app',tenant:{slug:'ziki'}}}:null}};
  const result=await resolveIssueWorkspaceSwitch(db,user,{issueId:form.get('issueId'),tenantId:form.get('tenantId'),returnTo});
  if(!result)return page('unavailable',404);
  if(mode==='failure')return page('notice',503,"We couldn't switch workspaces. Your active workspace has not changed. Choose Member flow to retry.",returnTo);
  res.setHeader('Set-Cookie',cookie('demo-workspace',result.tenantId));return redirect(result.destination);
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.statusCode=405;res.setHeader('Allow','GET, HEAD, POST');return res.end();}
 if(url.pathname==='/scenario'){
  const selected=url.searchParams.get('mode');if(!['member','guest','denied','missing','failure'].includes(selected))return page('unavailable',404);
  res.setHeader('Set-Cookie',[cookie('demo-mode',selected),cookie('demo-workspace','a')]);return redirect(target);
 }
 if(url.pathname==='/')return redirect(target,302);
 if(url.pathname==='/home')return page('home');
 if(url.pathname==='/login')return page('login',200,'',issueSwitchDestination(canonical,url.searchParams.get('next')));
 if(url.pathname!==canonical)return page('unavailable',404);
 const destination=canonical+url.search;
 if(!user)return redirect('/login?next='+encodeURIComponent(destination));
 if(user!=='member'||mode==='missing')return page('unavailable',404);
 return page(active==='Ziki'?'issue':'notice',200,'',destination);
}
