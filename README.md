# NoCodeFolio Hub

Build a "Link-in-Bio" web app in Bento Grid style called **NoCode Folio**. Users create a modular profile page made of "blocks" (widgets) of different sizes arranged in a grid. Stack: React + TypeScript, Tailwind CSS, shadcn/ui, Supabase (auth + database + storage), Framer Motion, dnd-kit. Mobile-first. Dark mode only.

## Visual Identity — "Glassmorphism Dark" (NoCode Startup theme)

- **Page background:** #020617 (slate-950) with a very subtle radial gradient at the top center (violet → blue, low opacity) for depth.

- **Blocks:** bg #0F172A (slate-900) at 40% opacity + `backdrop-blur-md`, 1px border #1E293B (slate-800), `rounded-3xl`. Generous inner padding.

- **Accent:** #8B5CF6 (violet-500/600) for active icons, primary buttons, focus rings.

- **Typography:** Plus Jakarta Sans (fallback Inter). Titles bold white; secondary text slate-400.

- **Hover:** block scales to `scale-[1.03]`–`scale-105` with a smooth transition and the border glows softly violet (`shadow-[0_0_24px_-6px_rgba(139,92,246,0.5)]`). Disable hover scale while in edit mode.

## Layout — CSS Grid

- Mobile: 1 column. Tablet (md): 2 columns. Desktop (lg): 4 columns.

- Uniform row height (e.g. `auto-rows-[180px]`), `gap-4`, centered container max-w-5xl.

- Sizes: `1x1` = col-span-1; `2x1` = col-span-2; `2x2` = col-span-2 row-span-2.

- On mobile every block is full width; 2x2 blocks keep a pleasant aspect (don't stretch too tall), 2x1 becomes a single-row card.

## Widgets

1. **Profile Card (2x2):** avatar (squircle), full name, short bio, skill tags as pill badges (e.g. "Bubble", "React"). Always first by default.

2. **Social Link (1x1):** large centered brand icon (Instagram, LinkedIn, GitHub, YouTube, X, TikTok) + small label; whole card is a link opening in a new tab.

3. **Content Showcase (2x1):** cover image (project or video thumbnail) with dark gradient overlay and title/subtitle at the bottom; clickable link.

4. **Newsletter (2x1):** short headline + email input and "Subscribe" button inline, minimal style. Validate email, show toast on success, save to `subscribers` table.

5. **Map Card (1x1):** stylized static dark map (e.g. Mapbox/Carto dark tiles image) with a violet pin and city name overlay.

## Pages & Auth

- `/` landing with CTA "Create your Folio".

- `/auth` sign up / login (Supabase email auth).

- `/:username` public profile page (anyone can view).

- On first login, onboarding asks for a unique username and creates the profile with a default set of widgets.

## Creator / Edit Mode

- Floating "Edit Profile" button (bottom-right), visible only when the logged-in user owns the profile.

- In edit mode: blocks do a subtle iOS-style wiggle, show a drag handle plus Edit and Delete icon buttons in the corner.

- Reorder via **dnd-kit** (sortable grid, works with touch). Provide arrow buttons as a fallback for accessibility.

- "Add Block" button opens a dialog to choose widget type and size, then a form to fill its content.

- Edit opens a shadcn Sheet/Dialog with a form specific to the widget type; allow changing size.

- Changes persist to Supabase (update `position_index` for all affected rows after a reorder). "Done" exits edit mode.

## Data Model (Supabase)

- `profiles`: id (uuid, = auth.users.id), username (unique, lowercase), full_name, bio, avatar_url, skills (text[]), created_at.

- `widgets`: id, profile_id (fk), type (enum: 'profile', 'social', 'showcase', 'newsletter', 'map'), size (enum: '1x1', '2x1', '2x2'), content (jsonb — urls, titles, image urls, platform, location, etc.), position_index (int), created_at.

- `subscribers`: id, profile_id (fk), email, created_at; unique (profile_id, email).

- Storage bucket `images` for avatars and covers.

- **RLS:** profiles and widgets are publicly readable; only the owner can insert/update/delete their own rows. Anyone can insert into subscribers; only the owner can read their subscribers.

## UX Polish

- **Entrance animation:** staggered fade-in + slide up (each block ~60ms after the previous) with Framer Motion. Respect `prefers-reduced-motion`.

- Skeleton loaders while data loads; friendly 404 for unknown usernames.

- Accessible: visible focus rings in violet, aria-labels on icon buttons, sufficient contrast.

- Seed a demo profile so the public page looks complete immediately.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/756d167d-4c78-408b-80aa-e544d2542ddc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
