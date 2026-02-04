# LoL Adaptive Build & Strategy Optimizer (LabSO)

## Project Overview

LabSO is a web application designed to help League of Legends players optimize their builds and analyze strategies. It leverages the Riot Games API and CommunityDragon to provide data-driven insights, such as adaptive item recommendations, combo damage calculations, and analysis of expert players' match timelines.

## Project Status

- **Phase 1: Core Engine & Pilot (Done)**
- **Phase 1.5: Data Pipeline (Done)**
- **Phase 1.6: Champion Data Precision (Done)**
    - All 172 champions implemented with high-precision skill data (multi-hit, return damage, scaling).
- **Phase 2: Live Data Integration (Next)**
    - Dynamic item data integration.
    - Real-time build rule engine.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Data Source:** Riot Games API (DDragon), CommunityDragon (CDragon)
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
    *   `api/simulate/`: Server-side simulation endpoints.
    *   `calculator/[id]/`: Champion combo damage calculator page.
    *   `build-advisor/`: Team comp and matchup based build recommender.
*   `src/components/`: React components.
    *   `calculator/SimulationSettings.tsx`: Control panel for level, stacks, runes, and dummy stats.
    *   `build-advisor/AnalysisResult.tsx`: Visualizer for power curves and build recommendations.
*   `src/engine/`: Core simulation engine.
    *   `simulator/models/GenericChampion.ts`: Universal champion model handling V2 schema (supports Forms, Pets, Resources).
    *   `simulator/core/damageEngine.ts`: Precise damage calculation logic (Lethality, Penetration).
    *   `simulator/v2/runes/RuneFactory.ts`: Rune logic implementation (Conqueror, Electrocute, PTA).
    *   `simulator/data/samples/`: Generated champion data JSONs (172+ champions).
    *   `simulator/items/itemFactory.ts`: Item effect implementation (BoRK, Kraken, etc.).
*   `scripts/data-pipeline/`: Automated data fetching and conversion scripts.
    *   `fetch_raw_champion_data.ts`: Downloads raw data from CDragon/DDragon.
    *   `convert_champion.ts`: Converts raw data to Engine Schema V2 (Hybrid Parsing).

## Key Features

1.  **Summoner Search & Match History:**
    *   Search for summoners by Name and Tag.
    *   View recent match history with KDA and win/loss status.

2.  **Advanced Champion Simulator:**
    *   **Precision Engine:** Calculates damage using official LoL formulas (Lethality scaling, Armor/MR penetration order).
    *   **Universal Support:** Supports all 172+ champions via automated data pipeline.
    *   **Specialized Mechanics:**
        *   **Transformations:** Nidalee (Human/Cougar), Jayce (Cannon/Hammer), Elise (Human/Spider).
        *   **Stacking:** Nasus (Q), Veigar (AP), Senna (Range/Crit), Kindred (Range).
        *   **Health Costs:** Vladimir (Blood), Zac (Health Blobs).
        *   **Summoned Units:** Heimerdinger Turrets, Zyra Plants, Yorick Ghouls, Malzahar Voidlings.
    *   **Rune System:** Implemented Conqueror, Electrocute, Press the Attack, Lethal Tempo.
    *   **Simulation Settings:** Customize Champion Level, Skill Points, Stacks, Runes, and Target Dummy stats (Armor/MR/HP).
    *   **Visualization:** Power Curve graphs (Lv 6/11/16/18) showing Damage vs Survivability (EHP).

3.  **Build Advisor:**
    *   Analyze team compositions and matchups.
    *   Recommend optimal builds using Genetic Algorithms (`simulatePowerCurve`).
    *   Provide strategy guides based on enemy composition (e.g. Anti-Tank, Anti-Assassin).

## Development Conventions

*   **Styling:** Use Tailwind CSS utility classes for styling. A dark, neon-themed aesthetic is preferred for this project.
*   **API Usage:** Always use the server-side API routes (`src/app/api/...`) to communicate with Riot API to protect the API Key.
*   **Simulation Data:** DO NOT manually edit champion JSONs. Use `scripts/data-pipeline` to regenerate data from official sources.
*   **Components:** Prefer functional components with React Hooks.

## Note

The Riot API Development Key expires every 24 hours. Ensure you regenerate it and update `.env.local` if you encounter `403` or `401` errors.
