import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Layers, Volume2, Save, AlertCircle } from 'lucide-react';
import { ChopSession } from '@/entities/ChopSession';
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from '@/context/AuthContext';

export default function Controls({ activeBank, setActiveBank, masterVolume, setMasterVolume, chops, youtubeUrl }) {
    const banks = ['A', 'B', 'C', 'D'];
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [sessionName, setSessionName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!currentUser) {
            toast({
                variant: "destructive",
                title: "Authentication Required",
                description: "You must be signed in to save a session.",
            });
            return;
        }

        if (!sessionName) {
             toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: "Please enter a name for your session.",
            });
            return;
        }
        setIsSaving(true);
        try {
            await ChopSession.create({
                sessionName,
                youtubeUrl,
                chops,
                userId: currentUser.uid,
            });
            toast({
                title: "Session Saved!",
                description: `"${sessionName}" has been saved successfully.`,
            });
        } catch (error) {
            console.error("Failed to save session:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Could not save your session. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
        <Toaster />
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-4 space-y-6"
        >
            {/* Bank Controls */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Layers className="w-4 h-4 text-cyan-400"/>
                    Sample Banks
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {banks.map(bank => (
                        <Button
                            key={bank}
                            onClick={() => setActiveBank(bank)}
                            className={`font-mono text-lg transition-all duration-200
                                ${activeBank === bank ? 'bg-cyan-500 text-black shadow-md' : 'bg-white/10 hover:bg-white/20'}`
                            }
                        >
                            {bank}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Volume2 className="w-4 h-4 text-cyan-400"/>
                    Master Volume
                </label>
                <Slider 
                    defaultValue={[100]} 
                    max={100} 
                    step={1} 
                    onValueChange={(value) => setMasterVolume(value[0] / 100)}
                    className="[&>span:first-child]:bg-cyan-400"
                />
            </div>
            
            {/* Save Session */}
            <div className="space-y-3 pt-4 border-t border-white/10">
                 <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Save className="w-4 h-4 text-cyan-400"/>
                    Save Session
                </label>
                {currentUser ? (
                    <>
                        <Input 
                            placeholder="Session Name..."
                            value={sessionName}
                            onChange={(e) => setSessionName(e.target.value)}
                            className="bg-white/10 border-white/20 placeholder-gray-400"
                        />
                        <Button onClick={handleSave} disabled={isSaving || !currentUser} className="w-full bg-purple-600 hover:bg-purple-700 font-bold">
                            {isSaving ? 'Saving...' : 'Save Chops'}
                        </Button>
                    </>
                ) : (
                    <div className="text-center text-sm text-white/60 p-4 bg-black/20 rounded-lg">
                        <p>Please sign in to save your sessions.</p>
                    </div>
                )}
            </div>
        </motion.div>
        </>
    );
}