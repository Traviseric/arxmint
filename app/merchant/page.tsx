// Redirect /merchant → /merchants (preserve old links)
import { redirect } from "next/navigation";

export default function MerchantRedirect() {
  redirect("/merchants");
}
