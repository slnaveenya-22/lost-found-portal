import { useState } from "react";
import axios from "axios";

function ReportLostItem() {
  const [formData, setFormData] = useState({
    category: "",
    item_name: "",
    color: "",
    brand: "",
    location: "",
    date_time: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const storedUser = localStorage.getItem("user");
    if (!storedUser) {
      setError("You must be logged in to report a lost item.");
      return;
    }
    const user = JSON.parse(storedUser);

    if (!formData.category || !formData.item_name || !formData.location || !formData.date_time) {
      setError("Category, item name, location, and date are required");
      return;
    }

    try {
      const data = new FormData();
      data.append("user_id", user.id);
      data.append("category", formData.category);
      data.append("item_name", formData.item_name);
      data.append("color", formData.color);
      data.append("brand", formData.brand);
      data.append("location", formData.location);
      data.append("date_time", formData.date_time);
      data.append("description", formData.description);
      if (image) {
        data.append("image", image);
      }

      const response = await axios.post("http://localhost:5000/api/items/lost", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(`${response.data.message} (Report ID: ${response.data.reportId})`);
      setFormData({
        category: "",
        item_name: "",
        color: "",
        brand: "",
        location: "",
        date_time: "",
        description: "",
      });
      setImage(null);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-8">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Report a Lost Item</h2>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Category</label>
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Electronics, Bag, ID Card"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Item Name</label>
          <input
            type="text"
            name="item_name"
            value={formData.item_name}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Color</label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Brand</label>
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g. Library, 2nd floor"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Date & Time Lost</label>
          <input
            type="datetime-local"
            name="date_time"
            value={formData.date_time}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            rows="3"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Photo (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Submit Report
        </button>
      </form>
    </div>
  );
}

export default ReportLostItem;