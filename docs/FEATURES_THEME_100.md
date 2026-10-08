# Theme architecture & section library (100)

User-supplied backlog 2026-10-08 (Shopify-2.0-style theme system). Builds on `apps/web/src/themes/` + DB branding. Must follow `docs/DESIGN_SYSTEM_RULES.md`.

Legend: `[x]` done · `[~]` partly done · `[ ]` not started. Update when an item changes.


## Core theme architecture (1-15)

1. [x] Modular section blocks (drag-and-drop editor)
2. [x] Global style settings in one place
3. [x] CSS variables for theme-wide changes
4. [x] Design tokens system (spacing, type, radius scales)
5. [x] Section presets (save & reuse)
6. [~] Template hierarchy (product, collection, blog, page, 404)
7. [ ] Alternate templates (e.g. product.sale.json)
8. [x] JSON template system
9. [ ] Metafield-driven sections
10. [ ] Multi-language ready (RTL support)
11. [~] Multi-currency aware layouts
12. [~] Responsive breakpoint system
13. [~] Theme versioning with changelog
14. [ ] Child theme support
15. [~] Zero-JS fallback for critical content

## Section library (16-35)

16. [~] Hero banner (image, video, slideshow)
17. [x] Split hero (text + image)
18. [x] Fullscreen video hero with overlay
19. [x] Featured collection grid (2/3/4 col)
20. [x] Featured product spotlight
21. [x] Product carousel/slider
22. [x] Collection list with images
23. [x] Image with text overlay
24. [x] Image with text (side-by-side)
25. [x] Rich text section
26. [x] Multi-column content
27. [x] Testimonials slider
28. [x] Logo list / brand bar
29. [x] Newsletter signup (inline + popup)
30. [x] FAQ accordion
31. [x] Countdown timer section
32. [x] Banner with countdown (sale)
33. [ ] Instagram/UGC feed
34. [ ] Blog post grid
35. [ ] Custom code section for devs

## Header & navigation (36-50)

36. [x] Sticky header (always / on scroll up)
37. [ ] Transparent header on hero, solid on scroll
38. [~] Mega menu with images + columns
39. [x] Dropdown menus with animations
40. [~] Mobile drawer menu with accordions
41. [x] Announcement bar (rotating messages)
42. [ ] Announcement bar with countdown
43. [~] Search bar in header
44. [ ] Predictive search dropdown
45. [x] Cart icon with live item count
46. [x] Wishlist icon in header
47. [~] Account icon with dropdown
48. [ ] Currency selector in header
49. [ ] Language selector in header
50. [x] Header CTA button

## Product page sections (51-70)

51. [x] Product gallery (thumbnails left/bottom)
52. [x] Gallery zoom on hover
53. [x] Gallery lightbox on click
54. [x] Video in gallery
55. [x] 360° spin viewer
56. [x] Model/AR viewer (3D)
57. [x] Variant picker (swatches, dropdowns, pills)
58. [x] Color swatches with images
59. [x] Size chart modal
60. [x] Quantity selector (+/-)
61. [~] Sticky add-to-cart bar
62. [ ] Dynamic checkout buy buttons
63. [~] Trust badges row
64. [~] Shipping estimator
65. [~] Product tabs (description, specs, reviews)
66. [x] Accordion product info
67. [~] Complementary products section
68. [~] Related products carousel
69. [x] Recently viewed section
70. [~] Product badges (sale %, new, sold out)

## Cart & checkout sections (71-80)

71. [x] Slide-out cart drawer
72. [~] Cart page with upsells
73. [x] Free shipping progress bar
74. [x] Cart notes field
75. [x] Gift wrap option
76. [ ] Estimated shipping calculator
77. [x] Discount code field
78. [x] Cart recommendations carousel
79. [x] Empty cart with CTA
80. [~] Mini cart in header dropdown

## Content sections (81-90)

81. [ ] About us with timeline
82. [ ] Team members grid
83. [ ] Contact form with map
84. [ ] Store locator with map
85. [ ] FAQ page with categories
86. [ ] Blog post with sidebar
87. [ ] Blog with featured post
88. [ ] Author bio section
89. [ ] Related posts carousel
90. [ ] Newsletter landing page

## Theme settings & UX (91-100)

91. [x] Color scheme presets (5-10 palettes)
92. [x] Typography presets (font pairings)
93. [x] Button style options
94. [x] Border radius global control
95. [x] Animation intensity setting (off/subtle/full)
96. [x] Layout width control (boxed/full)
97. [x] Product card style options (3-4 variants)
98. [x] Badge style options
99. [x] Social media icons with links
100. [x] Footer builder (columns, newsletter, payment icons)

---
Total 100: 57 done, 19 partly, 24 not started (as of 2026-10-09).
