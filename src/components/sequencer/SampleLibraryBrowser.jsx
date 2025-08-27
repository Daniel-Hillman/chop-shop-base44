import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Download, 
  Play, 
  Pause, 
  Folder, 
  Music, 
  Filter,
  Grid,
  List,
  Star,
  Clock,
  Volume2,
  Tag
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cloudStorageService } from '../../services/sequencer/CloudStorageService.js';
import { SAMPLE_LIBRARY_CONFIG } from '../../config/sampleLibraryConfig.js';

export default function SampleLibraryBrowser({ 
  onSampleSelect, 
  selectedTrackId = null,
  isOpen = false,
  onClose = null 
}) {
  const [packs, setPacks] = useState([]);
  const [selectedPack, setSelectedPack] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [playingPreview, setPlayingPreview] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);

  // Load sample packs on mount
  useEffect(() => {
    loadSamplePacks();
    
    // Cleanup audio on unmount
    return () => {
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }
    };
  }, []);

  const loadSamplePacks = async () => {
    setLoading(true);
    try {
      const publicPacks = await cloudStorageService.listPublicSamplePacks();
      setPacks(publicPacks);
    } catch (error) {
      console.error('Failed to load sample packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPackSamples = async (packId) => {
    setLoading(true);
    try {
      const packData = await cloudStorageService.getSamplePack(packId, true);
      setSamples(packData.samples);
      setSelectedPack(packData);
    } catch (error) {
      console.error('Failed to load pack samples:', error);
    } finally {
      setLoading(false);
    }
  };

  const playPreview = useCallback(async (sample) => {
    try {
      // Stop current preview
      if (audioPreview) {
        audioPreview.pause();
        audioPreview.src = '';
      }

      // Create new audio element
      const audio = new Audio(sample.downloadURL);
      audio.volume = 0.7;
      
      // Set up event listeners
      audio.onended = () => setPlayingPreview(null);
      audio.onerror = () => {
        console.error('Failed to play preview');
        setPlayingPreview(null);
      };

      // Play preview
      await audio.play();
      setAudioPreview(audio);
      setPlayingPreview(sample.id);
    } catch (error) {
      console.error('Failed to play preview:', error);
      setPlayingPreview(null);
    }
  }, [audioPreview]);

  const stopPreview = useCallback(() => {
    if (audioPreview) {
      audioPreview.pause();
      audioPreview.src = '';
    }
    setPlayingPreview(null);
  }, [audioPreview]);

  const handleSampleSelect = (sample) => {
    if (onSampleSelect) {
      onSampleSelect({
        id: sample.id,
        name: sample.name,
        url: sample.downloadURL,
        metadata: sample.metadata,
        packId: selectedPack?.packId
      });
    }
  };

  // Filter packs based on search and category
  const filteredPacks = packs.filter(pack => {
    const matchesSearch = pack.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pack.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pack.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
                           pack.tags.includes(selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Filter samples based on search
  const filteredSamples = samples.filter(sample => 
    sample.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = Object.keys(SAMPLE_LIBRARY_CONFIG.categories);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-6xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Sample Library</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="border-white/20 text-white hover:bg-white/10"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
              {onClose && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Close
                </Button>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search samples and packs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/40"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {SAMPLE_LIBRARY_CONFIG.categories[category].name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Pack List */}
          {!selectedPack && (
            <div className="flex-1 p-6 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-white/60">Loading sample packs...</div>
                </div>
              ) : (
                <div className={`grid gap-4 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                    : 'grid-cols-1'
                }`}>
                  {filteredPacks.map(pack => (
                    <motion.div
                      key={pack.packId}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => loadPackSamples(pack.packId)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                          <Folder className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{pack.name}</h3>
                          <p className="text-sm text-white/60 line-clamp-2">{pack.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {pack.sampleCount} samples
                            </Badge>
                            {pack.tags.slice(0, 2).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sample List */}
          {selectedPack && (
            <div className="flex-1 flex flex-col">
              {/* Pack Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedPack(null);
                      setSamples([]);
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    ← Back to Packs
                  </Button>
                </div>
                <h3 className="text-xl font-bold text-white">{selectedPack.packId}</h3>
                <p className="text-white/60">{selectedPack.samples.length} samples</p>
              </div>

              {/* Samples Grid */}
              <div className="flex-1 p-6 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-white/60">Loading samples...</div>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${
                    viewMode === 'grid' 
                      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                      : 'grid-cols-1'
                  }`}>
                    {filteredSamples.map(sample => (
                      <motion.div
                        key={sample.id}
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Music className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-white text-sm truncate">
                              {sample.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-white/40">
                                {Math.round(sample.size / 1024)}KB
                              </span>
                              {sample.metadata?.bpm && (
                                <Badge variant="outline" className="text-xs">
                                  {sample.metadata.bpm} BPM
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (playingPreview === sample.id) {
                                  stopPreview();
                                } else {
                                  playPreview(sample);
                                }
                              }}
                              className="w-8 h-8 p-0 text-white/60 hover:text-white"
                            >
                              {playingPreview === sample.id ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSampleSelect(sample)}
                              className="w-8 h-8 p-0 text-cyan-400 hover:text-cyan-300"
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}