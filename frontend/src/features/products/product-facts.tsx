import { useState } from 'react';
import { ArrowSquareOut, Database } from '@phosphor-icons/react';
import type { Nutrition } from '@/lib/api/catalog.types';
import { formatAmount, type ReadyNutrition } from '@/lib/nutrition';
import { cn } from '@/lib/utils';
import { fdcId, portionOptions, scaleTo } from './portion';

const weightUnits = ['g', 'ml'];

// Quick portion maths straight from the serving data (D28). Only offered when the serving
// is measured in g or ml, so the scale is a plain proportion.
export function PortionCard({ ready }: { ready: ReadyNutrition }) {
  const { nutrition, servingSize, servingUnit } = ready;
  const [amount, setAmount] = useState(servingSize);
  if (!weightUnits.includes(servingUnit) || servingSize <= 0) return null;
  const cells: {
    key: keyof Nutrition;
    term: string;
    tone: string;
  }[] = [
    { key: 'calories', term: 'kcal', tone: 'energy' },
    { key: 'protein_g', term: 'g protein', tone: 'protein' },
    { key: 'carbs_g', term: 'g carb', tone: 'carb' },
    { key: 'fat_g', term: 'g béo', tone: 'fat' },
    { key: 'fiber_g', term: 'g chất xơ', tone: 'fiber' },
  ];
  return (
    <section
      aria-labelledby="portion-heading"
      className="space-y-3 rounded-card border border-line bg-surface p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="portion-heading"
          className="font-mono text-xs font-semibold tracking-normal text-ink-muted uppercase"
        >
          Theo khẩu phần
        </h2>
        <div
          role="group"
          aria-label="Chọn khẩu phần"
          className="flex rounded-pill bg-sunken p-1"
        >
          {portionOptions(servingSize).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={amount === option}
              onClick={() => setAmount(option)}
              className={cn(
                'control-transition min-h-touch rounded-pill px-3 font-mono text-sm font-semibold',
                amount === option ? 'bg-ink text-cream' : 'hover:bg-surface',
              )}
            >
              {formatAmount(option)} {servingUnit}
            </button>
          ))}
        </div>
      </div>
      <dl className="portion-grid" aria-live="polite">
        {cells.map((cell) => {
          const value = nutrition[cell.key];
          // Missing optional values stay missing (fail-closed), never 0.
          if (typeof value !== 'number') return null;
          return (
            <div
              key={cell.key}
              className="portion-cell"
              data-tone={cell.tone}
              style={{ ['--macro' as string]: `var(--macro-${cell.tone})` }}
            >
              <dt>{cell.term}</dt>
              <dd>{formatAmount(scaleTo(value, amount, servingSize))}</dd>
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-ink-muted">
        Tính tỉ lệ từ số liệu {formatAmount(servingSize)} {servingUnit} của
        nhãn, không làm tròn trước khi nhân.
      </p>
    </section>
  );
}

export function SourceCard({ source }: { source: string }) {
  const id = fdcId(source);
  return (
    <section
      aria-labelledby="source-heading"
      className="flex items-start gap-3 rounded-card border border-dashed border-line-strong p-4"
    >
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-control bg-lime-soft text-xl text-brand"
      >
        <Database />
      </span>
      <div className="min-w-0 space-y-1">
        <h2 id="source-heading" className="font-sans text-base font-bold">
          Nguồn số liệu
        </h2>
        <p className="text-sm break-words text-ink-muted">{source}</p>
        {id && (
          <a
            href={`https://fdc.nal.usda.gov/food-details/${id}/nutrients`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-touch items-center gap-1 text-sm font-semibold text-brand underline underline-offset-4"
          >
            Xem bản gốc trên USDA
            <ArrowSquareOut aria-hidden="true" />
            <span className="sr-only">(mở tab mới)</span>
          </a>
        )}
      </div>
    </section>
  );
}
