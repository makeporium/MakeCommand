import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Tag,
  Calendar,
  Edit,
  Trash2,
  Brain,
  X,
  Maximize2,
  ExternalLink,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface Thought {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  image_urls?: string[];
}

const predefinedTags = ['MOTIVATION', 'RM - ROADMAP'];

export const Thoughts = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchThoughts();
  }, [user]);

  // Handle global paste event when the thought form is open
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!showForm) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const ext = file.type.split('/')[1] || 'png';
            const namedFile = new File([file], `pasted-${Date.now()}-${i}.${ext}`, {
              type: file.type,
            });
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        setImages(prev => [...prev, ...pastedFiles]);
        toast.success(
          `${pastedFiles.length} image${pastedFiles.length > 1 ? 's' : ''} pasted from clipboard!`
        );
      }
    };

    if (showForm) {
      window.addEventListener('paste', handleGlobalPaste);
    }
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [showForm]);

  // Handle Escape key and scroll lock for full view preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
        setIsZoomed(false);
      }
    };
    if (previewImage) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [previewImage]);

  const fetchThoughts = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('thoughts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) toast.error(`Failed to fetch thoughts: ${error.message}`);
    else setThoughts(data || []);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setImages(prev => [...prev, ...selectedFiles]);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (droppedFiles.length > 0) {
        setImages(prev => [...prev, ...droppedFiles]);
        toast.success(`${droppedFiles.length} image${droppedFiles.length > 1 ? 's' : ''} added!`);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newUploadedUrls: string[] = [];

    if (images.length > 0) {
      for (const img of images) {
        const filePath = `${user.id}/${Date.now()}-${img.name}`;
        const { error } = await supabase.storage
          .from('thought-images')
          .upload(filePath, img, { upsert: true });

        if (error) {
          toast.error(`Failed to upload: ${img.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from('thought-images')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          newUploadedUrls.push(urlData.publicUrl);
        }
      }
    }

    const finalImageUrls = [...existingImageUrls, ...newUploadedUrls];

    const thoughtData = {
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      user_id: user.id,
      image_urls: finalImageUrls,
    };

    let error;
    if (editingThought) {
      ({ error } = await supabase
        .from('thoughts')
        .update(thoughtData)
        .eq('id', editingThought.id));
    } else {
      ({ error } = await supabase
        .from('thoughts')
        .insert([thoughtData]));
    }

    if (error) {
      console.error('Failed to save thought:', error);
      toast.error(`Failed to save thought: ${error.message}`);
    } else {
      toast.success(editingThought ? 'Thought updated!' : 'Thought saved!');
      resetForm();
      fetchThoughts();
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTags('');
    setImages([]);
    setExistingImageUrls([]);
    setShowForm(false);
    setEditingThought(null);
  };

  const handleEdit = (t: Thought) => {
    setEditingThought(t);
    setTitle(t.title);
    setContent(t.content);
    setTags(t.tags.join(', '));
    setImages([]);
    setExistingImageUrls(t.image_urls || []);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('thoughts').delete().eq('id', id);
    if (error) toast.error('Failed to delete thought');
    else {
      toast.success('Thought deleted');
      fetchThoughts();
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const updated = new Set(prev);
      updated.has(id) ? updated.delete(id) : updated.add(id);
      return updated;
    });
  };

  const filteredThoughts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return thoughts.filter(t =>
      t.title.toLowerCase().includes(term) ||
      t.content.toLowerCase().includes(term) ||
      t.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }, [searchTerm, thoughts]);

  const parseContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline break-words">
          {part}
        </a>
      ) : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Neural Thoughts</h1>
          <p className="text-gray-400">Capture and organize your mind</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Plus size={20} className="mr-2" /> New Thought
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {predefinedTags.map(tag => (
          <Button
            key={tag}
            onClick={() => setSearchTerm(tag)}
            className="bg-cyan-900 hover:bg-cyan-800 text-cyan-200"
            size="sm"
          >
            {tag}
          </Button>
        ))}
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          placeholder="Search thoughts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800/50 border-gray-700 text-white"
        />
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingThought ? 'Edit Thought' : 'New Thought'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Thought title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <Textarea
              placeholder="Write your thoughts..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white min-h-32"
            />

            <div>
              <p className="text-sm text-gray-300 mb-1">Quick Tags:</p>
              <div className="flex gap-2 flex-wrap mb-2">
                {predefinedTags.map(tag => (
                  <Button
                    key={tag}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const currentTags = tags.split(',').map(t => t.trim());
                      if (!currentTags.includes(tag)) {
                        setTags([...currentTags, tag].filter(Boolean).join(', '));
                      }
                    }}
                    className="text-cyan-400 border-cyan-600 hover:bg-cyan-800"
                  >
                    {tag}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
            </div>

            {/* Image Upload and Paste Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <ImageIcon size={16} className="text-cyan-400" />
                <span>Images (Paste from clipboard or browse)</span>
              </label>

              {/* Paste / Drop / Browse Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="group relative border-2 border-dashed border-gray-700 hover:border-cyan-500/60 bg-gray-900/40 hover:bg-gray-800/50 rounded-xl p-5 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-full text-cyan-400 group-hover:scale-110 transition-transform">
                    <Upload size={20} />
                  </div>
                  <div className="text-sm text-gray-300">
                    <span className="font-semibold text-cyan-400">Click to browse</span>, drag & drop, or simply{' '}
                    <span className="px-1.5 py-0.5 bg-cyan-900/60 border border-cyan-500/40 rounded text-cyan-300 font-mono text-xs">
                      Ctrl+V
                    </span>{' '}
                    to paste images
                  </div>
                  <p className="text-xs text-gray-500">
                    Paste screenshots directly from clipboard (Snipping Tool, browser copy, etc.)
                  </p>
                </div>
              </div>

              {/* Image Previews */}
              {(images.length > 0 || existingImageUrls.length > 0) && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {/* Existing images from thought being edited */}
                  {existingImageUrls.map((url, i) => (
                    <div key={`existing-${i}`} className="group relative">
                      <img
                        src={url}
                        alt={`Existing ${i + 1}`}
                        onClick={() => setPreviewImage(url)}
                        className="h-20 w-20 rounded-lg object-cover border border-gray-600 cursor-pointer hover:opacity-90 hover:border-cyan-400 transition-all"
                        title="Click to view full image"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExistingImageUrls(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform hover:scale-110"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* New images (selected or pasted) */}
                  {images.map((img, i) => {
                    const objectUrl = URL.createObjectURL(img);
                    return (
                      <div key={`new-${i}`} className="group relative">
                        <img
                          src={objectUrl}
                          alt={`New preview ${i + 1}`}
                          onClick={() => setPreviewImage(objectUrl)}
                          className="h-20 w-20 rounded-lg object-cover border border-cyan-500/50 cursor-pointer hover:opacity-90 hover:border-cyan-400 transition-all"
                          title="Click to view full image"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages(prev => prev.filter((_, idx) => idx !== i));
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-transform hover:scale-110"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingThought ? 'Update' : 'Save'} Thought
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {filteredThoughts.map(t => (
          <div
            key={t.id}
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold text-white">{t.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(t)} className="text-cyan-400 hover:text-cyan-300 p-1">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {t.image_urls && t.image_urls.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {t.image_urls.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setPreviewImage(url)}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-gray-700 hover:border-cyan-400/70 transition-all duration-200"
                    title="Click to view full image"
                  >
                    <img
                      src={url}
                      alt={`attachment-${i}`}
                      className="h-32 w-auto max-w-xs rounded-lg object-cover group-hover:scale-105 group-hover:brightness-105 transition-all duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="p-2 bg-black/60 rounded-full border border-cyan-400/50 text-cyan-300">
                        <Maximize2 size={18} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-gray-300 whitespace-pre-wrap mb-2">
              {expandedIds.has(t.id)
                ? parseContent(t.content)
                : parseContent(t.content.length > 200 ? t.content.slice(0, 200) + '...' : t.content)}
            </div>

            {t.content.length > 200 && (
              <button
                onClick={() => toggleExpanded(t.id)}
                className="text-cyan-400 hover:underline text-sm mb-4"
              >
                {expandedIds.has(t.id) ? 'Show less' : 'Read more'}
              </button>
            )}

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {t.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded-full text-sm">
                    <Tag size={12} /> {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <Calendar size={14} /> {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredThoughts.length === 0 && (
        <div className="text-center py-12">
          <Brain size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No thoughts found</p>
          <p className="text-gray-500">Start capturing your ideas and insights</p>
        </div>
      )}

      {/* Full View Lightbox Modal rendered via Portal directly to body */}
      {previewImage && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/92 backdrop-blur-xl p-4 sm:p-8 animate-in fade-in duration-200 select-none overflow-hidden"
          onClick={() => {
            setPreviewImage(null);
            setIsZoomed(false);
          }}
        >
          {/* Top Floating Glass Header Toolbar */}
          <div
            className="fixed top-0 inset-x-0 p-4 sm:p-5 flex items-center justify-between z-20 bg-gradient-to-b from-black/95 via-black/60 to-transparent"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-cyan-400 bg-gray-900/90 px-3 py-1.5 rounded-lg border border-cyan-500/30 shadow-lg">
                Image Full View
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/90 hover:bg-gray-800 text-cyan-300 hover:text-cyan-200 rounded-lg text-sm border border-cyan-500/30 transition-all shadow-lg"
                title={isZoomed ? 'Fit to screen' : 'Zoom in'}
              >
                {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                <span className="hidden sm:inline">{isZoomed ? 'Fit to Screen' : 'Zoom In'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/90 hover:bg-gray-800 text-cyan-300 hover:text-cyan-200 rounded-lg text-sm border border-cyan-500/30 transition-all shadow-lg"
                title="Open original high-res in new tab"
              >
                <ExternalLink size={15} />
                <span className="hidden sm:inline">Original</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setPreviewImage(null);
                  setIsZoomed(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-sm transition-all shadow-lg border border-red-500/40"
                title="Close preview (Esc)"
              >
                <X size={18} />
                <span className="font-medium">Close</span>
              </button>
            </div>
          </div>

          {/* Centered Scrollable/Zoomable Image Area */}
          <div
            className={`relative flex items-center justify-center transition-all duration-300 ${
              isZoomed ? 'overflow-auto max-h-[88vh] max-w-[95vw]' : 'max-h-[85vh] max-w-[90vw]'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={previewImage}
              alt="Full view attachment"
              onClick={() => setIsZoomed(prev => !prev)}
              className={`rounded-xl object-contain border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] transition-all duration-300 ${
                isZoomed
                  ? 'max-h-none max-w-none scale-125 sm:scale-150 cursor-zoom-out'
                  : 'max-h-[80vh] max-w-[88vw] cursor-zoom-in hover:brightness-105'
              }`}
              title={isZoomed ? 'Click to fit screen' : 'Click to zoom in'}
            />
          </div>

          {/* Bottom Hint */}
          <div className="fixed bottom-4 inset-x-0 flex justify-center pointer-events-none z-20">
            <div className="bg-black/75 backdrop-blur-md px-4 py-1.5 rounded-full border border-gray-700/60 text-xs text-gray-300 shadow-xl">
              Click image to {isZoomed ? 'fit screen' : 'zoom'} • Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-600 text-cyan-300 font-mono text-[11px]">Esc</kbd> or click outside to close
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
