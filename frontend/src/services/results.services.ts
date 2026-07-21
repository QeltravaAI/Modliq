import axios from "axios";
import { API_URL } from "@/lib/config";

export const getResults =
  async () => {

    const response =
      await axios.get(
        `${API_URL}/results`
      );

    return response.data;
  };
