export default function ProbabilitySlider({
  id,
  label,
  value,
  onChange,
  step = 0.01,
}) {
  return (
    <div className="probability-slider">
      <div className="probability-slider__header">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{value.toFixed(2)}</output>
      </div>

      <input
        id={id}
        type="range"
        min="0"
        max="1"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuemin="0"
        aria-valuemax="1"
        aria-valuenow={value}
      />
    </div>
  );
}
