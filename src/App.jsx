import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdminUpdates from "./pages/adminUpdates";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/manage-a8k3x" element={<AdminUpdates />} />
    </Routes>
  );
}
