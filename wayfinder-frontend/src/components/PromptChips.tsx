interface Props {
  onPick: (text: string) => void;
  disabled?: boolean;
}

const PROMPTS: { label: string; text: string }[] = [
  {
    label: "Somewhere old, with bread and a river",
    text:
      "I want somewhere that feels old, with the smell of bread and a river running through it. Where should I go?",
  },
  {
    label: "What does Mysuru feel like?",
    text: "What does an afternoon in Mysuru actually feel like to walk through?",
  },
  {
    label: "Lagos vs. Tokyo soundscapes",
    text: "Compare the soundscape of Lagos and Tokyo for me.",
  },
  {
    label: "Jasmine and the sound of bells",
    text:
      "I love the smell of jasmine and the sound of bells. Pick three cities that might suit me.",
  },
];

export default function PromptChips({ onPick, disabled }: Props) {
  return (
    <div className="prompt-chips">
      <div className="prompt-chips-label">Try one</div>
      <div className="prompt-chips-row">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            className="prompt-chip"
            onClick={() => onPick(p.text)}
            disabled={disabled}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
