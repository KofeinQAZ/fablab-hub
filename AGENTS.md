# Project Architecture

- Keep room-zone bookings in `zone_bookings` and legacy equipment reservations in `bookings`, so map scheduling cannot corrupt equipment history.
- Render the lab plan from `lab_zones` content with a fixed frontend layout keyed by stable zone slugs, so admins can edit content without breaking geometry.