import { messages } from './messages.vi';

export function PlaceholderPage({
  title,
  isChat = false,
}: {
  title: string;
  isChat?: boolean;
}) {
  return (
    <div className="max-w-copy space-y-6">
      <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
      <p className="text-neutral-700">{messages.placeholder}</p>
      {isChat && (
        <p className="rounded-control bg-primary-50 p-4 text-sm text-primary-700">
          {messages.medicalNote}
        </p>
      )}
    </div>
  );
}
