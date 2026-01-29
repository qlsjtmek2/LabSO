# LoL Adaptive Build & Strategy Optimizer (LabSO)

## Project Overview

LabSO is a web application designed to help League of Legends players optimize their builds and analyze strategies. It leverages the Riot Games API to provide data-driven insights, such as adaptive item recommendations, combo damage calculations, and analysis of expert players' match timelines.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Data Source:** Riot Games API, DataDragon
*   **Utilities:** `axios` for API requests, `hangul-js` for Korean search support.

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   A Riot Games API Key (Development Key)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd lol-adaptive-build-optimizer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env.local` file in the root directory and add your Riot API Key:
    ```env
    RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    ```

### Running the Development Server

Start the development server:

```bash
npm run dev
# or with a specific port
npm run dev -- -p 3001
```

Access the application at `http://localhost:3000` (or the port you specified).

## Project Structure

*   `src/app/`: Next.js App Router structure.
    *   `page.tsx`: Main landing page with summoner search and champion list.
    *   `calculator/[id]/`: Champion combo damage calculator page.
    *   `analysis/[matchId]/`: Match timeline and strategy analysis page.
    *   `api/`: Backend API routes acting as a proxy to Riot API.
*   `src/lib/`: Utility functions.
    *   `riotApi.ts`: Functions to interact with Riot Games API (Summoner, Match, Timeline).
    *   `dataDragon.ts`: Functions to fetch static data (Champions, Items) from DataDragon.
*   `docs/plans/`: Project requirements and roadmap documents.

## Key Features

1.  **Summoner Search & Match History:**
    *   Search for summoners by Name and Tag.
    *   View recent match history with KDA and win/loss status.

2.  **Champion Combo Calculator:**
    *   Select a champion and level.
    *   Configure items and visualize stat changes.
    *   Build custom skill combos (including Auto Attacks) to calculate burst damage.
    *   Stat bars and item filtering for better usability.

3.  **Expert Strategy Analysis:**
    *   Analyze specific matches from the history.
    *   **Item Build Timeline:** Visual timeline of item purchases.
    *   **Skill Order:** Analysis of skill leveling order.
    *   **Movement Map:** Minimap visualization of player movement over time.

## Development Conventions

*   **Styling:** Use Tailwind CSS utility classes for styling. A dark, neon-themed aesthetic is preferred for this project.
*   **API Usage:** Always use the server-side API routes (`src/app/api/...`) to communicate with Riot API to protect the API Key.
*   **Components:** Prefer functional components with React Hooks.
*   **State Management:** Use local state (`useState`) for page-specific data.

## Note

The Riot API Development Key expires every 24 hours. Ensure you regenerate it and update `.env.local` if you encounter `403` or `401` errors.
