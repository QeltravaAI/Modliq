import axios from "axios";

const API_URL =
  "http://localhost:5000";

export const getDashboardStats =
  async () => {

    const response =
      await axios.get(
        `${API_URL}/dashboard`
      );

    return response.data;
};