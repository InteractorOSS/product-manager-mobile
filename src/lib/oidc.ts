// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { ACCOUNT_SERVER_URL, INTERACTOR_CLIENT_ID, INTERACTOR_CLIENT_SECRET } from "@/src/lib/config";

WebBrowser.maybeCompleteAuthSession();

const DISCOVERY = {
  authorizationEndpoint: `${ACCOUNT_SERVER_URL}/oauth/authorize`,
  tokenEndpoint: `${ACCOUNT_SERVER_URL}/oauth/token`,
};

export function makeRedirectUri() {
  return AuthSession.makeRedirectUri({
    scheme: "buildapp",
    path: "auth/callback",
  });
}

export function useOidcRequest() {
  const redirectUri = makeRedirectUri();
  console.log("[oidc] redirect URI:", redirectUri);
  return AuthSession.useAuthRequest(
    {
      clientId: INTERACTOR_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri,
      usePKCE: false,
    },
    DISCOVERY,
  );
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  console.log("[oidc] exchanging code with redirectUri:", redirectUri);
  const res = await AuthSession.exchangeCodeAsync(
    {
      clientId: INTERACTOR_CLIENT_ID,
      clientSecret: INTERACTOR_CLIENT_SECRET || undefined,
      code,
      redirectUri,
    },
    DISCOVERY,
  );
  // id_token is the user JWT we exchange for a pm_mobile_* token
  const idToken = res.idToken ?? res.accessToken;
  if (!idToken) throw new Error("No token in OIDC response");
  return idToken;
}
