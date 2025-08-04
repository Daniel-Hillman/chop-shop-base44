import React, { useState, useEffect } from 'react';
import { ChopSession } from '@/entities/ChopSession';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, Trash2, HardDrive, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import LoginModal from '@/components/ui/LoginModal';

export default function MySessionsPage() {
    const [sessions, setSessions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading } = useAuth(); // Use 'user' instead of 'currentUser'
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            loadSessions();
        } else if (!loading && !user) {
            setIsLoading(false);
            setSessions([]);
        }
    }, [user, loading]);

    const loadSessions = async () => {
        setIsLoading(true);
        try {
            const savedSessions = await ChopSession.list('-created_date');
            setSessions(savedSessions);
        } catch (error) {
            console.error("Failed to load sessions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteSession = async (sessionId) => {
        try {
            await ChopSession.delete(sessionId);
            setSessions(sessions.filter(s => s.id !== sessionId));
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    };

    const getYoutubeThumbnail = (url) => {
        if (!url) return '';
        const videoIdMatch = url.match(/(?:v=)([^&?]+)/) || url.match(/(?:youtu.be\/)([^&?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : '';
        return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
    };

    if (loading) {
        return (
            <div className="text-center col-span-full py-20 bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl">
                <p className="text-white/70">Loading sessions...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="text-center col-span-full py-20 bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl">
                <p className="text-white/70">Please sign in to view your saved sessions.</p>
                <Button onClick={() => setIsLoginModalOpen(true)} className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                </Button>
                <LoginModal isOpen={isLoginModalOpen} onOpenChange={setIsLoginModalOpen} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 text-3xl font-bold tracking-tighter"
            >
                <HardDrive className="w-8 h-8 text-cyan-400" />
                <h2>My Saved Sessions</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Card key={i} className="bg-black/20 backdrop-blur-lg border border-white/20 text-white overflow-hidden">
                                <CardHeader>
                                    <Skeleton className="h-40 -mx-6 -mt-6" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-6 w-3/4 mb-2" />
                                    <Skeleton className="h-4 w-1/2" />
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <Skeleton className="h-10 w-24" />
                                    <Skeleton className="h-10 w-10" />
                                </CardFooter>
                            </Card>
                        ))
                    ) : (
                        sessions.map(session => (
                            <motion.div
                                key={session.id}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            >
                                <Card className="bg-black/20 backdrop-blur-lg border border-white/20 text-white overflow-hidden shadow-xl hover:shadow-cyan-500/20 transition-shadow duration-300 h-full flex flex-col">
                                    <CardHeader className="p-0">
                                        <img src={getYoutubeThumbnail(session.youtubeUrl)} alt={session.sessionName} className="w-full h-40 object-cover" />
                                    </CardHeader>
                                    <div className="p-6 flex flex-col flex-grow">
                                        <CardTitle className="tracking-tight">{session.sessionName}</CardTitle>
                                        <CardDescription className="text-white/60 flex items-center gap-2 mt-1">
                                            <ListMusic className="w-4 h-4" />
                                            {session.chops?.length || 0} Chops
                                        </CardDescription>
                                        <div className="flex-grow" />
                                        <CardFooter className="p-0 pt-6 flex justify-between items-center">
                                            <Link to={`/?sessionId=${session.id}`}>
                                                <Button className="bg-cyan-500 hover:bg-cyan-600 text-black font-bold">Load</Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/20" onClick={() => deleteSession(session.id)}>
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </CardFooter>
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
             { !isLoading && sessions.length === 0 && (
                <div className="text-center col-span-full py-20 bg-black/20 backdrop-blur-lg border border-white/20 rounded-2xl">
                    <p className="text-white/70">You have no saved sessions.</p>
                    <Link to="/">
                        <Button className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-black font-bold">Create your first chop!</Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
