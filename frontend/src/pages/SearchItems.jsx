import { useState } from "react";
import axios from "axios";

function SearchItems() {
  const [filters, setFilters] = useState({
    query: "",
    category: "",
    type: "all",
    dateFrom: "",
    dateTo: "",
  });
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const params = new URLSearchParams();
      if (filters.query) params.append("query", filters.query);
      if (filters.category) params.append("category", filters.category);
      if (filters.type && filters.type !== "all") params.append("type", filters.type);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await axios.get(`http://localhost:5000/api/items/search?${params.toString()}`);
      setResults(response.data.results);
      setSearched(true);
    } catch (err) {
      setError("Something went wrong while searching.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Search Lost & Found Items</h2>

        <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Keyword</label>
              <input
                type="text"
                name="query"
                value={filters.query}
                onChange={handleChange}
                placeholder="e.g. wallet, phone, black bag"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={filters.category}
                onChange={handleChange}
                placeholder="e.g. Electronics"
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                name="type"
                value={filters.type}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="all">All</option>
                <option value="lost">Lost only</option>
                <option value="found">Found only</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">From</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
        )}

        {searched && results.length === 0 && !error && (
          <div className="text-center text-gray-500">No items found matching your search.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-4 flex gap-4">
              {item.image_url ? (
                <img
                  src={`http://localhost:5000${item.image_url}`}
                  alt={item.item_name}
                  className="w-20 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                  No photo
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold">{item.item_name}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      item.type === "Lost" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {item.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{item.category} • {item.location}</p>
                <p className="text-sm text-gray-500">{new Date(item.date_time).toLocaleDateString()}</p>
                <p className="text-xs text-gray-400 mt-1">{item.report_id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchItems;