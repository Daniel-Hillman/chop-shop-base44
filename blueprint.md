# YouTube Video Sampler - Blueprint

## Overview

This document outlines the plan for reconstructing the web-based YouTube video sampling tool. The original project files were corrupted, and this blueprint will guide the process of restoring the application from recovered `.txt` files.

## Implemented Features

This section will be updated as features are implemented.

*   **YouTube Video Loading:** Users can load a YouTube video by providing a URL.
*   **Video Chopping:** Users can define "chops" (start and end points) within the video.
*   **Pad Assignment:** Chops can be assigned to a grid of pads.
*   **Live Playback:** Users can trigger playback of chops using the pads.
*   **Session Saving:** Users can save their chop sessions to a backend.

## Reconstruction Plan

### 1. File & Directory Structure

-   Create the following directory structure:
    -   `src/components/chopper`
    -   `src/components/ui`
    -   `src/hooks`
    -   `src/pages`
    -   `src/lib`
    -   `src/styles`
-   Reconstruct the following files:
    -   `src/App.jsx`
    -   `src/main.jsx`
    -   `src/pages/ChopperPage.jsx`
    -   `src/pages/MySessions.jsx`
    -   `src/components/chopper/Controls.jsx`
    -   `src/components/chopper/PadGrid.jsx`
    -   `src/components/chopper/TriggerPad.jsx`
    -   `src/components/chopper/VideoPlayer.jsx`
    -   `src/components/chopper/WaveformDisplay.jsx`
    -   `src/hooks/useAudioAnalysis.js`
    -   `src/lib/utils.js` (for shadcn/ui)
    -   `src/styles/globals.css`
    -   `jsconfig.json` (to support `@/` imports)
    -   `postcss.config.js`
    -   `tailwind.config.js`
    -   `components.json` (for shadcn/ui)

### 2. Dependencies

-   Install the following dependencies:
    -   `react-router-dom`
    -   `lucide-react`
    -   `framer-motion`
    -   `react-youtube`
    -   `tailwindcss-animate`
    -   `class-variance-authority`
    -   `clsx`
    -   `tailwind-merge`
    -   `radix-ui/*` (as needed by shadcn/ui components)
    -   `firebase`

### 3. Backend

-   The backend logic will be rebuilt using Firebase Firestore.
-   A `firebase.js` configuration file will be created.
-   The `ChopSession` entity logic will be adapted to work with Firestore.

### 4. Styling

-   The application will be styled using Tailwind CSS and `shadcn/ui`.

### 5. Routing

-   `react-router-dom` will be used for routing between the `ChopperPage` and `MySessions` page.
