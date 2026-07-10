"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

import { uploadDatasetV1 } from "@/services/optimization.service";
import { usePipelineStore } from "@/store/pipelineStore";

export default function DataUploadPage() {
  const router = useRouter();

  const { setDataset } = usePipelineStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const doUpload = async (file: File) => {
    setLoading(true);
    try {
      const response = await uploadDatasetV1(file);
      setPreviewData(response.preview);
      setAnalytics(response.analytics);
      setUploadedFileName(response.filename);
      setDataset(response.filename, response.analytics);
      alert("Dataset uploaded successfully");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      alert("Please select a CSV file");
      return;
    }
    doUpload(selectedFile);
  };

  const loadDemo = async () => {
    try {
      setLoading(true);
      const res = await fetch("/manufacturing_data.csv");
      const blob = await res.blob();
      const file = new File([blob], "manufacturing_data.csv", {
        type: "text/csv",
      });
      await doUpload(file);
    } catch (e) {
      alert("Could not load demo dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">
              Upload Production Data
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Upload your CSV and let the Process Optimization Copilot find the
              best settings.
            </p>
          </div>

          {/* Upload Section */}
          <div className="mt-10 bg-white rounded-2xl border-2 border-dashed border-gray-300 p-16 flex flex-col items-center justify-center shadow-sm">
            <div className="text-6xl">📂</div>
            <h2 className="mt-4 text-2xl font-bold text-gray-700">
              Drag &amp; Drop CSV File
            </h2>
            <p className="text-gray-500 mt-2">
              or browse dataset from device
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="fileUpload"
            />

            <label
              htmlFor="fileUpload"
              className="mt-6 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition cursor-pointer"
            >
              Browse File
            </label>

            <button
              onClick={loadDemo}
              disabled={loading}
              className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load Manufacturing Demo Dataset"}
            </button>

            {selectedFile && (
              <div className="mt-5 text-green-700 font-semibold">
                Selected File: {selectedFile.name}
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={loading || !selectedFile}
              className="mt-6 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
            >
              Upload Dataset
            </button>

            {uploadedFileName && (
              <button
                onClick={() => router.push("/goal")}
                className="mt-4 px-6 py-3 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition"
              >
                Continue to Set Goal →
              </button>
            )}
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
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">Total Rows</h3>
                  <p className="text-4xl font-bold mt-3">
                    {analytics.totalRows}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">Total Columns</h3>
                  <p className="text-4xl font-bold mt-3">
                    {analytics.totalColumns}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                  <h3 className="text-gray-600 font-semibold">
                    Missing Values
                  </h3>
                  <p className="text-4xl font-bold mt-3">
                    {analytics.missingValues}
                  </p>
                </div>
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
