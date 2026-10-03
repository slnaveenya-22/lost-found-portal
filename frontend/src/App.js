import { BrowserRouter, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ReportLostItem from "./pages/ReportLostItem";
import ReportFoundItem from "./pages/ReportFoundItem";
import SearchItems from "./pages/SearchItems";
import ItemDetail from "./pages/ItemDetail";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/report-lost" element={<ReportLostItem />} />
          <Route path="/report-found" element={<ReportFoundItem />} />
          <Route path="/search" element={<SearchItems />} />
          <Route path="/item/:type/:reportId" element={<ItemDetail />} />
          <Route path="/" element={<Login />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;