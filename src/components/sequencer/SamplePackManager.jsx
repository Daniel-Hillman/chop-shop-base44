import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  Trash2, 
  Edit, 
  Download, 
  Folder,
  Music,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useSampleLibrary } from '../../hooks/sequencer/useSampleLibrary.js';

export default function SamplePackManager({ isOpen, onClose }) {
  const {
    userPacks,
    storageStats,
    loading,
    error,
    uploadSamplePack,
    deleteSamplePack,
    canCreatePacks,
    maxPackSize
  } = useSampleLibrary();

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [packMetadata, setPackMetadata] = useState({
    name: '',
    description: '',
    category: 'drums',
    tags: ''
  });
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length !== files.length) {
      alert('Only audio files are allowed');
    }
    
    setUploadFiles(audioFiles);
  };

  const handleUploadPack = async () => {
    if (!packMetadata.name.trim() || uploadFiles.length === 0) {
      alert('Please provide pack name and select audio files');
      return;
    }

    setUploading(true);
    try {
      const packId = packMetadata.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const metadata = {
        ...packMetadata,
        tags: packMetadata.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        public: false
      };

      await uploadSamplePack(packId, uploadFiles, metadata);
      
      // Reset form
      setPackMetadata({ name: '', description: '', category: 'drums', tags: '' });
      setUploadFiles([]);
      setShowUploadDialog(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePack = async (packId) => {
    if (!confirm(`Are you sure you want to delete the pack "${packId}"?`)) {
      return;
    }

    try {
      await deleteSamplePack(packId, false);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

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
        className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">My Sample Packs</h2>
            <div className="flex items-center gap-2">
              {canCreatePacks && (
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Pack
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="border-white/20 text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Storage Stats */}
          {storageStats && (
            <div className="mt-4 p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Storage Used</span>
                <span className="text-white">{storageStats.formattedSize}</span>
              </div>
              <div className="mt-2 w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(storageStats.usagePercentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-white/40 mt-1">
                <span>{storageStats.fileCount} files</span>
                <span>{storageStats.usagePercentage.toFixed(1)}% used</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-200 text-sm">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-white/60">Loading sample packs...</div>
            </div>
          ) : userPacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Folder className="w-16 h-16 text-white/20 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Sample Packs</h3>
              <p className="text-white/60 mb-6">Create your first sample pack to get started</p>
              {canCreatePacks && (
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  className="bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sample Pack
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userPacks.map(pack => (
                <motion.div
                  key={pack.packId}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Folder className="w-5 h-5 text-purple-400" />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePack(pack.packId)}
                      className="w-6 h-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <h3 className="font-semibold text-white mb-1">{pack.name}</h3>
                  <p className="text-sm text-white/60 mb-3 line-clamp-2">{pack.description}</p>
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {pack.sampleCount} samples
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Private
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-white/60 hover:text-white"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-white/60 hover:text-white"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Dialog */}
        <AnimatePresence>
          {showUploadDialog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setShowUploadDialog(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-bold text-white mb-4">Create Sample Pack</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Pack Name
                    </label>
                    <Input
                      value={packMetadata.name}
                      onChange={(e) => setPackMetadata(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter pack name"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Description
                    </label>
                    <Input
                      value={packMetadata.description}
                      onChange={(e) => setPackMetadata(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your sample pack"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Category
                    </label>
                    <select
                      value={packMetadata.category}
                      onChange={(e) => setPackMetadata(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                      <option value="drums">Drums</option>
                      <option value="bass">Bass</option>
                      <option value="synth">Synths</option>
                      <option value="vocal">Vocals</option>
                      <option value="fx">Effects</option>
                      <option value="melodic">Melodic</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Tags (comma separated)
                    </label>
                    <Input
                      value={packMetadata.tags}
                      onChange={(e) => setPackMetadata(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="trap, hip-hop, drums"
                      className="bg-white/10 border-white/20 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Audio Files
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="audio/*"
                      onChange={handleFileSelect}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-cyan-500 file:text-black"
                    />
                    {uploadFiles.length > 0 && (
                      <div className="mt-2 text-sm text-white/60">
                        {uploadFiles.length} files selected
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-6">
                  <Button
                    onClick={handleUploadPack}
                    disabled={uploading || !packMetadata.name.trim() || uploadFiles.length === 0}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black"
                  >
                    {uploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Create Pack
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={uploading}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}