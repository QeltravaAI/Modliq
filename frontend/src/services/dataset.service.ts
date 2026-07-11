import axios from "axios";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).trim();

export const uploadDataset = async (
  file: File
) => {

  const formData = new FormData();

  formData.append("dataset", file);

  const response = await axios.post(
    `${API_URL}/upload`,
    formData,
    {
      headers: {
        "Content-Type":
          "multipart/form-data",
      },
    }
  );

  return response.data;
};