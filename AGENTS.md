# Project Architecture

- Keep room-zone bookings in `zone_bookings` and legacy equipment reservations in `bookings`, so map scheduling cannot corrupt equipment history.
- Render the lab plan from `lab_zones` content with a fixed frontend layout keyed by stable zone slugs, so admins can edit content without breaking geometry.
- Keep the homepage facade image in normal document flow and move its booking action below the photo on narrow screens, so the real lab stays visible without overlapping text.
- Keep lab discovery and request/catalog views in the shared homepage experience; redirect legacy `/booking` links with their query parameters intact to preserve QR and login-return flows.
- Public discovery must not expose request or checkout controls to signed-out, unapproved or banned accounts; retain backend authorization and show login or approval states at the action point.