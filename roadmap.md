# Unified homepage

- [x] Merge lab map, workshop/3D requests, equipment and inventory into the homepage; preserve old links and access checks.
- [x] Refresh facade hero, remove the startup banner, replace Atmosphere grid with photo carousel and align section styles.
- [x] Verify desktop/mobile navigation, carousel and public request access; document authenticated-test limitations.

Verified at 390, 862 and 1280 pixels: no page overflow; carousel arrows and all five images work; public workshop requests prompt sign-in; legacy zone links open and close correctly. Authenticated submission was not tested because the project uses unmanaged external authentication. The preview still reports its existing service-worker MIME error.