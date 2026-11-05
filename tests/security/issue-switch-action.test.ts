import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({auth:vi.fn(),user:vi.fn(),resolve:vi.fn(),cookie:vi.fn(),budget:vi.fn(),revalidate:vi.fn(),redirect:vi.fn()}));
vi.mock("@/auth",()=>({auth:m.auth}));
vi.mock("@/lib/auth-helpers",()=>({requireUser:m.user}));
vi.mock("@/lib/prisma",()=>({prisma:{}}));
vi.mock("@/lib/issue-workspace-switch",()=>({resolveIssueWorkspaceSwitch:m.resolve}));
vi.mock("@/lib/tenants",()=>({setActiveTenantCookie:m.cookie}));
vi.mock("@/lib/rate-limit",()=>({consumeRateLimit:m.budget}));
vi.mock("next/cache",()=>({revalidatePath:m.revalidate}));
vi.mock("next/navigation",()=>({redirect:m.redirect}));
import {switchIssueWorkspaceAction} from "@/app/(app)/tenants/issue-switch-action";
function form(){const f=new FormData();f.set("issueId","issue");f.set("tenantId","b");f.set("returnTo","/ziki/app/482?comment=c42#comment-c42");return f;}
beforeEach(()=>{vi.resetAllMocks();m.auth.mockResolvedValue({user:{id:"u"}});m.user.mockResolvedValue({id:"u"});m.budget.mockResolvedValue({allowed:true});m.resolve.mockResolvedValue({tenantId:"b",destination:"/ziki/app/482?comment=c42#comment-c42"});m.redirect.mockImplementation(url=>{throw Error("redirect:"+url);});});
it("verifies access before setting the cookie and redirects to the exact issue",async()=>{
 await expect(switchIssueWorkspaceAction({},form())).rejects.toThrow("redirect:/ziki/app/482?comment=c42#comment-c42");
 expect(m.resolve.mock.invocationCallOrder[0]).toBeLessThan(m.cookie.mock.invocationCallOrder[0]);
 expect(m.cookie).toHaveBeenCalledWith("b");expect(m.revalidate).toHaveBeenCalledWith("/","layout");
});
it("retains the original issue through expired-session login",async()=>{
 m.auth.mockResolvedValue(null);await expect(switchIssueWorkspaceAction({},form())).rejects.toThrow("redirect:/login?callbackUrl=%2Fziki%2Fapp%2F482%3Fcomment%3Dc42%23comment-c42");expect(m.cookie).not.toHaveBeenCalled();
});
it("does not mutate the workspace when membership or the issue disappeared",async()=>{
 m.resolve.mockResolvedValue(null);expect(await switchIssueWorkspaceAction({},form())).toHaveProperty("error");expect(m.cookie).not.toHaveBeenCalled();expect(m.redirect).not.toHaveBeenCalled();
});
it("returns a retryable error when switching fails",async()=>{m.cookie.mockRejectedValue(Error("storage unavailable"));expect(await switchIssueWorkspaceAction({},form())).toEqual({error:"We couldn't switch workspaces. Please try again."});expect(m.redirect).not.toHaveBeenCalled();});
it("rate limits repeated switching without changing workspace",async()=>{m.budget.mockResolvedValue({allowed:false});expect(await switchIssueWorkspaceAction({},form())).toHaveProperty("error");expect(m.resolve).not.toHaveBeenCalled();expect(m.cookie).not.toHaveBeenCalled();});
