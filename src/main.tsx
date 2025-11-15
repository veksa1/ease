
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import { migrateLocalStorageToSQLite } from "./services/migrationService";

  // Run migration before rendering app
  migrateLocalStorageToSQLite().then(() => {
    createRoot(document.getElementById("root")!).render(<App />);
  }).catch(error => {
    console.error('Failed to initialize app:', error);
    // Render app anyway
    createRoot(document.getElementById("root")!).render(<App />);
  });
  