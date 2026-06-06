interface Props {

  step: number;

  title: string;

  description: string;

  active?: boolean;
}

export default function StepCard({

  step,
  title,
  description,
  active

}: Props) {

  return (

    <div
      className={`p-6 rounded-2xl border transition
      ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white"
      }`}
    >

      <div className="text-3xl font-bold">
        {step}
      </div>

      <h2 className="text-xl font-bold mt-4">
        {title}
      </h2>

      <p className="mt-2 opacity-80">
        {description}
      </p>

    </div>
  );
}