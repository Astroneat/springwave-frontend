# Implementation Plan: Mobile Responsive 2-Column Event Grid & Full Page Mobile Optimization

## Overview
Optimize SpringWave's Explore page and mobile responsiveness across the frontend. Specifically, transition event cards on mobile viewports from a 1x1 full-width layout to an elegant, compact **2 cards per row (2 columns)** grid, meticulously styling all card sub-elements (thumbnails, category tags, clamped titles, truncated location/date/host badges, action buttons) and resolving mobile responsive issues across search bars, drawers, filter toggles, modals, and page layouts.

---

## Proposed Architecture & Design Changes

### 1. 2-Column Mobile Card Grid (`.cards-container` & `.card`)
- **Grid Layout**:
  - Breakpoints:
    - `>= 1280px` (Desktop): 4 columns (`grid-cols-4`, `gap-6`)
    - `1024px - 1279px` (Laptop): 3 columns (`grid-cols-3`, `gap-5`)
    - `< 1024px` down to `320px` (Tablet & Mobile): **2 columns** (`grid-cols-2`, `gap-2.5 sm:gap-4`)
  - Set `max-width: none` and `width: 100%` on `.card` so cards stretch and align evenly within their grid column.
  - Card container flex column layout with `height: 100%` and `margin-top: auto` on `.card-bottom` so cards in the same row maintain uniform height and bottom buttons align horizontally.

### 2. Card Component Refinements for 2-Column Density
- **Image Banner (`.card-image`)**:
  - Responsive height: `h-[100px] sm:h-[120px] md:h-[135px]` with `object-fit: cover` and smooth rounded top corners.
- **Floating Tag Overlay**:
  - Mobile size: `top-2 right-2 px-2 py-0.5 text-[9.5px] font-bold rounded-md max-w-[75%] truncate`.
- **Card Content Padding**:
  - `p-2.5 sm:p-3 md:p-4`.
- **Title (`.card-title`)**:
  - `font-size: 0.82rem sm:0.9rem md:1.02rem`, `font-weight: 700`, `line-height: 1.25`.
  - Strict 2-line clamp (`-webkit-line-clamp: 2; height: 2.5em; overflow: hidden;`) to ensure predictable vertical rhythm across cards.
- **Info Lines (`.info-location`, `.info-date`)**:
  - Font size `0.70rem sm:0.75rem`, gap `4px`.
  - Single-line ellipsis truncation on location & date so long address strings (e.g. "Đại học Nguyễn Tất Thành, Đỗ Mười...") never wrap into multi-line blocks that distort card heights.
- **Host Badge (`.card .info:nth-of-type(3)`)**:
  - Compact capsule badge (`padding: 2.5px 7px; font-size: 0.65rem sm:0.72rem; border-radius: 6px; max-width: 100%;`).
  - Text ellipsis truncation for long organizer names (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`).
- **Action Bar (`.card-bottom`)**:
  - Details Button: `py-1.5 px-2.5 sm:px-3 text-[10.5px] sm:text-[12px] font-bold rounded-lg whitespace-nowrap`.
  - Favorite Star Button: `w-7 h-7 sm:w-8 sm:h-8` with centered star icon.

### 3. Explore Page Full Responsive Optimization
- **Header & Search Bar (`.explore-search-bar`)**:
  - Mobile layout: stacked card design with rounded corners (`rounded-2xl`), clear field separators, responsive input fonts, and unified button row (Search button flex-1 + Refresh button aligned side-by-side).
  - Date Range Dropdown (`.dr-dropdown`): responsive centered sheet / mobile popup with proper touch targets and clear/close buttons.
  - Map Modal (`.map-modal-container`): full responsive width (`w-[94%] max-w-[650px] max-h-[85vh]`).
- **Sidebar & Filter Drawer (`.explore-sidebar`)**:
  - Smooth mobile slide-out drawer on `< 1024px` with dark backdrop blur, header close touch, scrollable category chips, and sticky action buttons.
  - Results bar: results counter and "Filters" button aligned cleanly with adequate spacing.
- **Recommendations Section**:
  - Smooth horizontal scrolling cards with touch scroll snap and clean padding.
- **Pagination & Floating Chatbot**:
  - Centered pagination buttons with 36px touch targets.
  - Chatbot widget offset to prevent covering bottom content.
- **Viewport & Global Overflow Protection**:
  - Ensure zero horizontal scroll jitter (`overflow-x: hidden`) on mobile viewports.

---

## Verification Plan

### Automated / Build Verification
- Run `npm run build` in `springwave-frontend` to verify all CSS, HTML, and JS assets compile cleanly with Vite without any bundling or syntax errors.

### Visual & Responsive Verification
- Test multiple viewport widths in browser DevTools:
  - 375px (iPhone SE / smaller mobile)
  - 390px - 414px (iPhone 12/13/14/15/16, standard modern mobile)
  - 430px (iPhone Pro Max / Galaxy Plus)
  - 768px (iPad Mini / Portrait Tablet)
  - 1024px (iPad Pro / Small Laptop)
  - 1280px+ (Desktop)
- Confirm 2-column grid renders cleanly without text overlaps, clipping, or horizontal overflow.
- Test search bar inputs, date range picker, filter drawer, map modal, and card click / favorite interactions.
