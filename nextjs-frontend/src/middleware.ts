import { auth } from "@/auth";

const authRoutes = ["/protected-rsc"];

export const middleware = auth((req) => {
	const { nextUrl } = req;
	const isLoggedIn = !!req.auth;
	const isAuthRoute = authRoutes.includes(nextUrl.pathname);

	if (isLoggedIn && nextUrl.pathname === '/login') {
		return Response.redirect(new URL("/", nextUrl));
	}

	if (!isLoggedIn && isAuthRoute) {
		return Response.redirect(new URL("/login", nextUrl));
	}

	return;
});

export const config = {
	// NOTE: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
	matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
