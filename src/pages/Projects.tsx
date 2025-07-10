
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen, Edit, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#00ff88');
  const { user } = useAuth();

  const colorOptions = [
    '#00ff88', '#ff0066', '#0088ff', '#ffaa00',
    '#8800ff', '#ff8800', '#00ffaa', '#ff4400',
    '#4400ff', '#88ff00', '#ff0088', '#0066ff'
  ];

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch projects');
    } else {
      setProjects(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const projectData = {
      name,
      description: description || null,
      color,
      user_id: user.id,
    };

    let error;
    if (editingProject) {
      ({ error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id));
    } else {
      ({ error } = await supabase
        .from('projects')
        .insert([projectData]));
    }

    if (error) {
      toast.error('Failed to save project');
    } else {
      toast.success(editingProject ? 'Project updated!' : 'Project created!');
      resetForm();
      fetchProjects();
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#00ff88');
    setShowForm(false);
    setEditingProject(null);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setColor(project.color);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
      fetchProjects();
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Project Central</h1>
          <p className="text-gray-400">Organize and manage your initiatives</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Project
        </Button>
      </div>

      {showForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingProject ? 'Edit Project' : 'New Project'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Project name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              
            />
            <Textarea
              placeholder="Project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <div>
              <label className="block text-white text-sm font-medium mb-2">Project Color</label>
              <div className="flex gap-2 mb-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === colorOption ? 'border-white scale-110' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: colorOption }}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10 bg-gray-700/50 border-gray-600"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingProject ? 'Update' : 'Create'} Project
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300 group"
            style={{ borderTopColor: project.color }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {project.name}
                </h3>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(project)}
                  className="text-cyan-400 hover:text-cyan-300 p-1"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            {project.description && (
              <p className="text-gray-300 mb-4">{project.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <FolderOpen size={14} />
                <span>Active</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{new Date(project.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen size={64} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400 text-lg">No projects found</p>
          <p className="text-gray-500">Create your first project to get started</p>
        </div>
      )}
    </div>
  );
};
