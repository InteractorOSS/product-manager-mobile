// Copyright (c) 2026 Interactor, Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { ACCOUNT_SERVER_URL, INTERACTOR_CLIENT_ID } from "@/src/lib/config";

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
  return AuthSession.useAuthRequest(
    {
      clientId: INTERACTOR_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri,
      usePKCE: true,
    },
    DISCOVERY,
  );
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
): Promise<string> {
  const redirectUri = makeRedirectUri();
  const res = await AuthSession.exchangeCodeAsync(
    {
      clientId: INTERACTOR_CLIENT_ID,
      code,
      redirectUri,
      extraParams: { code_verifier: codeVerifier },
    },
    DISCOVERY,
  );
  // id_token is the user JWT we exchange for a pm_mobile_* token
  const idToken = res.idToken ?? res.accessToken;
  if (!idToken) throw new Error("No token in OIDC response");
  return idToken;
}
