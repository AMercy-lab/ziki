import {beforeEach, expect, it, vi} from "vitest";
import {issueSwitchDestination} from "@/lib/issue-switch-destination";
import {resolveIssueWorkspaceSwitch} from "@/lib/issue-workspace-switch";
import {issueTenantHintFor} from "@/lib/issue-tenant-hint";
const canonical = "/ziki/app/482";
it.each(["https://evil.test", "//evil.test", "/\\evil.test", "/login", "/projects/app/open?next=/ziki/app/482", "/zedu/app/482", "/ziki/app/483", "/ziki/app/482\n", null])("rejects an unsafe or different destination: %s", value => {
 expect(issueSwitchDestination(canonical,value)).toBe(canonical);
});
it("retains the original issue query and comment anchor",()=>{
 expect(issueSwitchDestination(canonical,canonical+"?comment=c42&view=all#comment-c42")).toBe(canonical+"?comment=c42&view=all#comment-c42");
});
const findFirst=vi.fn();
const db={bug:{findFirst}} as unknown as Parameters<typeof resolveIssueWorkspaceSwitch>[0];
beforeEach(()=>{vi.clearAllMocks();findFirst.mockResolvedValue({tenantId:"b",number:482,project:{slug:"app",tenant:{slug:"ziki"}}});});
it("checks issue, owner workspace, current membership and archives in one query",async()=>{
 expect(await resolveIssueWorkspaceSwitch(db,"user",{issueId:"issue",tenantId:"b",returnTo:canonical+"?comment=c42"})).toEqual({tenantId:"b",destination:canonical+"?comment=c42"});
 expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{id:"issue",tenantId:"b",isDeleted:false,project:{archivedAt:null},tenant:{archivedAt:null,memberships:{some:{userId:"user"}}}}}));
});
it("does not switch missing, deleted, archived, wrong-workspace or inaccessible issues",async()=>{
 findFirst.mockResolvedValue(null);
 expect(await resolveIssueWorkspaceSwitch(db,"user",{issueId:"missing",tenantId:"b"})).toBeNull();
});
it("rejects malformed identifiers before accessing the database",async()=>{
 expect(await resolveIssueWorkspaceSwitch(db,"user",{issueId:"",tenantId:"b"})).toBeNull();expect(findFirst).not.toHaveBeenCalled();
});
it("reveals preview data only after an active membership check",async()=>{
 const membership=vi.fn().mockResolvedValue(null);
 const hints={bug:{findUnique:vi.fn().mockResolvedValue({tenantId:"b",number:482,title:"Private",substatus:"open",project:{name:"App"}})},membership:{findFirst:membership}} as unknown as Parameters<typeof issueTenantHintFor>[0];
 expect(await issueTenantHintFor(hints,{userId:"user",activeTenantId:"a",issueId:"issue"})).toBeNull();
 expect(membership).toHaveBeenCalledWith(expect.objectContaining({where:{userId:"user",tenantId:"b",tenant:{archivedAt:null}}}));
 membership.mockResolvedValue({tenant:{id:"b",name:"Ziki",slug:"ziki"}});
 expect(await issueTenantHintFor(hints,{userId:"user",activeTenantId:"a",issueId:"issue"})).toMatchObject({name:"Ziki",issue:{number:482,title:"Private",projectName:"App"}});
});
