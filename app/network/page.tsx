// Redirect /network → /merchants (canonical URL)
import { redirect } from "next/navigation";

export default function NetworkRedirect() {
  redirect("/merchants");
}
