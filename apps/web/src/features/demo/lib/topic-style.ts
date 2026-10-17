import type { Interest } from "@sawa/shared";
import type { CSSProperties } from "react";
import { TOPIC_COLORS } from "@/features/map";

/**
 * CSS variables of a topic for both themes; with the `temat` class the element reads
 * `--temat`, `--temat-tlo` and `--temat-na` for the current theme (globals.css).
 */
export function topicStyle(topic: Interest): CSSProperties {
  const light = TOPIC_COLORS.light[topic];
  const dark = TOPIC_COLORS.dark[topic];
  return {
    "--temat-jasny": light.color,
    "--temat-tlo-jasny": light.tint,
    "--temat-na-jasny": light.onColor,
    "--temat-ciemny": dark.color,
    "--temat-tlo-ciemny": dark.tint,
    "--temat-na-ciemny": dark.onColor,
  } as CSSProperties;
}
