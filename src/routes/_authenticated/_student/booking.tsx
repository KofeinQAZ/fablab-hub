import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_student/booking")({ component: BookingRedirect });

function BookingRedirect() {
  useEffect(() => {
    // Keep all QR and login-return parameters while retiring the duplicate page.
    window.location.replace(`/${window.location.search}${window.location.hash || "#booking-map"}`);
  }, []);
  return null;
}
