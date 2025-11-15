
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { migrateLocalStorageToSQLite } from "./services/migrationService";
  import { migraineService } from "./services/migraineService";

  // Run migration and initialize migraine service before rendering app
  Promise.all([
    migrateLocalStorageToSQLite(),
    migraineService.initSchema()
  ]).then(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  }).catch(error => {
    console.error('Failed to initialize app:', error);
    // Render app anyway
    createRoot(document.getElementById("root")!).render(<App />);
  });
  