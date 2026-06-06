"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import { uploadDataset } from "@/services/dataset.service";

import { useModelResultStore } from "@/store/modelResultStore";

import { useRouter } from "next/navigation";

export default function DataUploadPage() {
  const router = useRouter();

  // Selected CSV file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preview rows
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  
  // Uploaded filename
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
    }
  };

  // Upload dataset
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a CSV file");

      return;
    }

    try {
      const response = await uploadDataset(selectedFile);

      console.log(response);

      // Store preview
      setPreviewData(response.preview);

      // Store analytics
      setAnalytics(response.analytics);

      // Store filename
      setUploadedFileName(response.filename);

      alert("Dataset uploaded successfully");
    } catch (error) {
      console.error(error);

      alert("Upload failed");
    }
  };


  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1">
        {/* Navbar */}
        <Navbar />

        <div className="p-8">
          {/* Heading */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Upload Dataset</h1>

            <p className="text-gray-600 mt-2 text-lg">
              Upload CSV datasets and train ML models
            </p>
          </div>

          {/* Upload Section */}
          <div className="mt-10 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 flex flex-col items-center justify-center shadow-sm">
            {/* Upload Icon */}
            <div className="text-6xl">📂</div>

            {/* Title */}
            <h2 className="mt-4 text-2xl font-bold text-gray-700">
              Drag & Drop CSV File
            </h2>

            <p className="text-gray-500 mt-2">or browse dataset from device</p>

            {/* File Input */}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="fileUpload"
            />

            {/* Browse Button */}
            <label
              htmlFor="fileUpload"
              className="mt-6 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition cursor-pointer"
            >
              Browse File
            </label>

            {/* Selected File */}
            {selectedFile && (
              <div className="mt-5 text-green-700 font-semibold">
                Selected File: {selectedFile.name}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              className="mt-6 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
            >
              Upload Dataset
            </button>
          </div>

          {/* Dataset Preview */}
          {previewData.length > 0 && (
            <div className="mt-10 bg-white rounded-2xl p-6 border shadow-sm overflow-auto">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Dataset Preview
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      {Object.keys(previewData[0]).map((key) => (
                        <th
                          key={key}
                          className="border border-gray-400 p-3 text-left text-gray-900 font-bold"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        {Object.values(row).map((value: any, i) => (
                          <td
                            key={i}
                            className="border border-gray-300 p-3 text-gray-800"
                          >
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analytics */}
          {analytics && (
            <div className="mt-10">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Dataset Analytics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Rows */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">Total Rows</h3>

                  <p className="text-4xl font-bold mt-3">
                    {analytics.totalRows}
                  </p>
                </div>

                {/* Columns */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">Total Columns</h3>

                  <p className="text-4xl font-bold mt-3">
                    {analytics.totalColumns}
                  </p>
                </div>

                {/* Missing */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">
                    Missing Values
                  </h3>

                  <p className="text-4xl font-bold mt-3">
                    {analytics.missingValues}
                  </p>
                </div>

                {/* Numeric */}
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">
                    Numeric Columns
                  </h3>

                  <p className="mt-3 text-gray-900 font-medium">
                    {analytics.numericColumns?.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

        
        </div>
      </div>
    </div>
  );
}
