
import React, { useId } from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    id?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, id }) => {
    const autoId = useId();
    const inputId = id || `toggle-${autoId}`;
    return (
        <label htmlFor={inputId} className="flex items-center cursor-pointer">
            <div className="relative">
                <input 
                    id={inputId}
                    type="checkbox" 
                    className="sr-only" 
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${checked ? 'transform translate-x-6 bg-sky-400' : ''}`}></div>
            </div>
        </label>
    );
}
