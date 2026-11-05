import {beforeEach,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({first:vi.fn(),many:vi.fn(),scope:vi.fn(),session:vi.fn()}));
vi.mock("react",()=>({cache:(f:unknown)=>f}));
vi.mock("@/lib/prisma",()=>({prisma:{bug:{findFirst:m.first,findMany:m.many}}}));
vi.mock("@/lib/tenant-viewer",()=>({viewerBugScope:m.scope}));
vi.mock("@/lib/session-user",()=>({resolveSessionUserId:m.session}));
import {findProjectIssue} from "@/lib/project-issue";
const active={id:"a-issue",number:482,isDeleted:false,project:{slug:"app",tenant:{slug:"zedu"}}};
beforeEach(()=>{vi.resetAllMocks();m.scope.mockResolvedValue({tenantId:"a"});m.session.mockResolvedValue({userId:"u"});});
it("prioritizes the exact shared issue in another workspace despite a number collision",async()=>{
 m.first.mockResolvedValueOnce(active).mockResolvedValueOnce({id:"b-issue"});
 expect(await findProjectIssue("ziki","app",482)).toEqual({kind:"elsewhere",issueId:"b-issue"});
 expect(m.first.mock.calls[1][0].where.tenant).toEqual({archivedAt:null,memberships:{some:{userId:"u"}}});
});
it("does not redirect an inaccessible shared link to an unrelated same-numbered issue",async()=>{
 m.first.mockResolvedValueOnce(active).mockResolvedValueOnce(null);expect(await findProjectIssue("private","app",482)).toBeNull();
});
it("still resolves an issue moved between projects in the same workspace",async()=>{
 m.first.mockResolvedValueOnce(active).mockResolvedValueOnce(null);expect(await findProjectIssue("zedu","old-app",482)).toMatchObject({kind:"moved",issue:{id:"a-issue"}});
});
it("returns the original issue after switching and on refresh/new tabs",async()=>{
 const target={...active,id:"b-issue",project:{slug:"app",tenant:{slug:"ziki"}}};m.scope.mockResolvedValue({tenantId:"b"});m.first.mockResolvedValue(target);
 expect(await findProjectIssue("ziki","app",482)).toMatchObject({kind:"found",issue:{id:"b-issue"}});expect(m.first).toHaveBeenCalledTimes(1);
});
it("preserves the existing deleted-issue Restore page in the active workspace",async()=>{
 const deleted={...active,isDeleted:true};
 m.first.mockImplementation(async({where})=>where.tenantId==="a"&&where.isDeleted!==false?deleted:null);
 expect(await findProjectIssue("zedu","app",482)).toMatchObject({kind:"found",issue:{id:"a-issue",isDeleted:true}});
});
