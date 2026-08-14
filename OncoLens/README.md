# OncoLens

Cancer Genomics & Biomarker Discovery Platform — a React + Vite demo dashboard.

## Run in VS Code

1. Unzip this project and open the folder in VS Code.
2. Open a terminal (Terminal → New Terminal) and install dependencies:

   ```bash
   npm install
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Project structure

```
OncoLens/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx     # React entry point
    └── App.jsx      # OncoLens application (dashboard, charts, pages)
```

## Notes

This application is intended for research and educational purposes. Computational findings should not be interpreted as clinical diagnosis, treatment recommendations, or validated clinical biomarkers.
