# Just 6 Weeks - PWA with Backend

This project has been converted to a full-stack Progressive Web App.

## Prerequisites
- Node.js installed on your machine.
- A terminal (PowerShell, Command Prompt, or Git Bash).

## Structure
- `client/`: The Frontend (React + Vite + Tailwind).
- `server/`: The Backend (Node.js + Express + SQLite).
- `server/database.sqlite`: The database file (auto-created on first run).

## Setup Instructions

Since I was unable to run commands in your environment, you need to install the dependencies manually.

1.  **Install Server Dependencies**:
    ```bash
    cd server
    npm install
    ```

2.  **Install Client Dependencies**:
    ```bash
    cd ../client
    npm install
    ```

## Development (Running Locally)

To run the app in development mode (with hot reload):

1.  **Start the Backend** (in terminal 1):
    ```bash
    cd server
    npm run dev
    ```
    (Runs on port 3000)

2.  **Start the Frontend** (in terminal 2):
    ```bash
    cd client
    npm run dev
    ```
    (Runs on port 5173. It proxies API requests to localhost:3000).

## Deployment (Uploading to Web Server)

To prepare the app for your web server:

1.  **Build the Client**:
    ```bash
    cd client
    npm run build
    ```
    This creates a `dist` folder in `client/`.

2.  **Prepare the Server**:
    The server is configured to serve the `client/dist` folder automatically.

3.  **Upload**:
    Upload the entire project to your web server.
    On the server, run:
    ```bash
    cd server
    npm install --production
    node index.js
    ```
    
    The app will be available at `http://your-server-ip:3000`.

## PWA
The app is configured as a PWA. To finalize it:
- Add `pwa-192x192.png` and `pwa-512x512.png` to `client/public/`.
