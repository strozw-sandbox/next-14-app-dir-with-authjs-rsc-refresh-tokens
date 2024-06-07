import { redirect } from "next/navigation";
import { serverFetch } from "../serverFetch";
import { auth } from "@/auth";

const ProtectedRSC = async () => {
	const session = await auth();

	const { response } = await serverFetch({
		input: "http://localhost:8000/express-api/protected-route",
		init: {
			method: "GET",
			headers: {
				// We could omit setting authorization header here beacause `authTokens` are passed into the `serverFetch` and could set the header depending if `authTokens` are passed or not
				authorization: `Bearer ${session?.user?.accessToken}`,
			},
		},
		authTokens: {
			accessToken: session?.user?.accessToken ?? "",
			refreshToken: session?.user?.refreshToken ?? "",
		},
	});

	if (!response.ok) {
		if (response.status === 401) {
			// The token refresh process has failed
			return redirect("/login");
		}
	}

	const data = await response.json();

	return (
		<>
			<main>
				<h1>Proctected Server Page</h1>
				<div>Fetched data from express api: {JSON.stringify(data)}</div>
			</main>
		</>
	);
};

export default ProtectedRSC;
