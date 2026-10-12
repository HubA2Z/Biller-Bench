// Removed in v0.6: pricing became the Billing services page. This file is safe to delete.
import { redirect } from "next/navigation";

export default function Pricing() {
  redirect("/services");
}
