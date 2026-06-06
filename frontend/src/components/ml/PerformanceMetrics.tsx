interface PerformanceMetricsProps {
  metrics: {
    mae: number;
    mse: number;
    rmse: number;
    r2_score: number;
  };
}

export default function PerformanceMetrics({
  metrics,
}: PerformanceMetricsProps) {

  return (

    <div className="bg-white rounded-2xl border p-6 shadow-sm">

      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Model Performance
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* MAE */}
        <div className="border rounded-2xl p-5">

          <h3 className="text-gray-600 font-semibold">
            MAE
          </h3>

          <p className="text-3xl font-bold text-black mt-3">
            {metrics.mae}
          </p>

        </div>

        {/* MSE */}
        <div className="border rounded-2xl p-5">

          <h3 className="text-gray-600 font-semibold">
            MSE
          </h3>

          <p className="text-3xl font-bold text-black mt-3">
            {metrics.mse}
          </p>

        </div>

        {/* RMSE */}
        <div className="border rounded-2xl p-5">

          <h3 className="text-gray-600 font-semibold">
            RMSE
          </h3>

          <p className="text-3xl font-bold text-black mt-3">
            {metrics.rmse}
          </p>

        </div>

        {/* R2 */}
        <div className="border rounded-2xl p-5">

          <h3 className="text-gray-600 font-semibold">
            R² Score
          </h3>

          <p className="text-3xl font-bold text-black mt-3">
            {metrics.r2_score}
          </p>

        </div>

      </div>

    </div>
  );
}