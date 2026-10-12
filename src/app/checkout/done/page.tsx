// Removed in v0.6: BillerBench is free, so there is no checkout. This file is safe to delete.
import { redirect } from "next/navigation";

export default function CheckoutDone() {
  redirect("/");
}
