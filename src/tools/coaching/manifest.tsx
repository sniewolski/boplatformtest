import { MessagesSquare } from "lucide-react";
import type { ToolManifest } from "../registry";
import { CoachingApp } from "./routes/App";

export const coachingManifest: ToolManifest = {
  key: "coaching",
  name: "Coaching",
  description: "Your private thread with the team, plus your coaching tasks.",
  icon: MessagesSquare,
  navEntry: {
    label: "Coaching",
    icon: MessagesSquare,
    navGroup: "resources",
  },
  Component: CoachingApp,
};
