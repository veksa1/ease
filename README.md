# EASE — Migraine Risk & Guidance (Junction 2025) by Prae Electus

## Live demo link

https://ease-chi.vercel.app

## Team members

Konsta Kiirikki
Aarni Konola
Veikko Svenyrenko
Lauri Mäkinen
Markus Määttänen

## Vision

Predict, understand, and reduce migraine risk. EASE shows your risk for today, explains why, and guides actions that help.

## Quick Start

- Local: `npm install` → `npm run dev` → open `http://localhost:3000`
- Docker: `npm run docker:dev` → open `http://localhost:3000`
- Windows tip: portable Node is bundled; if npm isn’t found, run npm with `--prefix "ease"` from the workspace root.

## Key Features

- Risk gauge
- Migrane self reportation
- Quick check
- personized checklist to prevent migraine
- Diary and calender to know how to prepare for the future
- Historic trigger combinations for migraine

## Neural Network (ALINE)

- The ALINE neural network predicts the propobilities to get migrane, by using base indicators and learning personal patterns
- The network always updates itself when new information is presented
- Input: 35 variables (sleep, alcohol consumption, weather...)
- Output: propobility of migraine

Correlation matrix: ![alt text](correlation_heatmap.png)
Latent variable distribution: ![alt text](latent_distributions.png)
Migraine propobility vs latent variables: ![alt text](risk_scatter.png)
Variable statistic summary: ![alt text](summary_table.png)
Latent variable temporal evolution: ![alt text](temporal_evolution.png)

## Data

- Susan calendar source: `ALINE/personal_data/susan_data.json` (synthetic)
- Biometics (sleep, screen time...) (synthetic)
- Weather data (pressure, rain...)
- Manually (bmi, age...)

## Results

- No validation/test dataset available to prove the algorithm
- Algorithm would (propobly) work in predicting a persons migrane episodes after learning the patterns of the specific person

## Team & Credits

- Team Prae Electus with product EASE. Built on the ALINE algorithm and open UI primitives.

## Visual

main page: ![alt text](image-2.png)
personalized plan: ![alt text](image-3.png)
