
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FolderOpen, Edit, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
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

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  project_id: string;
}

export const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectColor, setProjectColor] = useState('#00ff88');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const { user } = useAuth();

  const colors = [
    '#00ff88', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
    '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce'
  ];

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTasks();
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

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const projectData = {
      name: projectName,
      description: projectDescription || null,
      color: projectColor,
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
      resetProjectForm();
      fetchProjects();
    }
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProject) return;

    const taskData = {
      title: taskTitle,
      description: taskDescription || null,
      project_id: selectedProject.id,
      user_id: user.id,
    };

    const { error } = await supabase
      .from('tasks')
      .insert([taskData]);

    if (error) {
      toast.error('Failed to create task');
    } else {
      toast.success('Task created!');
      resetTaskForm();
      fetchTasks();
    }
  };

  const resetProjectForm = () => {
    setProjectName('');
    setProjectDescription('');
    setProjectColor('#00ff88');
    setShowProjectForm(false);
    setEditingProject(null);
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDescription('');
    setShowTaskForm(false);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDescription(project.description || '');
    setProjectColor(project.color);
    setShowProjectForm(true);
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete project');
    } else {
      toast.success('Project deleted');
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
      fetchProjects();
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: completedAt
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Failed to update task');
    } else {
      fetchTasks();
    }
  };

  const getProjectTasks = (projectId: string) => {
    return tasks.filter(task => task.project_id === projectId);
  };

  const getTaskStats = (projectId: string) => {
    const projectTasks = getProjectTasks(projectId);
    const completed = projectTasks.filter(task => task.status === 'completed').length;
    const total = projectTasks.length;
    return { completed, total };
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Project Command</h1>
          <p className="text-gray-400">Organize your mission segments</p>
        </div>
        <Button
          onClick={() => setShowProjectForm(true)}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
        >
          <Plus size={20} className="mr-2" />
          New Project
        </Button>
      </div>

      {showProjectForm && (
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">
            {editingProject ? 'Edit Project' : 'New Project'}
          </h2>
          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <Input
              placeholder="Project name..."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
            <Textarea
              placeholder="Project description..."
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
            <div>
              <label className="block text-gray-300 mb-2">Project Color</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setProjectColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      projectColor === color ? 'border-white scale-110' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                {editingProject ? 'Update' : 'Create'} Project
              </Button>
              <Button type="button" variant="outline" onClick={resetProjectForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="text-xl font-bold text-white mb-4">Projects</h2>
          <div className="space-y-3">
            {projects.map((project) => {
              const stats = getTaskStats(project.id);
              return (
                <div
                  key={project.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                    selectedProject?.id === project.id
                      ? 'border-cyan-500/50 bg-cyan-900/20'
                      : 'border-gray-700/50 bg-gray-800/40 hover:border-gray-600/50'
                  }`}
                  onClick={() => setSelectedProject(project)}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color }}
                    ></div>
                    <h3 className="font-semibold text-white flex-1">{project.name}</h3>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 p-1"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-gray-400 text-sm mb-2">{project.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    {stats.completed}/{stats.total} tasks completed
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">No projects yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedProject ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: selectedProject.color }}
                    ></div>
                    {selectedProject.name}
                  </h2>
                  {selectedProject.description && (
                    <p className="text-gray-400 mt-1">{selectedProject.description}</p>
                  )}
                </div>
                <Button
                  onClick={() => setShowTaskForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                >
                  <Plus size={16} className="mr-2" />
                  Add Task
                </Button>
              </div>

              {showTaskForm && (
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4">New Task</h3>
                  <form onSubmit={handleTaskSubmit} className="space-y-4">
                    <Input
                      placeholder="Task title..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white"
                      required
                    />
                    <Textarea
                      placeholder="Task description..."
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white"
                    />
                    <div className="flex gap-3">
                      <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                        Create Task
                      </Button>
                      <Button type="button" variant="outline" onClick={resetTaskForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-3">
                {getProjectTasks(selectedProject.id).map((task) => (
                  <div
                    key={task.id}
                    className={`bg-gray-800/40 border rounded-xl p-4 transition-all duration-300 ${
                      task.status === 'completed' ? 'border-green-500/30 bg-green-900/10' : 'border-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className="mt-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle2 size={18} className="text-green-400" />
                        ) : (
                          <Circle size={18} />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-gray-400 text-sm mt-1">{task.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {getProjectTasks(selectedProject.id).length === 0 && (
                  <div className="text-center py-8">
                    <Clock size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No tasks in this project</p>
                    <p className="text-gray-500 text-sm">Add your first task to get started</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FolderOpen size={64} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 text-lg">Select a project</p>
              <p className="text-gray-500">Choose a project to view and manage its tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
