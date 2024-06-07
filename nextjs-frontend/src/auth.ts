import "next-auth/jwt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { object, string } from "zod";

// TODO: implement hash logic
const saltAndHashPassword = (password: string) => password;

export const signInSchema = object({
  email: string({ required_error: "Email is required" })
    .min(1, "Email is required")
    .email("Invalid email"),
  password: string({ required_error: "Password is required" })
    .min(1, "Password is required")
    .min(8, "Password must be more than 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

type ApiUser = {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  exp: number;
};

declare module "next-auth/jwt" {
  export interface JWT {
    user?: ApiUser;
  }
}

declare module "next-auth" {
  export interface User extends ApiUser { }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      // You can specify which fields should be submitted, by adding keys to the `credentials` object.
      // e.g. domain, username, password, 2FA token, etc.
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        const { email, password } = await signInSchema.parseAsync(credentials);

        // logic to salt and hash password
        const pwHash = saltAndHashPassword(password);

        const fetchResponse = await fetch(
          "http://localhost:8000/express-api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password: pwHash,
            }),
          },
        );

        if (!fetchResponse.ok) {
          // NOTE: or
          // const error = await fetchResponse.json();
          // throw error
          throw new Error("User not found.");
        }

        const user = await fetchResponse.json();

        console.log({ user });

        // return user object with the their profile data
        return { ...user };
      },
    }),
  ],
  callbacks: {
    async jwt(data) {
      console.log({ jwt_data: data });

      const { token, account, user } = data;

      if (account) {
        // First login, save the `access_token`, `refresh_token`, and other
        // details into the JWT

        return {
          ...token,
          user: {
            ...token.user,
            id: user.id,
            email: user.email,
            exp: user.exp,
            accessToken: user.accessToken,
            refreshToken: user.refreshToken,
          },
        } as typeof token;
      }

      if (token.user && Date.now() < token.user.exp * 1000) {
        // Subsequent logins, if the `access_token` is still valid, return the JWT
        return token;
      }

      // Subsequent logins, if the `access_token` has expired, try to refresh it
      if (!token.user?.refreshToken) throw new Error("Missing refresh token");

      try {
        // The `token_endpoint` can be found in the provider's documentation. Or if they support OIDC,
        // at their `/.well-known/openid-configuration` endpoint.
        // i.e. https://accounts.google.com/.well-known/openid-configuration

        const response = await fetch(
          "http://localhost:8000/express-api/auth/refresh",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              accessToken: token.user?.accessToken,
              refreshToken: token.user?.refreshToken,
            }),
          },
        );

        const responseTokens = await response.json();

        if (!response.ok) {
          if (response.status !== 400) {
            await signOut({ redirect: false });
          }

          throw responseTokens;
        }

        return {
          // Keep the previous token properties
          ...token,
          user: {
            ...token.user,
            accessToken: responseTokens.accessToken,
            refreshToken: responseTokens.refreshToken,
            exp: responseTokens.exp,
          },
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        // The error property can be used client-side to handle the refresh token error
        return { ...token, error: "RefreshAccessTokenError" as const };
      }
    },
    session(data) {
      data.session.user = {
        ...data.session.user,
        ...data.token.user,
      };

      return data.session;
    },
  },
});
