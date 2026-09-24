import React from 'react';
import {
  IoCameraOutline,
  IoHeartOutline,
  IoHomeOutline,
  IoShareSocialOutline,
  IoVideocamOutline
} from 'react-icons/io5';

export interface GradientMenuItem {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  iconColor?: string;
}

const defaultMenuItems: GradientMenuItem[] = [
  { title: 'Home', icon: <IoHomeOutline />, gradientFrom: '#a955ff', gradientTo: '#ea51ff' },
  { title: 'Video', icon: <IoVideocamOutline />, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { title: 'Photo', icon: <IoCameraOutline />, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { title: 'Share', icon: <IoShareSocialOutline />, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { title: 'Tym', icon: <IoHeartOutline />, gradientFrom: '#ffa9c6', gradientTo: '#f434e2' }
];

interface GradientMenuProps {
  items?: GradientMenuItem[];
  onSelect?: (item: GradientMenuItem) => void;
  className?: string;
  compact?: boolean;
}

type GradientStyle = React.CSSProperties & {
  '--gradient-from': string;
  '--gradient-to': string;
};

export default function GradientMenu({
  items = defaultMenuItems,
  onSelect,
  className = '',
  compact = false
}: GradientMenuProps) {
  return (
    <div className={`flex items-center justify-center ${compact ? '' : 'min-h-screen bg-dark'} ${className}`}>
      <ul className="flex flex-wrap justify-center gap-4" aria-label="Gradient command menu">
        {items.map((item) => (
          <li
            key={item.title}
            style={{
              '--gradient-from': item.gradientFrom,
              '--gradient-to': item.gradientTo
            } as GradientStyle}
            className={`group relative flex ${compact ? 'h-11 w-11 hover:w-[150px]' : 'h-[52px] w-[52px] hover:w-[156px]'} cursor-pointer items-center justify-center overflow-hidden rounded-full shadow-lg transition-all duration-500 hover:shadow-none ${compact ? 'border border-[#232923] bg-[#191D19]' : 'bg-white'}`}
          >
            <button
              type="button"
              onClick={() => onSelect?.(item)}
              aria-label={item.title === 'Field App' ? 'Open Field App' : item.title}
              title={item.title === 'Field App' ? 'Open Field App' : item.title}
              className="absolute inset-0 z-40 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A243]"
            />
            <span className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            <span className="absolute inset-x-0 top-[10px] -z-10 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 blur-[15px] transition-opacity duration-500 group-hover:opacity-50" />
            <span className="relative z-30 flex min-w-0 items-center gap-0 group-hover:gap-2">
              <span className={`inline-flex shrink-0 items-center justify-center leading-none text-2xl ${item.iconColor || (compact ? 'text-[#D6A243]' : 'text-gray-500')}`}>
                {item.icon}
              </span>
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm uppercase tracking-wide text-white opacity-0 transition-all duration-300 group-hover:max-w-[120px] group-hover:opacity-100">
                {item.title}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
