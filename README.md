# Purview Grid

**Purview Grid** is a beautiful, blazing-fast native MacOS desktop image viewer that renders images in a highly customizable, fluid Pinterest-style Masonry grid. Drop folders and images onto the canvas to instantly build beautiful moodboards, reference grids, and galleries.

![Purview Demonstration](demo.gif)

## Features

- **Blazing Fast Native App**: Built on Electron with a deeply optimized React DOM rendering engine, enabling buttery smooth grid scaling and lightning-fast local `file://` reading. No waiting for browser uploads!
- **Fluid Masonry Layout**: Images tile cleanly into vertical columns without ugly crop boxes or locked aspect ratios, identical to Pinterest.
- **Dynamic Quick-Scale & Wheel Scroll**: A built-in unified slider allows you to shrink or expand the grid dynamically (from 1 to 12 columns). You can slide or simply scroll your mouse wheel / trackpad over the control bar to smoothly resize columns.
- **Sticky Floating Controls**: The top control bar docks smoothly at the top with a native blurred glassmorphism backdrop, ensuring column scaling and edit controls remain easily accessible at all times while scrolling.
- **Pin to Top**: Click the `📌` badge on any image to snap it uniquely to a separated "Pinned" section at the exact top of your workspace. Always keep your priorities and best references in view. 
- **Drag & Drop Reordering**: Natively grab any image in the grid and throw it across the board to strictly re-order your references in real-time. (Cross-contamination between Pinned and Unpinned zones is gracefully locked to maintain order).
- **Edit / Remove Mode**: Activating Edit Mode cleanly adds removal badges layout elements to your pictures without obscuring the canvas, protecting you from accidental deletions while you browse.
- **Click-to-Preview & Lightbox**: Click any image or use the `⛶` expand button on the card to open a full-resolution lightbox modal with smooth zoom animations. Easily cycle through images with on-screen navigation or keyboard arrows (`←` / `→`) and dismiss with `Esc` or clicking outside.
- **Mac OS Seamless UI**: Implements an invisible frameless Apple UI `hiddenInset` traffic-light drag bar to maximize standard window visuals without disrupting native UX flow.

## Installation & Usage
1. Clone the repository
2. Run `npm install`
3. Run `npm run build` to package the native Mac OS Application!
4. Simply double click on a photo and use **Open With -> Purview** to instantly view it inside the Purview ecosystem!
