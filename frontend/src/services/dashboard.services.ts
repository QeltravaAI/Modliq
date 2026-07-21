import axios from "axios";
import { API_URL } from "@/lib/config";

export const getDashboardStats =
  async () => {

    const response =
      await axios.get(
        `${API_URL}/dashboard`
      );

    return response.data;
  };
