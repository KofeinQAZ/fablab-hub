# Unified homepage

- [x] Keep the hero unchanged; refresh the below-hero introduction and two scrolling actions, move MIT and partners before the tools, and verify layout/navigation.

- [x] Remove the inventory section and its homepage anchor temporarily, without deleting inventory data or admin tools.

- [x] Merge lab map, workshop/3D requests, equipment and inventory into the homepage; preserve old links and access checks.
- [x] Refresh facade hero, remove the startup banner, replace Atmosphere grid with photo carousel and align section styles.
- [x] Verify desktop/mobile navigation, carousel and public request access; document authenticated-test limitations.

Verified at 390, 862 and 1280 pixels: no page overflow; carousel arrows and all five images work; public workshop requests prompt sign-in; legacy zone links open and close correctly. Authenticated submission was not tested because the project uses unmanaged external authentication. The preview still reports its existing service-worker MIME error.