import { redirect } from "next/navigation";

// The plans list now lives on the home screen.
// Redirect any direct visits to /hangouts back to /.
export default function HangoutsPage() {
    redirect("/");
}
