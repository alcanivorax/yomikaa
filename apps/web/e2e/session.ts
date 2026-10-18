import { expect, type APIRequestContext } from "@playwright/test";

export const OWNER_CREDENTIALS = {
  username: process.env.E2E_OWNER_USERNAME ?? "owner",
  password: process.env.E2E_OWNER_PASSWORD ?? "owner",
};

/** Signs the given request context in by calling the web app's /api/login. */
export async function signIn(
  request: APIRequestContext,
  webUrl: string,
): Promise<void> {
  const res = await request.post(webUrl + "/api/login", {
    data: OWNER_CREDENTIALS,
  });
  expect(res.ok()).toBeTruthy();
}
