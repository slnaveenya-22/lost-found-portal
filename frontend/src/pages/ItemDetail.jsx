import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function ItemDetail() {
  const { type, reportId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/items/detail/${type}/${reportId}`);
        setItem(response.data.item);
      } catch (err) {
        setError("Item not found.");
      }
    };
    fetchItem();
  }, [type, reportId]);

  const handleClaim = () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      // Guest trying a restricted action — send them to log in first
      navigate("/login");
      return;
    }
    // Claiming itself (Story 8) isn't built yet — placeholder for now
    alert("Claim functionality is coming soon (Story 8).");
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{item.item_name}</h2>
          <span
            className={`text-xs px-2 py-1 rounded ${
              item.type === "lost" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
            }`}
          >
            {item.type === "lost" ? "Lost" : "Found"}
          </span>
        </div>

        {item.image_url ? (
          <img
            src={`http://localhost:5000${item.image_url}`}
            alt={item.item_name}
            className="w-full h-64 object-cover rounded mb-4"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 rounded mb-4 flex items-center justify-center text-gray-400">
            No photo available
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          <div><span className="font-medium">Category:</span> {item.category}</div>
          <div><span className="font-medium">Color:</span> {item.color || "—"}</div>
          <div><span className="font-medium">Brand:</span> {item.brand || "—"}</div>
          <div><span className="font-medium">Status:</span> {item.status}</div>
          <div><span className="font-medium">Location:</span> {item.location}</div>
          <div><span className="font-medium">Date:</span> {new Date(item.date_time).toLocaleString()}</div>
        </div>

        {item.description && (
          <div className="mb-4">
            <span className="font-medium text-sm">Description:</span>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">Report ID: {item.report_id}</p>

        {item.type === "found" && (
          <button
            onClick={handleClaim}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Claim This Item
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemDetail;