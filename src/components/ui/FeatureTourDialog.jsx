import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Globe, Lightbulb, Zap, Gem, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  { icon: Lightbulb, title: "Intuitive Sampling", description: "Easily chop YouTube videos into custom samples." },
  { icon: Zap, title: "Live Performance", description: "Trigger samples instantly with keyboard shortcuts." },
  { icon: Globe, title: "Web-Based Access", description: "Use it anywhere, anytime, directly in your browser." },
];

const LOCAL_STORAGE_KEY = 'chopshop_feature_tour_shown'; 

export default function FeatureTourDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const tourShown = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!tourShown) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px] bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-white border-white/20 shadow-lg">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <Gem className="w-16 h-16 mx-auto text-yellow-400 drop-shadow-lg" />
          </motion.div>
          <DialogTitle className="text-3xl font-bold tracking-tighter mt-4">Welcome to The Chop Shop!</DialogTitle> 
          <DialogDescription className="text-white/80 mt-2">
            Unleash your creativity by sampling YouTube videos with ease.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 100, damping: 10 }}
              className="flex items-start gap-4 p-3 bg-black/20 rounded-lg border border-white/10"
            >
              <feature.icon className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="text-white/70 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 100, damping: 10 }}
          className="text-center mt-6 p-4 bg-purple-900/40 rounded-xl border border-purple-700/50 shadow-inner"
        >
          <p className="text-yellow-200 font-bold flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            One-Time Purchase, Free Lifetime Upgrades!
          </p>
          <p className="text-white/70 text-sm mt-1">
            Get all future features and improvements at no extra cost.
          </p>
        </motion.div>

        <DialogFooter className="mt-6">
          <Button
            onClick={handleClose}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 text-lg rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
          >
            Let's Get Chopping!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
