
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lightbulb, Tag, Calendar, Edit, Trash2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export const Ideas = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchIdeas();
    }
  }, [user]);

  const fetchIdeas = async () => {
    const { data, error } = await supabase
      .from('project_ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch ideas');
    } else {
      setIdeas(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const ideaData = {
      title,
      description,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      priority,
      user_id: user.id,
    };

    let error;
    if (editingIdea) {
      ({ error } = await supabase
        .from('project_ideas')
        .update(ideaData)
        .eq('id', editingIdea.id));
    } else {
      ({ error } = await supabase
        .from('project_ideas')
        .insert([ideaData]));
    }

    if (error) {
      toast.error('Failed to save idea');
    } else {
      toast.success(editingIdea ? 'Idea updated!' : 'Idea captured!');
      resetForm();
      fetchIdeas();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTags('');
    setPriority('medium');
    setShowForm(false);
    setEditingIdea(null);
  };

  const handleEdit = (idea: Idea) => {
    setEditingIdea(idea);
    setTitle(idea.title);
    setDescription(idea.description);
    setTags(idea.tags.join(', '));
    setPriority(idea.priority);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('project_ideas')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete idea');
    } else {
      toast.success('Idea deleted');
      fetchIdeas();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-900/30';
      case 'high': return 'text-orange-400 bg-orange-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'low': return 'text-green-400 bg-green-900/30';
      default: return 'text-gray-400 bg-gray-700/30';
    }
  };

  const filteredIdeas = ideas.filter(idea =>
    idea.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    idea.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Innovation Lab</h1>
          <p className="text-gray-400">Capture and develop breakthrough concepts</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Idea
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search ideas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white"
          />
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingIdea ? 'Edit Idea' : 'New Idea'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Idea title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              
            />
            <Textarea
              placeholder="Describe your innovative idea..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white min-h-32"
              
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="bg-gray-700/50 border-gray-600 text-white"
              />
              <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingIdea ? 'Update' : 'Capture'} Idea
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-yellow-500/30 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Lightbulb size={20} className="text-yellow-400" />
                {idea.title}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(idea)}
                  className="text-cyan-400 hover:text-cyan-300 p-1"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(idea.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-gray-300 mb-4 whitespace-pre-wrap">{idea.description}</p>
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-2">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded-full text-sm"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs capitalize ${getPriorityColor(idea.priority)}`}>
                  {idea.priority}
                </span>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Calendar size={14} />
                  {new Date(idea.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIdeas.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No ideas found</p>
          <p className="text-gray-500">Start capturing your innovative concepts</p>
        </div>
      )}
    </div>
  );
};
