import { redirect } from "next/navigation";

/** Skip the login step entirely — go straight into the app as the demo learner. */
export default function Home() {
  redirect("/dashboard");
}
