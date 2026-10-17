import { Composition } from "remotion";
import { FPS, SawaDemo, TOTAL_SEC } from "./SawaDemo";

export function Root() {
  return (
    <Composition
      id="SawaDemo"
      component={SawaDemo}
      durationInFrames={Math.round(TOTAL_SEC * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
