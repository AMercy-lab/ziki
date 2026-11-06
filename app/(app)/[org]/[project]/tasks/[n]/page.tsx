import { redirect } from "next/navigation";

/** Old Ziki task links (#earnings): Earn is part of Ziki now, so they open Earn, where the projects to earn on are. */
export default function OldZikiTaskPage() {
  redirect("/earn");
}
