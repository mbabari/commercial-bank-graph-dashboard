# Publishing this repository for customers

This tree is a **sanitised** copy of the Commercial Bank Graph dashboard. Configure your own Neo4j Aura instance; **never** commit real passwords.

## Before you push to GitHub

1. Create a public repository (suggested name: `commercial-bank-graph-dashboard`).

2. Replace `YOUR_GITHUB_ORG` in `README.md` with your GitHub user or organisation.

3. Keep `.env.local` out of git (see `.gitignore`). Copy from `.env.example` and fill in your Aura URI and password locally only.

4. Pair this app with the **commercial-bank-graph-demo** repo: load data using that project’s Cypher scripts (or `neo4j-mcp-server/load_demo.mjs` with env vars), then run `06_entity_resolution.cypher` so the Entity Resolution page has `POTENTIAL_MATCH` data.
