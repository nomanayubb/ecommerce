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
