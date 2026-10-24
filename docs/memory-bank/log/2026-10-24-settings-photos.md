# Settings → Business profile, the photos (P4 slice 2; feat/settings-photos)

- **`@yeral/ui/photo-grid`** (`Inputs/PhotoManager`, DS-Business PhotoManager, B-Settings `.phg`): squares r12 in a
  grid (104 at least, 12 apart); the first is the cover (ink chip), the others «Make cover»; remove (top right) and a
  drag handle (top left): a pointer drags the tile (native drag and drop), the keyboard moves it (Space picks it up,
  ←/→, Space puts it down, Esc puts it back, each step said in a status line); uploading tiles (spinner, «Uploading…»;
  no meter: `fetch` gives no progress), refused tiles (dashed danger, dismiss), the add tile (several files at once).
- **Business profile's Photos** (`pages/settings-profile/ui/photos-section.tsx`): «2 of 20», the cover caption, the
  grid; each change saves at once (`settings.addPhoto` / `removePhoto` / `orderPhotos`, the order shown at once and put
  back if refused); files are checked by their bytes and size (`@yeral/domain/photos`) and shrunk to 2048 on the long
  side before they go, one after another (`lib/shrink-photo.ts`); a refused one: «salon-hall.jpg is 14 MB. Photos can
  be up to 10 MB.» / «price-list.pdf isn't a photo. Use JPG, PNG or WebP.»; more than the room left: a toast; under 3:
  «Add 1 more photo — pages with 3+ photos get seen more in search». The sent-back box gained «Go to photos».
- Built on `log/2026-10-24-settings-profile.md`. The address (with the map) is the profile's last piece.
