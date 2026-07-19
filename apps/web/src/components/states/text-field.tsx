type TextFieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
};

export function TextField({ label, name, type = "text", placeholder }: TextFieldProps) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-border bg-panel px-4 text-sm text-foreground outline-none transition focus:border-brand-red"
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
