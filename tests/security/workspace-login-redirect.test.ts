import {beforeEach,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const m=vi.hoisted(()=>({handler:null as null|((req:NextRequest & {auth?:{user:{id:string}}})=>Response)}));
vi.mock("next-auth",()=>({default:()=>({auth:(handler:NonNullable<typeof m.handler>)=>{m.handler=handler;return handler;}})}));
vi.mock("@/auth.config",()=>({default:{}}));
import "@/middleware";
beforeEach(()=>{expect(m.handler).not.toBeNull();});
it("retains issue query parameters through login",()=>{
 const r=m.handler!(new NextRequest("https://ziki.dev/ziki/app/482?comment=c42&view=all"));
 const to=new URL(r.headers.get("location")!);expect(to.pathname).toBe("/login");expect(to.searchParams.get("callbackUrl")).toBe("/ziki/app/482?comment=c42&view=all");
});
it.each(["https://evil.test","//evil.test","/login?callbackUrl=/login"])("rejects unsafe or looping callbacks for an existing session: %s",value=>{
 const req=Object.assign(new NextRequest("https://ziki.dev/login?callbackUrl="+encodeURIComponent(value)),{auth:{user:{id:"u"}}});
 expect(new URL(m.handler!(req).headers.get("location")!).pathname).toBe("/home");
});
it("returns an already signed-in user to their original issue",()=>{
 const req=Object.assign(new NextRequest("https://ziki.dev/login?callbackUrl=%2Fziki%2Fapp%2F482%3Fcomment%3Dc42"),{auth:{user:{id:"u"}}});
 expect(m.handler!(req).headers.get("location")).toBe("https://ziki.dev/ziki/app/482?comment=c42");
});
