// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NewMarketingTaskForm } from "@/components/marketing/tasks/new-marketing-task-form";

afterEach(() => cleanup());

describe("new marketing task form", () => {
  it("shows only the requested fields and keeps points within the selected type's range", () => {
    render(<NewMarketingTaskForm projectId="project-1" />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Task type")).toBeInTheDocument();
    expect(screen.getByLabelText("Rationale")).toBeInTheDocument();
    expect(screen.getByLabelText("Points")).toHaveAttribute("min", "1");
    expect(screen.getByLabelText("Points")).toHaveAttribute("max", "20");
    expect(screen.queryByLabelText(/priority|focus alignment|screenshots|assigned review squad/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "25" } });
    expect(screen.getByLabelText("Points")).toHaveValue(25);
    expect(screen.getByLabelText("Points")).toBeInvalid();
  });

  it("explains that local task-type data is preview-only when submitted", () => {
    render(<NewMarketingTaskForm projectId="project-1" />);
    fireEvent.submit(screen.getByRole("button", { name: "Propose task" }).closest("form")!);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Task types and points are preview data until M-API-7 is merged.",
    );
  });
});
