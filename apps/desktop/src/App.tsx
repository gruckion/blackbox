import { Route, Routes } from "react-router-dom";
import { MainView, SettingsView } from "./views";

function App() {
  return (
    <Routes>
      <Route element={<MainView />} path="/" />
      <Route element={<SettingsView />} path="/settings" />
    </Routes>
  );
}

export default App;
