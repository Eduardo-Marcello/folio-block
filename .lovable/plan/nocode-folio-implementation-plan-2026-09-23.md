# NoCode Folio implementation plan

## Experience
- Replace the placeholder with a dark, mobile-first NoCode Folio landing page and a polished demo folio preview.
- Add `/auth` for email sign-up and sign-in, onboarding for a unique lowercase username, and public `/:username` folio pages.
- Build the requested glassmorphism Bento Grid: responsive one/two/four-column layout, semantic dark tokens, Plus Jakarta Sans, subtle violet/blue depth, focus states, reduced-motion support, skeletons, and a friendly missing-profile state.

## Profile blocks
- Support profile, social, showcase, newsletter, and map blocks in `1x1`, `2x1`, and `2x2` sizes with the requested content and behavior.
- Add staggered block entrances, external-link behavior, email validation and success notifications, and image uploads for avatars and covers.
- Seed a complete public demo profile with representative blocks and imagery.

## Creator workflow
- Show “Edit Profile” only to the profile owner.
- Add edit mode with wiggle animation, drag handles, touch-friendly dnd-kit sorting, accessible move buttons, edit/delete controls, and a Done action.
- Add block creation and editing dialogs with type-specific fields and size selection; persist all changes and reordered positions.

## Accounts and data
- Enable email/password accounts with confirmation-aware sign-up and password recovery.
- Create profiles, widgets, and subscribers with strict ownership and public-view rules; create a public images bucket with owner-scoped upload rules.
- Create a default profile and starter widgets after onboarding, while keeping the profile block first.

## Technical details
- Use TanStack Start routes and the generated Lovable Cloud client, React Query, Framer Motion, dnd-kit, shadcn-style Radix controls, Zod validation, Lucide icons, and Sonner notifications.
- Add the managed authenticated route gate and token attachment for protected operations.
- Give every public page unique title, description, Open Graph, and Twitter metadata.
- Verify the app at desktop and mobile sizes, exercise authentication-aware public/profile flows, and run database security checks.
