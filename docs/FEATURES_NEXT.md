# Next frontend features (speed first)

User request 2026-10-12: "add 50 more features", "list 30 more", on the rule that the site must stay fast and light. Every item below is CSS-only, a few hundred bytes of script, or loaded on demand. Legend: `[x]` done · `[~]` partly · `[ ]` not started.

## Speed and installability
1. [x] Installable app (web manifest from brand settings, icons)
2. [x] Offline page + service worker (never caches API, account or checkout)
3. [x] "Install the app" button in the footer (only where the browser offers it)
4. [x] Bag drawer, quick view, compare tray, mascot, effects, confetti load on demand (no animation library on first view)
5. [x] 3D scene loads only on pages that use it; maps and model viewer load only when opened
6. [x] Data-saver / slow-connection mode (drops decorative layers and motion automatically)
7. [x] Below-the-fold sections painted lazily (`content-visibility`)
8. [x] Production build measured: 103 kB shared, 107 to 137 kB per page (gzip)
9. [ ] Responsive image sizes (`srcset`) once real photo uploads exist
10. [ ] Self-hosted font files subset to the languages in use

## Search engines and sharing
11. [x] sitemap.xml (products, categories, recipes, articles, sets)
12. [x] robots.txt
13. [x] Organization and site-search structured data on every page
14. [x] Web Share button on products, recipes and articles (copy link on desktop)
15. [x] Wishlist share link (read-only page for the receiver)
16. [x] Print-friendly pages (recipes, shopping list, pages hide menus and buttons)
17. [ ] Per-page social preview images
18. [ ] Breadcrumb structured data

## Navigation and shopping
19. [x] Skip-to-content link
20. [x] Keyboard shortcuts (/ search, b bag, w wishlist, h home, ? help)
21. [x] "Back to results" on product pages
22. [x] Slim add-to-bag bar on desktop once the main button scrolls away
23. [x] "Add Rs. X more for free delivery" under the price, aware of what is already in the bag
24. [x] Wishlist shows price drops since the item was saved
25. [x] Announcement bar can be dismissed (stays closed for the visit)
26. [x] Smarter 404 page: search box and category shortcuts
27. [x] Floating WhatsApp chat button (switch in Settings; uses the WhatsApp link)
28. [ ] Recently viewed categories on the home page
29. [ ] "Back in stock" badge on wishlist items
30. [ ] Compare table share link

## Accessibility and comfort
31. [x] Accessibility menu: text size, high contrast, underlined links, easier-to-read font (saved, applied before first paint)
32. [x] Clear keyboard focus ring everywhere, anchor offsets under the sticky header
33. [x] Animations play by default even when the visitor's computer asks for reduced motion (Settings: "Play animations anyway"); the header switch still turns them off
34. [ ] Auto light/dark following the device
35. [ ] Right-to-left layout support

## Still open ideas (30 more, none heavy)
36. [ ] Sticky filters button on mobile product list
37. [ ] Recently searched products row on the search panel
38. [ ] Product photo swipe indicators on mobile
39. [ ] Pinch-to-zoom in the lightbox
40. [ ] Delivery date range promise by city on cards
41. [ ] "Notify me" for price drops (needs email provider)
42. [ ] Gift finder by budget on the home page
43. [ ] Order tracking steps animation
44. [ ] Review photo upload (needs file storage)
45. [ ] Copy-coupon chip in the announcement bar
46. [ ] Free-delivery progress ring in the header bag icon
47. [ ] Quantity stepper on cards
48. [ ] Saved sizes per shopper
49. [ ] Reorder button on past orders
50. [ ] Address book quick-fill by city list
51. [ ] Category banner images
52. [ ] Collection sorting presets (staff picks)
53. [ ] Language switcher (needs translations)
54. [ ] Currency display toggle (needs a rates setting)
55. [ ] Product "ask on WhatsApp" with the product link prefilled
56. [ ] Low-bandwidth image mode toggle
57. [ ] Footer payment and courier logos from uploads
58. [ ] Blog table of contents from headings
59. [ ] Recipe cook mode (large text, screen stays on)
60. [ ] Shopping list share to WhatsApp
61. [ ] Voice-controlled timer steps
62. [ ] Search "did you mean" suggestions
63. [ ] Filter by rating
64. [ ] Saved searches
65. [ ] Cart reminder when returning with a full bag

