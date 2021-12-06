import fs from "fs";
import os from "os";
import path from "path";
import { bundle } from "@remotion/bundler";
import {
  getCompositions,
  renderFrames,
  stitchFramesToVideo,
} from "@remotion/renderer";

import type { LoaderFunction } from "remix";
import { cache } from "~/github-cache";

const compositionId = "GitHub";

export const loader: LoaderFunction = async ({ params, request }) => {
  const { name } = params;

  console.log("Incoming request for: ", name);

  try {
    let userData = cache.find((user) => user.login === name);

    if (!userData) {
      const gitHubResponse = await fetch(
        `https://api.github.com/users/${name}`
      );

      if (gitHubResponse.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded please try again later"
        );
      }

      if (gitHubResponse.status !== 200) {
        throw new Error(
          `Could not find GitHub user with name ${name}. \nMake sure you have the right name in the url!`
        );
      }

      const githubJson = await gitHubResponse.json();

      userData = {
        avatar_url: githubJson.avatar_url,
        login: githubJson.login,
        followers: githubJson.followers,
      };
    }

    const videoProps = {
      data: userData,
    };
    const bundled = await bundle(path.join(__dirname, "../app/video.tsx"));
    const comps = await getCompositions(bundled, {
      inputProps: videoProps,
    });

    const video = comps.find((c) => c.id === compositionId);
    if (!video) {
      throw new Error(`No video called ${compositionId}`);
    }

    const tmpDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "remotion-")
    );
    const { assetsInfo } = await renderFrames({
      config: video,
      webpackBundle: bundled,
      onStart: () => console.log("Rendering frames..."),
      onFrameUpdate: (f) => {
        if (f % 10 === 0) {
          console.log(`Rendered frame ${f}`);
        }
      },
      parallelism: null,
      outputDir: tmpDir,
      inputProps: videoProps,
      compositionId,
      imageFormat: "jpeg",
    });

    const finalOutput = path.join(tmpDir, "out.mp4");
    await stitchFramesToVideo({
      dir: tmpDir,
      force: true,
      fps: video.fps,
      height: video.height,
      width: video.width,
      outputLocation: finalOutput,
      imageFormat: "jpeg",
      assetsInfo,
    });
    console.log(finalOutput);
    console.log("Video rendered and sent!");

    const fileStats = fs.statSync(finalOutput);
    const readstream = fs.createReadStream(
      finalOutput
    ) as unknown as ReadableStream;

    const response = new Response(readstream, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": fileStats.size.toString(),
        "Cache-Control": "private, max-age=3600",
      },
    });

    return response;
  } catch (err: unknown) {
    console.error(err);
    throw new Response((err as Error).message ?? "Unknown Error", {
      status: 500,
    });
  }
};
