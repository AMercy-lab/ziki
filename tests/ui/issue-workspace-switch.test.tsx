// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
vi.mock("@/app/(app)/tenants/issue-switch-action",()=>({switchIssueWorkspaceAction:vi.fn()}));
import {IssueTenantSwitch} from "@/components/issue-tenant-hint";
afterEach(cleanup);
it("shows member-scoped workspace names and the exact issue with actionable controls",()=>{
 render(<IssueTenantSwitch issueId="internal" currentWorkspace="Design" destination="/engineering/app/73?comment=c1" tenant={{id:"eng",name:"Engineering",slug:"engineering",issue:{number:73,title:"Preserve shared links",substatus:"open",projectName:"Web"}}}/>);
 expect(screen.getByRole("heading",{name:"This issue is in the Engineering workspace"})).toBeInTheDocument();
 expect(screen.getByText("Preserve shared links")).toBeInTheDocument();
 expect(screen.getByRole("button",{name:/Switch to Engineering and open #73/})).toBeEnabled();
 expect(screen.getByRole("link",{name:"Stay in Design"})).toHaveAttribute("href","/home");
 expect(document.querySelector('input[name="returnTo"]')).toHaveValue("/engineering/app/73?comment=c1");
});
