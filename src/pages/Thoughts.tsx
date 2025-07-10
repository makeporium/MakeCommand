import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Tag, Calendar, Edit, Trash2, Brain } from 'lucide-react';
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

export const Thoughts = () => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchThoughts();
  }, [user]);

  const fetchThoughts = async () => {
    const { data, error } = await supabase
      .from('thoughts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to fetch thoughts');
    else setThoughts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let imageUrls: string[] = [];

    if (images.length > 0) {
      for (const img of images) {
        const filePath = `${user.id}/${Date.now()}-${img.name}`;
        const { data, error } = await supabase.storage
          .from('thought-images')
          .upload(filePath, img, { upsert: true });

        if (error) {
          console.error('Upload Error:', error);
          toast.error(`Failed to upload: ${img.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
  .from('thought-images')
  .getPublicUrl(filePath);

if (urlData?.publicUrl) {
  imageUrls.push(urlData.publicUrl);
}

      }
    }

    const image_urls =
      editingThought && imageUrls.length === 0
        ? editingThought.image_urls || []
        : imageUrls;

    const thoughtData = {
      title,
      content,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      user_id: user.id,
      image_urls,
    };

    console.log('Uploaded Image URLs:', imageUrls);
    console.log('Final thoughtData:', thoughtData);

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

    if (error) toast.error('Failed to save thought');
    else {
      toast.success(editingThought ? 'Thought updated!' : 'Thought saved!');
      resetForm();
      fetchThoughts();
    }
  };

  const resetForm = () => {
    setTitle(''); setContent(''); setTags(''); setImages([]);
    setShowForm(false); setEditingThought(null);
  };

  const handleEdit = (t: Thought) => {
    setEditingThought(t);
    setTitle(t.title);
    setContent(t.content);
    setTags(t.tags.join(', '));
    setImages([]);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('thoughts').delete().eq('id', id);
    if (error) toast.error('Failed to delete thought');
    else { toast.success('Thought deleted'); fetchThoughts(); }
  };

  const filteredThoughts = thoughts.filter(t =>
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
    || t.content.toLowerCase().includes(searchTerm.toLowerCase())
    || t.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const parseContent = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank"
           rel="noopener noreferrer"
           className="text-cyan-400 underline break-words">
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
        <Button onClick={() => setShowForm(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <Plus size={20} className="mr-2" /> New Thought
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
          <Input placeholder="Search thoughts..."
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
                 className="pl-10 bg-gray-800/50 border-gray-700 text-white" />
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingThought ? 'Edit Thought' : 'New Thought'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Thought title..."
                   value={title}
                   onChange={e => setTitle(e.target.value)}
                   className="bg-gray-700/50 border-gray-600 text-white"/>
            <Textarea placeholder="Write your thoughts..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white min-h-32"/>
            <Input placeholder="Tags (comma separated)"
                   value={tags}
                   onChange={e => setTags(e.target.value)}
                   className="bg-gray-700/50 border-gray-600 text-white"/>

            <div>
              <input type="file" multiple accept="image/*"
                     onChange={e => e.target.files && setImages(Array.from(e.target.files))}
                     className="text-white"/>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {images.map((img, i) =>
                    <img key={i} src={URL.createObjectURL(img)}
                         alt={`preview-${i}`}
                         className="h-20 rounded object-cover border border-gray-600"/>
                  )}
                </div>
              )}
              {editingThought?.image_urls && images.length === 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editingThought.image_urls.map((url, i) =>
                    <img key={i} src={url}
                         alt={`existing-${i}`}
                         className="h-20 rounded object-cover border border-gray-600"/>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingThought ? 'Update' : 'Save'} Thought
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {filteredThoughts.map(t => (
          <div key={t.id} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold text-white">{t.title}</h3>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(t)} className="text-cyan-400 hover:text-cyan-300 p-1">
                  <Edit size={16}/>
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={16}/>
                </button>
              </div>
            </div>

            {t.image_urls && t.image_urls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {t.image_urls.map((url, i) =>
                  <img key={i} src={url} alt={`img-${i}`} className="h-32 rounded object-cover border border-gray-700"/>
                )}
              </div>
            )}

            <div className="text-gray-300 mb-4 whitespace-pre-wrap">
              {parseContent(t.content)}
            </div>

            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {t.tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-cyan-900/30 text-cyan-400 rounded-full text-sm">
                    <Tag size={12}/> {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-gray-400 text-sm">
                <Calendar size={14}/> {new Date(t.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredThoughts.length === 0 && (
        <div className="text-center py-12">
          <Brain size={64} className="mx-auto text-gray-600 mb-4"/>
          <p className="text-gray-400 text-lg">No thoughts found</p>
          <p className="text-gray-500">Start capturing your ideas and insights</p>
        </div>
      )}
    </div>
  );
};
