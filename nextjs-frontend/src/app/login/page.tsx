import { signInAction } from "./actions";

export default async function LoginPage() {
	return (
		<form action={signInAction}>
			<input name="email" type="email" placeholder="Email" />
			<input name="password" type="password" placeholder="Password" />

			<button type="submit">Login</button>
		</form>
	);
}
