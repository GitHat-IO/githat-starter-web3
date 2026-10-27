import { currentUser } from "../../../lib/auth";

// Who is signed in, for your own client code: { address } or 401.
export async function GET(): Promise<Response> {
  const user = await currentUser();
  return user ? Response.json({ address: user.sub }) : Response.json({ error: "Not signed in." }, { status: 401 });
}
