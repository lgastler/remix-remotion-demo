import {
  MetaFunction,
  LoaderFunction,
  Form,
  useActionData,
  ActionFunction,
  LinksFunction,
  useTransition,
} from "remix";
import { useLoaderData, json, Link } from "remix";
import { cache } from "~/github-cache";
import indexStylesUrl from "~/styles/index.css";

type IndexData = {};
type ActionData = {
  username?: string;
  error?: string;
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: indexStylesUrl }];
};

export let action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const username = formData.get("githubUsername");

  const cacheUser = cache.find((user) => user.login === username);

  if (cacheUser) {
    return {
      username: cacheUser.login,
    };
  }

  const checkUsernameRequest = await fetch(
    "https://api.github.com/users/" + username
  );

  const validUsername = (await checkUsernameRequest.status) === 200;

  if (checkUsernameRequest.status === 403) {
    return {
      error:
        "Github API rate limit exceeded. Please try on oft the Remix Team Members (those are cached) or try again later.",
    };
  }

  if (!validUsername) {
    return {
      error: "Not a valid GitHub username",
    };
  }

  return {
    username,
  };
};

// https://remix.run/api/conventions#meta
export let meta: MetaFunction = () => {
  return {
    title: "Remix & Remotion Demo",
    description: "Using remotion.dev on a Remix Resource Route!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  let data = useLoaderData<IndexData>();
  let actionData = useActionData<ActionData>();
  let transition = useTransition();

  return (
    <div className="remix__page">
      <main>
        <h2>Welcome to a simple Remix & Remotion Demo!</h2>
        <p>
          <a href="https://twitter.com/kentcdodds">@kentcdodds</a> mentioned
          yesterday in the{" "}
          <a href="https://discord.com/invite/remix">Remix Run Discord</a> that
          it would be cool to combine{" "}
          <a href="https://remotion.dev">Remotion</a> with a{" "}
          <a href="https://remix.run/docs/en/v1/guides/resource-routes#creating-resource-routes">
            Remix resource route
          </a>{" "}
          to render a dynamic video. I thought so too, so I put together this
          quick demo. Feel free to check it out. <br />
          <br />
          Also check out the{" "}
          <a href="https://remotion.dev/docs">Remotion Docs</a> because I
          stitched this together from a bunch of their example code.
        </p>
        <p>
          You can try the demo at the bottom with your GitHub username. Or go
          directly to <code>/api/video/:yourGitHubUsername</code> to hit the
          resource route directly.
        </p>
        <div className="video__container">
          <div>
            <h3>Render a custom video with your GitHub Profile</h3>
            <Form method="post" className="remix__form">
              <input
                type="text"
                name="githubUsername"
                placeholder="Your GitHub Username"
              />
              <button>Create Video</button>
              {actionData?.error ? <p>{actionData.error}</p> : null}
            </Form>
            {
              <p>
                {transition.state === "submitting"
                  ? "Checking username..."
                  : transition.state === "loading"
                  ? "Generating your video ..."
                  : null}
              </p>
            }
          </div>
          <div>
            <h3>Or select one of the Remix Team members</h3>
            <ul className="grid">
              {cache
                .filter((user) => user.login !== "lgastler")
                .map((user) => (
                  <li key={user.login}>
                    <Form method="post">
                      <input
                        type="hidden"
                        name="githubUsername"
                        value={user.login}
                      />
                      <button>{user.login}</button>
                    </Form>
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <div>
          {actionData?.username ? (
            <video
              width={1920 / 2}
              height={1080 / 2}
              src={`/api/video/${actionData?.username}`}
              autoPlay
              muted
              controls
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
