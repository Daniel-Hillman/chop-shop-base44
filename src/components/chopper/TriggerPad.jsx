import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TriggerPad({ padId, keyLabel, isAssigned, isSelected, color, onClick }) {
    const [isTriggered, setIsTriggered] = useState(false);

    const handleClick = () => {
        onClick();
        setIsTriggered(true);
    };

    useEffect(() => {
        if (isTriggered) {
            const timer = setTimeout(() => setIsTriggered(false), 150);
            return () => clearTimeout(timer);
        }
    }, [isTriggered]);

    const padVariants = {
        idle: { scale: 1, boxShadow: '0px 4px 10px rgba(0,0,0,0.3)' },
        triggered: { scale: 0.95, boxShadow: `0px 0px 20px ${color || '#06b6d4'}` },
    };

    return (
        <motion.button
            variants={padVariants}
            animate={isTriggered ? 'triggered' : 'idle'}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            onClick={handleClick}
            className={`relative w-full h-full rounded-lg transition-all duration-200 focus:outline-none flex flex-col justify-between p-2
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-black/20 ring-cyan-400' : ''}
                ${isAssigned ? 'bg-white/20' : 'bg-black/30'}
            `}
            style={{
                backgroundColor: isAssigned ? `${color}40` : '', // 40 for alpha
                border: `1px solid ${isAssigned ? color : 'rgba(255,255,255,0.2)'}`
            }}
        >
            <span className="text-xs font-mono text-white/50 self-start">{padId.slice(1)}</span>
            <span className="text-lg font-bold text-white/70 self-center">{keyLabel?.toUpperCase()}</span>
            {isAssigned && (
                <div 
                    className="w-2 h-2 rounded-full self-end" 
                    style={{backgroundColor: color}}
                />
            )}
        </motion.button>
    );
}