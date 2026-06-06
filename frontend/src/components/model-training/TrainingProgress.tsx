interface Props {

  progress: number;

  status: string;
}

export default function TrainingProgress({

  progress,
  status

}: Props) {

  return (

    <div className="bg-white p-6 rounded-2xl border shadow-sm">

      <h2 className="text-2xl font-bold mb-6">
        Training Progress
      </h2>

      {/* Progress Bar */}

      <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">

        <div
          className="bg-blue-600 h-5 transition-all duration-500"
          style={{
            width: `${progress}%`
          }}
        />

      </div>

      {/* Percentage */}

      <div className="mt-4 flex justify-between">

        <span className="font-semibold text-gray-700">
          {status}
        </span>

        <span className="font-bold text-blue-700">
          {progress}%
        </span>

      </div>

    </div>
  );
}