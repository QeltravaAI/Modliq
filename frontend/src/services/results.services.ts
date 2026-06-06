import axios from "axios";

const API_URL =
  "http://localhost:5000";

export const getResults =
  async () => {

    const response =
      await axios.get(
        `${API_URL}/results`
      );

    return response.data;
};