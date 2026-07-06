# Flam Assignment

Flam Assignment is a collaborative whiteboard inspired by tools like Excalidraw and FigJam. It supports real-time room-based collaboration, drawing tools, selection and transformation interactions, local autosave, export workflows, and a LAN-friendly client/server setup for demos and internship submissions.

## Project Overview

The application is split into a Vite React frontend and a Socket.IO/Express backend. Users enter a name, join or create a room, and collaborate in real time on a shared canvas. The experience is designed to work on the same machine or across devices on the same local network.

## Features

- Real-time room collaboration
- Freehand pencil, eraser, line, arrow, rectangle, circle, ellipse, and text tools
- Select, move, resize, duplicate, lock, and layer controls
- Undo and redo history
- Grid, snap-to-grid, zoom, pan, and keyboard shortcuts
- Participant presence and cursor sync
- Local autosave and restore per room
- Export to JSON, PNG, and SVG
- Mobile-responsive landing experience and canvas shell

## Architecture

The frontend owns the canvas UI, state management, and rendering pipeline. The backend owns room membership, socket synchronization, validation, and in-memory room state.

- `client/src/pages` handles routing and screen-level composition
- `client/src/components` contains the canvas shell and toolbar UI
- `client/src/lib/canvas` contains geometry, rendering, and export logic
- `client/src/store` contains global app, room, canvas, history, selection, socket, and UI state
- `server/src/socket` manages Socket.IO events and room broadcasts
- `server/src/services` stores room state and mutation logic
- `server/src/utils` contains room and payload helpers

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Zustand, Framer Motion, Tailwind CSS
- Backend: Node.js, Express, Socket.IO, TypeScript
- Testing: Vitest
- Networking: Socket.IO client/server, HTTP fetch for room endpoints

## Setup Instructions

### Prerequisites

- Node.js 20+ recommended
- pnpm installed globally

### Install

```bash
pnpm install
pnpm --prefix client install
pnpm --prefix server install
```

### Run locally

```bash
pnpm run dev
```

This starts both frontend and backend.

### Access from the same network

- Frontend: `http://<your-lan-ip>:5173`
- Backend: `http://<your-lan-ip>:4000`

The client falls back to the current host when environment variables are not set, which helps the app work on localhost and on the LAN.

### Environment variables

Client `.env`:

```env
VITE_API_URL=http://<your-lan-ip>:4000
VITE_SOCKET_URL=http://<your-lan-ip>:4000
VITE_SOCKET_TOKEN=demo-token
```

Server `.env`:

```env
PORT=4000
CLIENT_URL=http://localhost:5173,http://<your-lan-ip>:5173
SOCKET_AUTH_TOKEN=demo-token
```

## Folder Structure

```text
client/
  src/
    components/
    hooks/
    lib/
    pages/
    services/
    socket/
    store/
    types/
    utils/
server/
  src/
    controllers/
    middlewares/
    routes/
    services/
    socket/
    types/
    utils/
```

## Performance Optimizations

- Canvas drawing is isolated from most React state updates
- Viewport-based rendering avoids drawing offscreen objects
- Dirty-rectangle clearing reduces unnecessary canvas work when possible
- Resize handling uses `ResizeObserver` and `requestAnimationFrame`
- Object autosave is debounced to reduce storage writes
- Socket object batching reduces broadcast chatter

## Future Improvements

- Persistent backend storage for rooms and documents
- Authentication and invite links
- Better multi-user conflict resolution for simultaneous transforms
- Presence avatars and richer cursor trails
- Dedicated mobile toolbar and gesture support
- Export presets and image compression controls
- End-to-end tests for join flow and collaboration scenarios

## Screenshots

Add screenshots here after capturing the landing page and the canvas room view.

## Demo

- Open the landing page
- Enter a name
- Join an existing room ID or create a new room
- Open the app from a second device on the same network and join the same room

## Deployment

### Frontend on Vercel

Deploy the `client` app as a Vite static site. Set the client environment variables to point to the backend URL.

### Backend on Render or Railway

Deploy the `server` app as a Node service. Set `PORT`, `CLIENT_URL`, and `SOCKET_AUTH_TOKEN`. Update the frontend environment variables to the deployed backend URL.

## Verification

Run:

```bash
pnpm --prefix client run build
pnpm --prefix client run test
pnpm --prefix server run build
pnpm --prefix server run test
```