import axios from "axios";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).trim();

export const getDashboardStats =
  async () => {

    const response =
      await axios.get(
        `${API_URL}/dashboard`
      );

    return response.data;
};