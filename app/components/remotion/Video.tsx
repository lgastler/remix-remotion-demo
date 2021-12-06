import { Composition } from "remotion";
import { GithubDemo } from "./GitHub";

export const RemotionVideo: React.FC = () => {
  return (
    <>
      <Composition
        id="GitHub"
        component={GithubDemo}
        durationInFrames={60}
        fps={24}
        width={1920 / 2}
        height={1080 / 2}
      />
    </>
  );
};