---
# Batch 10 (2026-10-12): 30 functional + 40 refinements
Rule from the owner: professional, sophisticated and soft; never garish or "AI looking"; everything aligned with the theme (accent, card, line, radius, the logo's angular geometry); glowing, 3D and mirror touches kept subtle; nothing heavy.

## 30 functional
1. [x] One-tap quick add on product cards (simple products)
2. [x] Filter by rating (4 stars and up)
3. [x] Floating "Filters" button on phones
4. [x] "Did you mean" for misspelt searches (typo tolerant)
5. [x] Photo swipe and dots on phones
6. [x] Double-click zoom in the photo lightbox
7. [x] Free-delivery progress ring around the bag icon
8. [x] Category banner on category pages
9. [x] "Ask on WhatsApp" with the product link prefilled
10. [x] Article table of contents
11. [x] Recipe cook mode (big text, screen stays awake)
12. [x] Send the shopping list on WhatsApp
13. [x] Article reading time
14. [x] Auto theme that follows the device
15. [x] Remembers your last size
16. [x] Data saver switch in the accessibility menu
17. [x] Shareable comparison link
18. [x] Popular products on empty search results
19. [x] Recently viewed items inside an empty bag
20. [x] First product images load first (faster first view)
21. [x] Starter Contact page (`scripts/seed-pages.ts`)
22. [x] Starter FAQ page written from the shop's real delivery rules
23. [x] Print receipt on order confirmation
24. [x] Guest checkout remembers your details on this device
25. [x] Gentle Pakistani phone number check
26. [x] City suggestions at checkout and in the address book
27. [x] Sort chips on phones
28. [x] Highlight differences on the compare page
29. [x] WhatsApp share next to Share
30. [x] Product grid density (2, 3 or 4 per row), remembered
(Already existed, so not repeated: order tracking steps, reorder button.)

## 40 refinements (all use theme tokens)
31. [x] Atmosphere background: soft warm light from above, quiet depth below, faint angular lines
32. [x] Soft 3D surface depth switch (layered shadows with a top-edge highlight)
33. [x] Gentle warm glow on hover for cards, buttons and focus
34. [x] Mirror floor reflection under the product photo and hero headline (Chromium and Safari)
35. [x] Angular gold corner brackets on cards
36. [x] Inner gold frame on product photos on hover
37. [x] Light that follows the pointer across tilting cards
38. [x] Raised primary buttons with highlight and pressed state
39. [x] Recessed inputs with a soft focus glow
40. [x] Floating header, drawers and dialogs with real depth
41. [x] Section headings with a hairline ornament
42. [x] Gold hairline between sections
43. [x] Footer top hairline
44. [x] Header links with a sliding gold underline
45. [x] Content links that draw an underline from the left
46. [x] Buttons' arrows nudge forward on hover
47. [x] Angular cut on discount badges
48. [x] Count badges pop when the number changes
49. [x] Shimmer skeleton loaders in theme tones
50. [x] Image placeholders shimmer until the photo arrives
51. [x] Thin gold navigation progress line
52. [x] Selection colour from the accent
53. [x] Slim accent scrollbars
54. [x] Native controls follow light/dark (`color-scheme`)
55. [x] Balanced headings and tidy paragraph wrapping
56. [x] Better font rendering and ligatures
57. [x] Checkbox, radio and slider in the accent colour
58. [x] Notice toasts with an accent edge
59. [x] Logo gets a soft glow under depth
60. [x] Cover banner styling on category pages
61. [x] Soft depth under light theme too (lighter shadows, no neon)
62. [x] All of it switches off with data saver and print
63. [ ] Section divider using the logo mark
64. [ ] Animated gold shimmer on the main heading once per visit
65. [ ] Frosted header on scroll with blur strength by depth
66. [ ] Product page spec table zebra and icons
67. [ ] Cart drawer item cards with depth
68. [ ] Empty states with glow behind the mascot
69. [ ] Review cards with quote ornament
70. [ ] Account dashboard cards with depth
