import React from 'react';
import { useMineContext } from '../context/MineContext';
import { useLanguage } from '../context/LanguageContext';
import { Pickaxe, Check, X, MapPin } from 'lucide-react';
import clsx from 'clsx';

interface MineSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MineSelectorModal: React.FC<MineSelectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { mines, selectedMineId, setSelectedMineId } = useMineContext();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleSelect = (id: number) => {
    setSelectedMineId(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Pickaxe className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm text-slate-100 font-mono uppercase tracking-wider">
              {t('authorizedMines')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 active:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          {t('selectMinePrompt')}
        </p>

        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {mines.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono">
              {t('noMinesAssigned')}
            </div>
          ) : (
            mines.map((mine) => {
              const isSelected = mine.id === selectedMineId;
              return (
                <button
                  key={mine.id}
                  onClick={() => handleSelect(mine.id)}
                  className={clsx(
                    'w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between min-h-[52px] active:scale-[0.98]',
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-sm shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 active:bg-slate-800'
                  )}
                >
                  <div className="space-y-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-100 font-sans">
                        {mine.name}
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                        {mine.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-sans">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{mine.district || mine.state}, {mine.state}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-[11px] text-amber-400/90">{mine.mine_type}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-slate-950">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-700" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 text-xs font-semibold uppercase tracking-wider transition-all min-h-[44px]"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
