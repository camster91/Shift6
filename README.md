# Shift6 🚀

**Shift6** is a modern, high-performance Progressive Web App (PWA) designed to help you master 6 foundational bodyweight exercises over a 6-week progression.

Built with **React**, **Vite**, **TailwindCSS**, and **Glassmorphism Design**.

![Shift6 Interface](https://via.placeholder.com/800x400?text=Shift6+Preview)

## ✨ Features

*   **Dynamic Progression**: Automatically adjusts difficulty based on your "Max Effort" set.
*   **Offline Ready (PWA)**: Installable on iOS/Android, works 100% offline.
*   **Deep Analytics**:
    *   **Activity Streaks**: Track your consistency.
    *   **Badges**: Unlock achievements like "Early Bird" and "Week Warrior".
*   **Native Feel**:
    *   **Haptics**: Tactile feedback on interactions.
    *   **Wake Lock**: Keeps your screen awake during workouts (no more unlocking mid-plank!).
    *   **Audio Cues**: Beeps and fanfares for timers and completion.
*   **Data Choice**:
    *   **Local Privacy**: Data lives on your device by default.
    *   **Backup/Restore**: Export your progress to JSON and move it between devices.

## 🛠️ Tech Stack

*   **Frontend**: React 18, Vite 5
*   **Styling**: TailwindCSS, Lucide Icons
*   **Utils**: VitePWA, Web Audio API, Vibration API

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Locally**:
    ```bash
    npm run dev
    ```

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## 📱 Deployment (Hostinger / Vercel)

This project is a static site (SPA). You can deploy the `dist/` folder anywhere.

**Hostinger Setup**:
1.  Set **Root Directory** to the folder containing `package.json` (e.g., `/Just6Weeks`).
2.  **Build Command**: `npm run build`
3.  **Publish Directory**: `dist`

## 🤝 Contributing

This project is personal software, but feel free to fork and modify!
