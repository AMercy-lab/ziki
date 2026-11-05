import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import handler from './dist/api/index.mjs';
let server,base;
before(async()=>{server=createServer((req,res)=>handler(req,res).catch(e=>{res.statusCode=500;res.end(String(e));}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
const form={issueId:'demo-482',tenantId:'b',returnTo:'/ziki/app/482?comment=demo#comment-demo'};
function request(path,{mode='member',active='a',method='GET',data=form,origin=true}={}){return fetch(base+path,{method,redirect:'manual',headers:{cookie:`demo-mode=${mode}; demo-workspace=${active}`,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded',Origin:origin?base:'https://evil.test'}:{})},body:method==='POST'?new URLSearchParams(data):undefined});}
test('HTTP switch verifies membership, persists HttpOnly workspace and restores exact issue',async()=>{
 const notice=await request('/ziki/app/482?comment=demo');assert.equal(notice.status,200);assert.match(await notice.text(),/Different workspace/);
 const switched=await request('/switch',{method:'POST'});assert.equal(switched.status,303);assert.equal(switched.headers.get('location'),form.returnTo);assert.match(switched.headers.get('set-cookie'),/demo-workspace=b;.*HttpOnly/);
 for(let i=0;i<2;i++){const page=await request('/ziki/app/482?comment=demo',{active:'b'});assert.equal(page.status,200);assert.match(await page.text(),/Original destination restored/);}
});
test('expired sandbox session preserves destination through login',async()=>{
 const r=await request('/ziki/app/482?comment=demo',{mode:'guest'});assert.equal(r.status,303);assert.equal(new URL(r.headers.get('location'),base).searchParams.get('next'),'/ziki/app/482?comment=demo');
 const signedIn=await request('/login',{mode:'guest',method:'POST'});assert.equal(signedIn.headers.get('location'),form.returnTo);assert.match(signedIn.headers.get('set-cookie'),/demo-mode=member/);
});
test('unauthorized and missing issues reveal no issue preview',async()=>{
 for(const mode of ['denied','missing']){const r=await request('/ziki/app/482',{mode});assert.equal(r.status,404);const text=await r.text();assert.match(text,/Issue unavailable/);assert.doesNotMatch(text,/class="preview"/);}
});
test('failed switching leaves the active workspace unchanged with retry feedback',async()=>{
 const r=await request('/switch',{mode:'failure',method:'POST'});assert.equal(r.status,503);assert.equal(r.headers.get('set-cookie'),null);assert.match(await r.text(),/active workspace has not changed/);
});
test('cross-origin requests and forged issue identities cannot switch workspaces',async()=>{
 const csrf=await request('/switch',{method:'POST',origin:false});assert.equal(csrf.status,403);assert.equal(csrf.headers.get('set-cookie'),null);
 const forged=await request('/switch',{method:'POST',data:{...form,tenantId:'other'}});assert.equal(forged.status,404);assert.equal(forged.headers.get('set-cookie'),null);
});
test('unsafe redirect is replaced with the canonical issue',async()=>{
 const r=await request('/switch',{method:'POST',data:{...form,returnTo:'https://evil.test'}});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/ziki/app/482');
});
