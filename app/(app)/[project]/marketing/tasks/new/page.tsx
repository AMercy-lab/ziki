import { NewMarketingTaskForm } from "@/components/marketing/tasks/new-marketing-task-form";
import { marketingPath } from "@/lib/project-paths";
import { requireProject } from "@/lib/project-route";

export const metadata = { title: "Propose a marketing task" };

export default async function NewMarketingTaskPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: slug } = await params;
  const context = await requireProject(slug, marketingPath(slug, "tasks/new"));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <header className="space-y-2">
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-zk-text">
          Propose a marketing task
        </h1>
      </header>
      <NewMarketingTaskForm projectId={context.project.id} />
    </div>
  );
}
