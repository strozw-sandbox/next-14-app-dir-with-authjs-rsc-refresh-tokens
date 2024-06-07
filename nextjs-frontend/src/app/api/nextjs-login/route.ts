import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import type { Session } from "@/app/types";
import { encryptServerSession } from "@/app/utils";
import { NextResponse, type NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let data;

	try {
		data = await request.json();

		const fetchResponse = await fetch(
			"http://localhost:8000/express-api/auth/login",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			},
		);

		if (!fetchResponse.ok) {
			const error = await fetchResponse.json();
			return NextResponse.json(
				{ message: error.message },
				{ status: fetchResponse.status },
			);
		}

		const response = await fetchResponse.json();

		const accessTokenPayload = jwtDecode<{ user: Session["user"] }>(
			response.accessToken,
		);
		const refreshTokenPayload = jwtDecode<{ exp: number }>(
			response.refreshToken,
		);

		const session: Session = {
			accessToken: response.accessToken,
			refreshToken: response.refreshToken,
			user: accessTokenPayload.user,
		};

		const encryptedServerSession = encryptServerSession(session);

		cookies().set({
			name: "session",
			value: encryptedServerSession,
			httpOnly: true,
			expires: new Date(refreshTokenPayload.exp * 1000),
			sameSite: "lax",
			secure: true,
		});

		return NextResponse.json(session, { status: 200 });
	} catch (e: unknown) {
		return NextResponse.json(
			{ message: "An unknown error occurred." },
			{ status: 500 },
		);
	}
};
