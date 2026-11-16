import { MessageCircleMore } from "lucide-react";
import type { ToolManifest } from "../registry";
import { CoachingApp } from "./routes/App";

export const coachingManifest: ToolManifest = {
  key: "coaching",
  name: "Chat",
  description: "Your private thread with the team, plus your coaching tasks.",
  icon: MessageCircleMore,
  navEntry: {
    label: "Chat",
    icon: MessageCircleMore,
    navGroup: "resources",
  },
  Component: CoachingApp,
};
