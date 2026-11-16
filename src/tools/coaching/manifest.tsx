import { Handshake } from "lucide-react";
import type { ToolManifest } from "../registry";
import { CoachingApp } from "./routes/App";

export const coachingManifest: ToolManifest = {
  key: "coaching",
  name: "Coaching",
  description: "Your private thread with the team, plus your coaching tasks.",
  icon: Handshake,
  navEntry: {
    label: "Coaching",
    icon: Handshake,
    navGroup: "resources",
  },
  Component: CoachingApp,
};
